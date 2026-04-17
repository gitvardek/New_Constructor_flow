# DCA — Generic FE Structure

> Реализация философии DCA на фронтенде. Читать после `dca.md`.

---

## Подход

Гибрид **FSD + DCA**. FSD даёт слои с однонаправленными зависимостями. DCA даёт внутреннюю структуру каждого слоя — явные зоны ответственности.

**Правило зависимостей (из FSD):** каждый слой импортирует только из слоёв ниже. Никогда из своего уровня или выше.

```
app → pages → widgets → features → entities → shared
```

---

## Структура

```
app/                        ← Next app router layer
  orders/
    page.tsx                ← тонкая обёртка над feature/page composition
  layout.tsx                ← общий layout

src/
  bootstrap/                ← провайдеры, глобальные стили, i18n, state

  layouts/                  ← структурные виджеты (header, sidebar, footer)
    main/
    auth/

  pages/                    ← сборка страниц из виджетов через конфиг
    orders/
      index.tsx             ← конфиг: какие виджеты, какой лейаут
    dashboard/

  widgets/                  ← крупные самодостаточные UI блоки
    order-list/
    checkout-summary/

  features/                 ← пользовательские действия с бизнес-смыслом
    checkout/
      components/           ← JSX, получает доменный конфиг пропом, ничего не тянет
      hooks/                ← tanstack (сервер) + zustand (локал), раздельно
      forms/                ← схемы форм, валидация, конфиги полей
      configs/              ← flow, state machines, lookup tables
      store/                ← zustand, только локальный стейт
      types/
    auth/
    notifications/

  entities/                 ← доменные модели и их базовые операции
    order/
      types/
      api/                  ← CRUD + useQuery обёртки для этой сущности
    payment/
    user/

  shared/                   ← всё что не привязано к домену
    api/                    ← openapi-fetch клиент, effectful модуль
    ui-kit/                 ← переиспользуемые компоненты
    forms/                  ← generic форм-система
    configs/                ← глобальные конфиги (модалки, роуты)
    types/                  ← общие контракты и типы
    utils/                  ← pure функции
    hooks/                  ← переиспользуемые hooks
```

---

## i18n — архитектура переводов

Два источника ключей — автоген и ручные, разные namespace:

```
packages/contracts/i18n/keys.ts  ← автоген из Prisma (entity.*)
src/bootstrap/i18n/              ← ручные переводы (nav.*, action.*, error.*, page.*)
```

**Как фронт использует ключи:**

```typescript
// x- extensions из OpenAPI содержат ключ
field.x-ui-label-key // 'entity.order.status'

// фронт берёт перевод по ключу
const { t } = useTranslation()
t(field['x-ui-label-key'])  // → 'Статус' (ru) / 'Status' (en)

// для ручных ключей — то же самое
t('nav.orders')     // → 'Заказы'
t('action.save')    // → 'Сохранить'
```

**Namespace соглашение:**

```
entity.*   ← автоген из Prisma, не трогать руками
nav.*      ← навигация
action.*   ← кнопки и действия
error.*    ← системные сообщения
page.*     ← заголовки страниц и специфичный текст
```

Автоген и ручные ключи никогда не конфликтуют — разные namespace.

---



| Папка | Тип модуля (DCA) | Осведомлённость | Что живёт |
|-------|-----------------|-----------------|-----------|
| `ui-kit/` | Pure | zero knowledge | универсальные компоненты без домена. Язык пропов — UI-термины: `{ label, variant, size }` |
| `components/` | Pure | domain-aware | получают доменный конфиг пропом, только рендерят. Язык пропов — доменные термины: `{ order, onPay, status }` |
| `widgets/` | Stateful | domain-aware | умный слой — вызывают хуки, передают конфиг в компоненты |
| `layouts/` | Stateful | domain-aware | структурные виджеты страницы — header, sidebar, footer. Знают про роуты и пользователя |
| `pages/` | Declarative | domain-aware | сборка страницы из виджетов через конфиг — какой лейаут, какие виджеты |
| `hooks/` | Stateful | domain-aware | tanstack + zustand, раздельно |
| `forms/` | Pure | domain-aware | схемы, валидация, конфиги полей |
| `configs/` | Declarative | domain-aware | flow, state machines, lookup tables |
| `store/` | Stateful | domain-aware | локальный стейт, нотификации |
| `api/` | Effectful | domain-aware | HTTP, openapi-fetch |
| `utils/` | Pure | zero knowledge | чистые функции без домена |

Простое правило для компонентов: если видишь доменное слово в пропах — это `components/`, не `ui-kit/`.

---

## Поток данных

Хук — это "сборщик". Он читает стор, текущий шаг из state machine, данные из tanstack — и собирает чистый конфиг который летит пропами в тупой компонент. Компонент про стор не знает вообще.

