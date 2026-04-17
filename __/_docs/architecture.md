# Architecture

Высокоуровневое описание архитектуры мета-фреймворка.
Обновляется при добавлении новых модулей или изменении архитектурных решений.
Детали *почему* принято то или иное решение — в `_docs/decisions.md`.

---

## Общая схема системы

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Next)                    │
│                                                      │
│  features/       hooks/               Zustand        │
│  (components) → (TanStack Query) → (client state)   │
│                        │                             │
│              packages/api-client                     │
│              (openapi-fetch, типы из контрактов)     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼──────────────────────────────┐
│                NestJS on Fastify                     │
│                                                      │
│  Controller → Service → Repository                   │
│       │                                              │
│  KeycloakGuard    FilterQueryPipe                    │
│  @Roles()         ZodValidationPipe                  │
└──────┬───────────────────────┬──────────────────────┘
       │                       │
┌──────▼──────┐    ┌───────────▼──────────────────────┐
│  Keycloak   │    │           PostgreSQL              │
│  (OIDC)     │    │     (soft delete everywhere)      │
└─────────────┘    └──────────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │    Redis (опционально)       │
              │  Pub/Sub · Cache · BullMQ   │
              └─────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │   File Storage (один из)    │
              │   local · S3 · MinIO        │
              └─────────────────────────────┘
```

---

## Монорепо структура

```
meta-framework/
├── apps/
│   ├── web/        Next.js application
│   └── api/        NestJS on Fastify — один монолит (модульный)
├── packages/
│   ├── contracts/  OpenAPI YAML — source of truth
│   ├── api-client/ openapi-fetch + сгенерированные типы
│   ├── ui-kit/     shared React компоненты
│   ├── config/     shared runtime config
│   └── shared-config/ shared tsconfig, eslint, jest
├── .claude/        агенты и rules для Claude Code
├── _templates/     шаблоны модулей для module-builder
├── _docs/          decisions.md, architecture.md, workflow.md, coding-rules.md
├── _architecture/  DCA и generation документы
└── _plans/         планы от planner агента
```

---

## Поток HTTP запроса (стандартный CRUD)

```
Фронт
  useUsers({ page: 1, filter: { status: { eq: 'active' } } })
    ↓
  TanStack Query → apiClient.GET('/users', { params: { query } })
    ↓ HTTP GET /users?page=1&filter[status][eq]=active
NestJS
  KeycloakGuard    — проверяет JWT токен
  FilterQueryPipe  — парсит filter[], проверяет FILTERABLE_FIELDS
  UsersController  — валидирует UserQueryDto через Zod DTO
  UsersService     — бизнес-логика
  UsersRepository  — WHERE deletedAt IS NULL AND status = 'active'
    ↓
  PaginatedResponseDto<User>
    ↓ JSON
Фронт
  { data: User[], meta: { total, page, limit, totalPages } }
```

---

## Поток SSE уведомлений

```
Фронт
  EventSource('/notifications/stream')  ← держит соединение
    ↓
NestJS @Sse()
  KeycloakGuard — определяет userId из токена
  Подписывается на события для этого userId

При создании уведомления (любой сервис):
  NotificationService.send(userId, notification)
    ↓
  [memory mode]  → напрямую в SSE Observable
  [redis mode]   → Redis Pub/Sub → все инстансы → нужный SSE

Фронт получает:
  event: notification.new
  id: <notificationId>      ← lastEventId для reconnect
  data: { ...Notification }
```

---

## Поток загрузки файла

```
Фронт (перед загрузкой)
  GET /files/constraints → { maxSizeBytes, allowedMimeTypes, ... }
  Валидирует файл на клиенте

Прямая загрузка (local / небольшие файлы):
  POST /files/upload (multipart) → FileRecord

Presigned URL (s3/minio / крупные файлы):
  POST /files/upload/init   → { fileId, uploadUrl, expiresAt }
  PUT  uploadUrl            → (напрямую в S3, бэкенд не участвует)
  POST /files/upload/confirm { fileId } → FileRecord

Удаление:
  DELETE /files/:id → soft delete (deletedAt = now)
  Cron job          → физическое удаление из хранилища
```

---

## Auth flow (Keycloak OIDC)

```
Фронт
  keycloak-js инициализация при старте приложения
  Редирект на Keycloak login page если не авторизован
  Получает access_token + refresh_token
  Хранит в memory (не localStorage)

Каждый API запрос:
  Authorization: Bearer <access_token>
    ↓
NestJS KeycloakGuard
  Верифицирует JWT подпись через Keycloak public key
  Извлекает claims: sub (userId), email, realm_access.roles
  Инжектирует в Request как @CurrentUser()

@Roles('admin') декоратор:
  Проверяет realm_access.roles из токена
  Бросает 403 FORBIDDEN если роль отсутствует
```

---

## Контракты → Типы → Код

```
packages/contracts/*.yaml   ← пишем вручную ДО кода
    ↓ pnpm generate:api
packages/api-client/src/generated/
    ↓ импорт
apps/web/features/*/hooks/
apps/api/src/modules/*/dto/
```

Правило: **никогда не хардкодить типы** которые есть в контрактах.
Изменение контракта → `pnpm generate:api` → типы обновляются везде автоматически.

---

## Модульность бэкенда

Каждый модуль изолирован и самодостаточен:

```
modules/users/
  users.module.ts      — регистрация зависимостей
  users.controller.ts  — роутинг, валидация DTO
  users.service.ts     — бизнес-логика
  users.repository.ts  — работа с БД
  dto/                 — входящие/исходящие данные

Межмодульное взаимодействие:
  baseline: через публичные методы Service
  NEVER прямой доступ к Repository другого модуля
  NEVER прямой доступ к внутренним файлам другого модуля
```

---

## Добавление нового модуля

```
1. Написать контракт в packages/contracts/
2. pnpm generate:api
3. Вызвать planner агента: создать план
4. Вызвать module-builder агента: реализовать по шаблону
5. Вызвать tester агента: покрыть тестами
6. Вызвать code-reviewer агента: ревью перед коммитом
7. Обновить decisions.md если было архитектурное решение
8. Обновить этот файл если изменилась схема системы
```
