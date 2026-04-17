# Generation Architecture

> Каноническая схема происхождения артефактов в мета-фреймворке.

Этот документ отвечает на вопрос:

- что является источником истины
- какие существуют контуры генерации
- что от чего должно генериться
- где ручной код допустим, а где нет

---

## Главный принцип

В системе нет одного универсального источника истины на всё.

Вместо этого есть несколько контуров, каждый отвечает на свой класс задач:

- `Prisma` отвечает за хранение
- `OpenAPI` отвечает за публичный транспортный контракт
- `Zod` отвечает за runtime-валидацию и schema execution format

Их нельзя смешивать в один абстрактный “master source of truth”, потому что они отвечают на разные вопросы.

---

## Три типа истины

### 1. Persistence Truth

Файл-источник:
- `prisma/schema.prisma`

Отвечает на вопрос:
- что хранится в базе
- какие есть поля
- какие есть связи
- какие ограничения есть на уровне хранения

Примеры:
- `User`
- `Order`
- `Permission`
- `Setting` как DB-модель

Prisma НЕ должна быть источником истины для:
- `/health`
- `/auth/session`
- `/notifications/stream`
- `/files/upload/init`
- агрегированных и orchestration endpoints

То есть Prisma описывает **storage model**, а не публичный API.

### 2. Transport Truth

Файлы-источники:
- `packages/contracts/openapi.yaml`
- `packages/contracts/**/*.yaml`

Отвечает на вопрос:
- что приложение принимает и отдаёт по HTTP/SSE
- какой у endpoint request/response shape
- какой публичный контракт видит frontend и внешние клиенты

Примеры:
- `/health`
- `/users`
- `/files/upload/init`
- `/auth/session`

OpenAPI описывает **transport contract**, а не хранение в БД.

### 3. Runtime Validation Truth

Формат:
- `Zod`

Отвечает на вопрос:
- как схема проверяется во время выполнения
- как удобно валидировать входящие данные, локальные формы и runtime payloads

Важно:
- `Zod` не обязан быть верхним source of truth для всей системы
- чаще всего `Zod` — производный или прикладной слой

То есть Zod — это **runtime schema format**, а не обязательно первичный источник всех контрактов.

---

## Контуры генерации

## Контур A — Persistence

Источник:
- `prisma/schema.prisma`

Из него генерится:
- Prisma Client
- internal DB typing
- при необходимости internal-only helper artifacts

Возможные производные артефакты:
- internal Zod schemas
- i18n keys для entity fields
- field metadata
- CRUD form hints
- internal filter/sort metadata

Кто использует:
- backend repository layer
- internal tooling
- admin/meta generation

Кто НЕ должен использовать напрямую:
- frontend как источник публичных типов
- transport client layer

---

## Контур B — Public API

Источник:
- `packages/contracts/openapi.yaml`
- split schemas в `packages/contracts/**/*.yaml`

Из него генерится:
- frontend API typings
- `openapi-fetch` client typing
- backend transport typings
- request/response schema artifacts

Кто использует:
- `packages/api-client`
- frontend composables/hooks
- backend transport layer

Это основной источник истины для:
- HTTP endpoints
- SSE payload contracts
- публичных request/response объектов

---

## Контур C — Runtime Schemas

Источник:
- обычно производный:
  - либо от OpenAPI
  - либо от Prisma
  - либо вручную для локальной внутренней логики

Из него появляются:
- Zod validators
- backend runtime validation schemas
- frontend form schemas
- local parser/decoder schemas

Правило:
- public transport validation лучше производить от OpenAPI-derived схем
- persistence/internal validation можно производить от Prisma-derived схем
- чисто локальная UI/domain логика может иметь hand-written Zod schemas

---

## Что от чего должно генериться

### Из Prisma должно генериться

- Prisma Client
- internal entity typing
- optional internal Zod schemas
- optional metadata для таблиц, форм и i18n

### Из OpenAPI должно генериться

- `packages/api-client/src/generated.*`
- типы для `openapi-fetch`
- backend transport typings
- request/response runtime contracts

### Из Zod не нужно пытаться генерить всё подряд

`Zod` не должен автоматически считаться глобальным первичным источником истины.

Его роль:
- runtime validation
- execution format
- локальные domain/form schemas

---

## Типы модулей и их pipeline

## 1. DB-backed module

Примеры:
- `users`
- `orders`
- `settings`

Pipeline:
1. Prisma описывает storage model
2. OpenAPI описывает public contract
3. codegen из OpenAPI даёт client/types
4. backend маппит DB model -> API contract
5. frontend работает только с API contract

Здесь важно:
- Prisma и OpenAPI связаны смыслом, но не заменяют друг друга
- DB shape и transport shape могут отличаться

## 2. Non-DB module

Примеры:
- `health`
- `auth/session`
- `notifications`
- `file upload init`

Pipeline:
1. OpenAPI сразу является source of truth
2. codegen даёт client/types
3. backend реализует transport вручную
4. Prisma не участвует

Это не special case, а нормальный тип модуля.

## 3. Internal-only helper

Примеры:
- form flow schema
- local parser
- state machine config
- UI-only validation

Pipeline:
- можно использовать hand-written Zod
- без Prisma
- без OpenAPI

Но только пока этот артефакт не становится публичным transport contract.

---

## Правило выбора источника истины

Нужно задавать вопрос:

### “Это про хранение или про транспорт?”

Если про хранение:
- `Prisma`

Если про HTTP/SSE/public API:
- `OpenAPI`

Если про runtime execution/validation:
- `Zod`

---

## Как делать генерации в репозитории

### `prisma generate`

Назначение:
- генерировать persistence artifacts

Типичные результаты:
- Prisma Client
- optional internal metadata

### `pnpm generate:api`

Назначение:
- генерировать transport artifacts из OpenAPI

Типичные результаты:
- `packages/api-client/src/generated.*`
- backend transport-derived types

### `pnpm generate:meta`

Опционально:
- i18n keys
- field maps
- form metadata
- admin descriptors

Этот слой не должен подменять ни Prisma, ни OpenAPI как источник истины.

---

## Что не нужно делать

Неправильно:
- пытаться сделать Prisma источником истины для `/health`
- делать frontend public types напрямую из DB-модели
- вручную дублировать public transport shape в backend и frontend
- объявлять Zod глобальным source of truth для вообще всех слоёв

---

## Канонический пример: `/health`

`/health` не является DB-сущностью.

Значит:
- Prisma тут не нужен
- source of truth = OpenAPI
- из OpenAPI генерятся client/types
- backend реализует endpoint вручную
- frontend использует generated client

Это правильная реализация framework-пайплайна, а не исключение из него.

---

## Короткая формула

- `Prisma` = storage truth
- `OpenAPI` = transport truth
- `Zod` = runtime validation format

Именно в таком разделении генерации остаются максимальными, но система не становится путаной.