```
configs/ (state machine)        ← декларативный контракт на переходы и события
    ↓
hooks/ (читает стор, tanstack)        ← собирает конфиг для компонента
    ↓
widgets/                        ← умный слой: вызывает хук, передаёт конфиг вниз
    ↓
components/                     ← тупые, только пропы
```

**Widgets — это умные компоненты.** Именно здесь логика встречается с представлением. Хук не знает про JSX, компонент не знает про логику — widget склеивает их через конфиг. Store — не шаг в цепочке, а узел который хуки читают/пишут внутри себя:

```typescript
// widgets/ — умный, вызывает хук, передаёт конфиг компоненту
function OrderListWidget() {
  const config = useOrderList() // хук собирает всё внутри
  return <OrderList config={config} />
}

// components/ — тупой, только рендерит
function OrderList({ config }: { config: OrderListConfig }) {
  return <List {...config} />
}
```

**State machine как контракт на события между слоями.** Виджет не эмитит событие в пустоту — он триггерит переход который уже описан в конфиге. Все возможные события и переходы типизированы декларативно:

```typescript
const checkoutFlow = {
  states: {
    idle:       { on: { SUBMIT: 'validating' } },
    validating: { on: { VALID: 'submitting', INVALID: 'failed' } },
    submitting: { on: { SUCCESS: 'done', ERROR: 'retrying' } },
    retrying:   { on: { SUCCESS: 'done', EXHAUSTED: 'failed_permanent' } },
  }
}
```

EventBus между слоями не нужен — state machine закрывает эту задачу декларативно.

---

## Правило границы: entities/api/ vs features/hooks/

**`entities/[entity]/api/`** — CRUD + реактивные обёртки (useQuery). Всё что про сущность безотносительно сценария:

```typescript
// entities/order/api/
getOrder(id)
getOrders(filters)
createOrder(dto)
useOrdersQuery()   // просто useQuery обёртка над getOrders
```

**`features/[feature]/hooks/`** — бизнес-операции. Оркестрируют entity api, содержат сценарную логику:

```typescript
// features/checkout/hooks/
useCheckout()  // внутри вызывает createOrder → pay → redirect
```

Простое правило: если запрос описывает что можно сделать с сущностью — `entities/api/`. Если описывает бизнес-сценарий — `features/hooks/`.

---

## Правило типов в entities/

Фронт получает чистый контракт от бэка через `openapi-fetch` — бэк сам фильтрует что отдавать через `ResponseDto`. Фронт не видит внутренностей БД.

```
ResponseDto (бэк)
    ↓ OpenAPI → openapi-fetch
тип из contracts    ← используем напрямую в большинстве случаев
    ↓ если нужно
entities/order/types/ ← только вычисляемые поля поверх ResponseDto
```

**`entities/[entity]/types/`** — появляется по необходимости, не по умолчанию. Только если фронт добавляет вычисляемые поля которых нет в контракте:

```typescript
// простой случай — типа из contracts достаточно
// entities/order/types/ не нужна, импортируем напрямую
import type { components } from '@my-app/api-client/generated'
type OrderDto = components['schemas']['Order']

// сложный случай — нужны вычисляемые поля
// entities/order/types/index.ts
import type { components } from '@my-app/api-client/generated'
type OrderDto = components['schemas']['Order']

export type Order = OrderDto & {
  isPaid: boolean        // вычисляемое из status
  displayTotal: string   // отформатированное для UI
}
```

Правило: `entities/order/types/` — всегда производный от контракта, никогда независимый источник правды.

---

## Ключевые правила

- `components/` получает всё через доменный конфиг пропом — без прямых вызовов хуков и api
- `hooks/` собирает конфиг для компонентов — там живёт вся "умность"
- `hooks/` разделяет серверный стейт (tanstack) и локальный (zustand) — не мешает
- `configs/` содержит только структуру и переходы — никакой логики, это контракт на события
- `store/` не содержит бизнес-логики — только стейт и события
- `entities/api/` — CRUD + useQuery. `features/hooks/` — бизнес-операции поверх них
- Наполнение страниц через конфиг — `pages/` читает конфиг, рендерит виджеты
- `layouts/` — отдельная папка для структурных виджетов (header, sidebar, footer)

---

## Правило масштабирования структуры

Структура выше — это **максимум**, не минимум. Папки появляются по мере необходимости.

```
// маленькая фича
features/toggle-theme/
  components/
  hooks/

// средняя фича
features/auth/
  components/
  hooks/
  configs/
  types/

// большая фича
features/checkout/
  components/
  hooks/
  forms/
  configs/
  store/
  types/
```

Чем модуль больше и важнее — тем структура ближе к полной. Чем меньше — тем меньше папок нужно.

---

## Правило прагматизма

Мы стремимся к тупым компонентам везде — но всегда помним что можно сделать неидеальное решение с точки зрения архитектуры, если закрыть его грамотным контрактом.

