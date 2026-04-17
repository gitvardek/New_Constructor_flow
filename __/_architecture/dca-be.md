# DCA — Generic BE Structure

> Реализация философии DCA на бэкенде. Читать после `dca.md`.

---

## Подход

NestJS + Fastify + Prisma. Декларативность через декораторы — это уже конфиг на уровне TypeScript. Под капотом декораторы это метаданные через `Reflect` — не магия, а явный контракт на классе.

**Contract-first:** OpenAPI схема — единый источник правды для бэка и фронта. Публичный контракт пишется явно в `packages/contracts/*.yaml` и уже потом используется обеими сторонами.

**ORM:** Prisma. `prisma/schema.prisma` — источник правды для БД, но не для публичного API контракта.

**Валидация:** Zod везде — и на бэке (через `nestjs-zod`), и на фронте. Один инструмент, один язык, схемы в `packages/contracts` shared между обеими сторонами.

---

## Структура модуля

```
modules/
  order/
    controller/        ← транспорт, только HTTP + декораторы
    service/           ← бизнес-логика, Pure насколько возможно
    repository/        ← тонкий адаптер над Prisma, Effectful
    dto/               ← Zod схемы входящих/исходящих данных
    ports/             ← интерфейсы для внешних зависимостей
    types/             ← внутренние типы модуля
    order.module.ts    ← NestJS DI конфиг
```

`entity/` папки нет — схема БД живёт в корневом `prisma/schema.prisma`. Это единый источник правды для всех модулей.

---

## Слои модуля и DCA типы

```
Controller  ← Adapter. Транспортный слой, переводит HTTP → домен
Service     ← Pure. Бизнес-логика без сайд-эффектов
Repository  ← Effectful. Работает с Prisma (внешний мир)
DTO         ← Pure. Zod контракты входящих и исходящих данных
Ports       ← интерфейсы для Effectful зависимостей (email, очереди, внешние API)
```

**Поток ответственности:**
```
Pure (Service) вычисляет → Effectful (Repository) синхронизирует с БД
```

Граница нарушена если:
- Сервис импортирует `Request` или `Response`
- Контроллер вызывает Prisma напрямую
- Репозиторий содержит бизнес-условия

```typescript
// контроллер — только перевод HTTP → домен
@Get(':id')
@ZodSerializerDto(OrderResponseDto)     // защищает от утечки полей
findOne(@Param('id') id: string) {
  return this.service.findOne(id)
}

// сервис — только бизнес-логика, маппинг Prisma → DTO здесь
async findOne(id: string) {
  const order = await this.repository.findOne(id)
  return OrderResponseDto.fromPrisma(order)
}

// репозиторий — только Prisma, принимает готовый where
findOne(id: string) {
  return this.prisma.order.findUnique({ where: { id } })
}
```

---

## Ports — зачем нужны

Port — контракт на внешнюю зависимость. Сервис знает только интерфейс, не реализацию. Реализация подключается через DI.

```typescript
// ports/email.port.ts — только контракт
export interface EmailPort {
  send(to: string, subject: string, body: string): Promise<void>
}

// сервис знает только про порт — не про nodemailer или SendGrid
class OrderService {
  constructor(private email: EmailPort) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.repository.create(dto)
    await this.email.send(order.userId, 'Заказ создан', '...')
    return order
  }
}
```

**Что живёт в `ports/`:** email, SMS, push, внешние API (Stripe, S3), очереди (Redis, RabbitMQ).
**Что НЕ живёт в `ports/`:** repository (своя папка), другие NestJS модули.

---

## Границы между модулями

Три способа общения модулей, выбор зависит от типа связи:

```
Модуль читает данные другого    → порт (UserPort в OrderService)
Модуль реагирует на событие     → EventBus
Модуль оркестрирует несколько  → прямой импорт допустим на верхнем уровне
```

**EventBus за портом** — реализация меняется без изменения кода модулей:

```typescript
// contracts/src/events/event-bus.port.ts
export interface EventBusPort {
  emit(event: string, payload: unknown): Promise<void>
  on(event: string, handler: Function): void
}

// реализация 1 — EventEmitter2 (монолит/дев)
class LocalEventBus implements EventBusPort { ... }

// реализация 2 — Redis pub/sub (прод)
class RedisEventBus implements EventBusPort { ... }
```

Переключение через конфиг — код модулей не меняется.

---

## Фильтрация и пагинация

Аналог Spring Pageable — единый контракт между беком и фронтом. Парсится как middleware через NestJS Pipe, не засоряет контроллер:

```typescript
@Get()
findAll(@Pageable() pageable: PageableDto) {
  return this.service.findAll(pageable)
}
```

Схема живёт в `packages/contracts` — shared между бэком и фронтом:

```typescript
// packages/contracts/src/pageable/pageable.schema.ts
export const PageableSchema = z.object({
  page:  z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort:  z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export const PageSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page:  z.number(),
    limit: z.number(),
    pages: z.number(),
  })
```

Тип параметра в OpenAPI определяет компонент фильтра на фронте автоматически:

```
string → TextInput
enum   → Select
date   → DatePicker
number → NumberRange
```

---

## Auth — Keycloak + своя БД

**Разделение ответственности:**

```
Keycloak  ← кто ты (аутентификация, пароли, SSO, грубые роли)
Своя БД   ← что тебе можно (детальные права на ресурсы)
```

**Поток запроса:**

```
HTTP запрос
    ↓
KeycloakGuard       ← валидирует JWT с Keycloak, достаёт SessionUser
    ↓
Permission checks   ← baseline через Keycloak roles, детальные permission guard могут добавляться поверх
    ↓
Контроллер          ← @CurrentUser() user: SessionUser
    ↓
Сервис              ← не знает про Keycloak вообще
```

**Структура auth модуля:**

```
modules/
  auth/
    guards/
      keycloak.guard.ts       ← baseline guard, валидирует JWT и достаёт SessionUser
      permission.guard.ts     ← optional слой для детальных прав из БД
    decorators/
      current-user.ts         ← @CurrentUser()
      require-permission.ts   ← @RequirePermission('order:edit:own')
    ports/
      keycloak.port.ts        ← интерфейс валидации токена
    adapters/
      keycloak.adapter.ts     ← реализация через Keycloak OIDC
    auth.module.ts
```

**Своя таблица User нужна — но минимальная:**

```prisma
model User {
  id          String       @id   // keycloak sub — не своя генерация
  email       String       @unique
  createdAt   DateTime     @default(now())

  orders      Order[]
  permissions Permission[]
}

model Permission {
  id       String  @id
  userId   String
  resource String  // 'order'
  action   String  // 'edit'
  scope    String? // 'own' | 'any'

  user     User    @relation(fields: [userId], references: [id])
}
```

Синхронизация: lazy sync — первый запрос от нового пользователя создаёт запись автоматически.

---

## ResponseDto — граница публичного контракта

Prisma модель отражает БД полностью — включая технические поля (`deletedAt`, `internalNote`, `createdById`). Фронт не должен их видеть.

Фильтрация происходит на бэке через `ResponseDto` — явный публичный контракт:

```typescript
// dto/order-response.dto.ts
export const OrderResponseSchema = z.object({
  id:     z.string(),
  status: z.enum(['pending', 'paid', 'cancelled']),
  total:  z.number(),
  // deletedAt — не включаем, внутреннее
  // internalNote — не включаем, внутреннее
})

export class OrderResponseDto extends createZodDto(OrderResponseSchema) {}
```

`@ZodSerializerDto` в контроллере гарантирует что лишние поля не утекут даже если сервис случайно вернёт больше:

```typescript
@Get(':id')
@ZodSerializerDto(OrderResponseDto)  // защита на уровне транспорта
findOne(@Param('id') id: string) {
  return this.service.findOne(id)
}
```

**Правило:** Prisma схема не знает про UI. ResponseDto не знает про БД. Каждый знает своё место.

```
packages/contracts/*.yaml ← публичный контракт (source of truth)
    ↓ generate
Zod/OpenAPI generated DTO ← runtime типы и схемы
    ↓ сервис маппит
ResponseDto               ← только публичные поля транспорта
    ↓ openapi-fetch
фронт                     ← чистые типы без внутренностей БД
```

---



**Полная цепочка от БД до фронта:**

```
packages/contracts/*.yaml         ← источник правды для API
    ↓ codegen
packages/api-client/generated     ← фронтовые типы
packages/contracts-generated      ← бэковые zod/openapi схемы
    ↓                             ↓
БЭК                               ФЕ
nestjs-zod DTO                    zod валидация форм
ZodValidationPipe                 tanstack query params
    ↓
repository/              ← тонкий, принимает Prisma.WhereInput
    ↓
service/                 ← маппинг Prisma → Zod DTO
    ↓
controller/              ← роутинг + @ZodSerializerDto
    ↓ @nestjs/swagger
OpenAPI YAML + x- extensions      ← финальный контракт для фронта
```

---

## i18n — архитектура переводов

**Принцип:** `x-` extensions хранят ключи переводов, не тексты. Тексты живут в i18n файлах на фронте. Смена языка не требует изменения схемы.

**Генерация ключей из Prisma через DMMF:**

```typescript
// scripts/generate-i18n-keys.ts
import { getDMMF } from '@prisma/internals'

const dmmf = await getDMMF({ datamodelPath: 'prisma/schema.prisma' })
const keys = {}

for (const model of dmmf.datamodel.models) {
  const modelName = model.name.toLowerCase()
  keys[modelName] = {}
  for (const field of model.fields) {
    keys[modelName][field.name] = `entity.${modelName}.${field.name}`
  }
}
// генерирует packages/contracts/i18n/keys.ts
```

Запускается вместе с `prisma generate`:

```json
"generate": "prisma generate && pnpm generate:i18n-keys"
```

**Namespace соглашение — автоген никогда не затрёт ручные ключи:**