**Плохая реализация за хорошим контрактом лучше, чем хорошая реализация с протекающей абстракцией.**

Если компонент по какой-то причине тянет хук напрямую — это не катастрофа. Главное чтобы его внешний интерфейс (пропы) был чистым и не раскрывал внутренние детали. Контракт изолирует проблему.

```typescript
// внутри не идеально — компонент тянет хук сам
function OrderCard({ orderId }: { orderId: string }) {
  const config = useOrderCard(orderId) // не идеал
  return <div>{config.title}</div>
}

// но контракт чистый — снаружи никто не знает про хук
// и когда придёт время рефакторить — граница уже есть
```

> Стремись к идеалу, но не насилуй архитектуру ради чистоты. Грамотный интерфейс важнее идеальной реализации.

---

## Next.js специфика

`src/app/` — тонкие route entrypoints, только импортируют из `src/page-modules/`. Вся бизнес-логика живёт в остальном `src/` и не знает про Next routing.

```typescript
// src/app/orders/page.tsx — только тонкая обёртка
import { OrdersPage } from '@/src/page-modules/orders'

export default function OrdersRoute() {
  return <OrdersPage />
}
```

---

## Форм-система

Три уровня сложности — чем сложнее форма, тем больше контроля и меньше автогена:

```
CRUD форма        ← AutoForm + Zod схема из prisma-zod-generator
Кастомная форма   ← AutoForm + Zod схема вручную
Сложная форма     ← React Hook Form напрямую, свой компонент + свой хук
```

**Стек:**
- `react-hook-form` — основа для всех трёх уровней, управление состоянием формы
- `@hookform/resolvers/zod` — связка RHF с Zod схемой
- `@autoform/react` + `@autoform/shadcn` — генератор форм из Zod схемы, использует компоненты из ui-kit

**CRUD форма** — схема автоматически из `prisma-zod-generator`, форма автоматически из AutoForm:

```typescript
// shared/forms/crud-form.tsx
function CrudForm({ schema, onSubmit }) {
  return <AutoForm schema={schema} onSubmit={onSubmit} />
}

// использование — минимум кода
<CrudForm schema={OrderCreateSchema} onSubmit={handleCreate} />
```

**Кастомная форма** — схема вручную, форма через AutoForm с fieldConfig оверрайдами:

```typescript
const CheckoutSchema = z.object({
  address: z.string().min(5),
  paymentMethod: z.enum(['card', 'cash']),
})

<AutoForm
  schema={CheckoutSchema}
  fieldConfig={{
    address: { label: 'Адрес доставки', inputProps: { placeholder: '...' } },
  }}
  onSubmit={handleCheckout}
/>
```

**Сложная форма** — AutoForm не используется, полный контроль:

```typescript
// features/checkout/components/CheckoutForm.tsx — тупой компонент
function CheckoutForm({ config }: { config: CheckoutFormConfig }) {
  return <form onSubmit={config.onSubmit}>...</form>
}

// features/checkout/hooks/useCheckoutForm.ts — вся логика здесь
function useCheckoutForm() {
  const form = useForm({ resolver: zodResolver(CheckoutSchema) })
  // сложная логика: conditional fields, cross-field validation, multi-step
  return { form, ... }
}
```

**Где живут схемы форм:**

```
packages/contracts/generated/  ← CRUD схемы (автоген из Prisma)
packages/contracts/errors/      ← ApiErrorSchema (shared контракт ошибок)
features/[feature]/forms/       ← кастомные и сложные схемы
```

**Маппинг серверных ошибок на поля формы:**

Единый утилитарный хук закрывает маппинг для любой формы — фронт не знает пришла ошибка с клиента или сервера:

```typescript
// shared/hooks/useServerErrors.ts
function useServerErrors(form: UseFormReturn) {
  return (error: ApiError) => {
    // ошибки полей — маппим как клиентскую валидацию
    Object.entries(error.fieldErrors ?? {}).forEach(([field, err]) => {
      form.setError(field, { message: err.message })
    })
    // глобальная ошибка — показывается над формой
    if (error.globalError) {
      form.setError('root.serverError', {
        message: error.globalError.message
      })
    }
  }
}

// использование в любой форме
const handleServerErrors = useServerErrors(form)

const onSubmit = async (data) => {
  try {
    await createOrder(data)
  } catch (error) {
    handleServerErrors(error) // поля загораются ошибками автоматически
  }
}
```

---

## Что нужно проработать

- **Конфиг страниц** — DSL для `PageRenderer`
- **Лейаут система** — как конфиг страницы выбирает лейаут, место `layouts/` в иерархии
- **State machine / flow** — механика исполнения, инструмент (XState? zustand? своё?), связка с хуками и стором. Прорабатывать на реальном кейсе — без практики легко уйти в over-engineering