```
entity.*   ← автоген из Prisma (entity.order.status, entity.user.email)
nav.*      ← ручные (nav.orders, nav.settings)
action.*   ← ручные (action.save, action.delete)
error.*    ← ручные (error.network, error.notFound)
page.*     ← ручные (page.dashboard.title)
```

---

## x- Extensions — UI-мета в схеме

`x-` extensions — официальная часть OpenAPI 3.1. UI-мета живёт прямо в схеме. Фронт читает и генерирует CRUD автоматически.

**Декоратор через конфиг — не хардкод, ключи не тексты:**

```typescript
@ApiExtension('x-ui', uiConfig('Order', {
  labelKey: 'entity.order.label',   // ключ перевода, не текст
  showIn: ['table', 'form'],
  sortable: true,
}))
```

`uiConfig` — pure функция. Фронт берёт перевод по ключу из i18n — не из схемы.

**Пример схемы с x- метой:**

```yaml
components:
  schemas:
    Order:
      x-ui-label-key: entity.order.label
      properties:
        id:
          type: string
          x-ui-showIn: []
        status:
          type: string
          enum: [pending, paid, cancelled]
          x-ui-label-key: entity.order.status  ← ключ, не текст
          x-ui-showIn: [table, form, detail]
          x-ui-order: 1
          x-ui-sortable: true
        total:
          type: number
          x-ui-label-key: entity.order.total
          x-ui-showIn: [table, detail]
          x-ui-order: 2
```

---

## Декларативность на бэке

В NestJS декларативность уже встроена через декораторы — выносить их в конфиг-объект плохая идея, теряется типизация и IDE поддержка.

**Где декларативности реально не хватает — бизнес-правила:**

```typescript
// императивно — типичная картина
async createOrder(dto) {
  if (user.role !== 'admin') throw ...
  if (dto.total > user.limit) throw ...
  if (stock < dto.quantity) throw ...
}

// декларативно — через конфиг правил
const orderRules = [
  { check: 'role',  value: 'admin' },
  { check: 'limit', field: 'total' },
  { check: 'stock', field: 'quantity' },
]
```

Это тот самый 5% реальной бизнес-логики — здесь живёт место для декларативных правил.

---

## Направления развития

- **Server-Driven UI** — бэк отдаёт не данные а инструкцию что рендерить. Фронт тупой исполнитель. `x-` extensions — база для этого. Следующий шаг: бэк отдаёт UI-мету в runtime через API, не только в схеме.
- **Generic бизнес-правила** — декларативный конфиг для валидации бизнес-логики на бэке.
- **Contract-first tooling** — когда созреет: схема первична, бэк и фронт генерируются из неё. Сейчас: бэк генерирует схему — прагматичный старт.

---

## Контракт ошибок форм

Единый формат ошибок для всей системы — бэк возвращает структуру которую фронт напрямую маппит на поля формы через RHF `setError`.

Два типа ошибок:

```typescript
// packages/contracts/src/errors/api-error.schema.ts

// ошибки конкретных полей формы
export const FieldErrorsSchema = z.record(
  z.string(),           // имя поля: 'email', 'address.city'
  z.object({
    message: z.string()
  })
)

// глобальная ошибка — не привязана к полю
export const GlobalErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(), // 'EMAIL_TAKEN', 'INSUFFICIENT_FUNDS'
})

// итоговый контракт
export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  fieldErrors: FieldErrorsSchema.optional(),  // ошибки полей
  globalError: GlobalErrorSchema.optional(),  // бизнес/системная ошибка
})

export type ApiError = z.infer<typeof ApiErrorSchema>
```

**Когда что использовать:**

```
fieldErrors  ← схемная валидация + бизнес ошибки привязанные к полю
               ('email уже занят', 'недостаточно средств на счёте')
globalError  ← ошибки не привязанные к полю
               ('заказ уже отменён', 'сервис недоступен')
```

**На бэке** — кастомный exception filter форматирует все ошибки в этот контракт:

```typescript
// Схемные ошибки (nestjs-zod ZodValidationPipe)
{
  statusCode: 422,
  fieldErrors: {
    email: { message: 'Обязательное поле' },
    total: { message: 'Минимум 1' }
  }
}

// Бизнес ошибка привязанная к полю
{
  statusCode: 422,
  fieldErrors: {
    email: { message: 'Уже занят' }
  }
}

// Глобальная бизнес ошибка
{
  statusCode: 422,
  globalError: {
    message: 'Заказ уже отменён',
    code: 'ORDER_CANCELLED'
  }
}
```

---

## Что нужно проработать

- **`uiConfig` / `i18n`** — конкретная реализация хелперов для `x-` extensions
- **`@Pageable()` pipe** — generic реализация парсинга пагинации из query
- **Generic CRUD контроллер** — базовый контроллер параметризованный сущностью
- **Правила валидации** — декларативный конфиг бизнес-правил
- **Lazy sync User** — механизм создания User записи при первом запросе от Keycloak
- **Exception filter** — кастомный фильтр форматирующий все ошибки в ApiErrorSchema
