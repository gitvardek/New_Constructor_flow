# Codegen Scope v0.1

`Codegen Scope v0.1` фиксирует минимальный generation layer, который обязателен для первой замкнутой версии meta-framework.

Этот документ не заменяет [_architecture/generation.md](./../_architecture/generation.md).
`_architecture/generation.md` отвечает на вопрос "как устроена модель происхождения артефактов в целом".
Этот документ отвечает на вопрос "что именно реально генерится в `v0.1`, что scaffold, а что остается ручным кодом".

## Purpose

`v0.1` не должна пытаться автоматически строить весь framework.

Цель generation layer в `v0.1`:

- убрать ручное дублирование structural artifacts
- зафиксировать границы между source of truth и производными файлами
- дать устойчивый baseline для `health` и `users`
- остановить scope creep в сторону "генерим вообще всё"

## Baseline Principles

- нет одного global master source of truth
- `Prisma` отвечает за persistence truth
- `OpenAPI` отвечает за transport truth
- `Zod` отвечает за runtime validation truth
- i18n truth разделена по слоям:
  - `OpenAPI` задает transport shape локализуемых данных
  - `Prisma` задает происхождение `entity.*` key namespace
  - frontend i18n files задают реальные UI-тексты
- `x-*` metadata и schema metadata содержат ключи и structural hints, но не тексты

## Artifact Modes

В `v0.1` все артефакты должны явно относиться к одному из трех режимов.

### `generated`

Детерминированный output из canonical source of truth.

Свойства:

- output должен получаться повторным запуском generation command
- ручная правка такого файла недопустима
- drift между source и output считается ошибкой

### `scaffold`

Стартовый каркас, который создается по шаблону и дальше дорабатывается вручную.

Свойства:

- scaffold можно редактировать руками после создания
- generator не должен бездумно перезатирать ручные изменения
- scaffold не считается source of truth

### `manual`

Hand-written implementation, которая не должна считаться результатом codegen.

Свойства:

- сюда относится domain logic, orchestration, mapping, нестандартные flow и policy
- ручная реализация здесь является нормой, а не временным исключением

## Required Generation Scope For v0.1

Ниже перечислено то, что считается обязательным generation baseline для `v0.1`.

| Source of truth | Artifact | Target | Mode | Required in v0.1 |
|---|---|---|---|---|
| `packages/contracts/openapi.yaml` + split contracts | typed transport surface | `packages/api-client/src/generated.ts` | `generated` | yes |
| `packages/contracts/openapi.yaml` + split contracts | types for `openapi-fetch` usage | `packages/api-client/*` consumption of generated types | `generated` + hand-written wrappers | yes |
| `prisma/schema.prisma` | Prisma Client | Prisma generation output | `generated` | yes |
| `prisma/schema.prisma` | `entity.*` i18n key generation direction | concrete target path to be fixed in follow-up implementation before `users` | `generated direction` | yes |
| `_templates/*` | module/page/slice starter files | files created from templates | `scaffold` | yes |

## What Is Explicitly In Scope In v0.1

### 1. OpenAPI -> typed API surface

Обязательно:

- `pnpm generate:api`
- `packages/api-client/src/generated.ts`
- использование generated transport types в shared client

Это baseline transport generation path для `health`, `auth/session` и `users`.

### 2. Prisma -> Prisma Client

Обязательно:

- генерация Prisma client из `prisma/schema.prisma`
- использование Prisma как persistence truth для DB-backed modules

Этот слой обязателен для `users`, даже если конкретные модели еще уточняются.

### 3. Prisma -> `entity.*` i18n keys

Обязательно на уровне scope:

- `entity.*` namespace должен считаться Prisma-derived generation direction, а не ручным слоем
- source of truth для него: `prisma/schema.prisma`

В `v0.1` это обязательная часть canonical model, но не fully closed generated output внутри уже выполненного `A1`.

Это означает:

- направление `Prisma -> entity.*` обязательно для `v0.1`
- concrete target path еще не считается зафиксированным самим `A1`
- concrete generation command и expected output должны быть закрыты отдельной bootstrap/implement-задачей до `users`
- implement/review не должны притворяться, что этот pipeline уже fully materialized

### 4. Templates -> scaffold baseline

Обязательно:

- `_templates/*` считаются scaffold layer, а не generated output
- шаблоны должны помогать создавать стартовую структуру модуля или slice
- после генерации scaffold-файлы редактируются руками

Это важно для `health`, `users` и следующих модулей, но шаблоны не должны притворяться source of truth.

## What Is Explicitly Not In Scope In v0.1

Ниже перечислено то, что **не должно** считаться обязательным codegen scope первой версии:

- full CRUD UI generation
- full controller/service/repository generation "под ключ"
- form generation
- permission/policy generation
- state machine / flow generation
- business logic generation
- auth orchestration generation
- rich admin meta generation
- попытка свести `Prisma`, `OpenAPI` и `Zod` к одному master-config

Если такие идеи появляются, они относятся к более поздним версиям framework, а не к `v0.1`.

## Editing Boundaries

### Generated artifacts

- не редактируются руками
- должны полностью определяться source of truth и generation command
- при изменении source обязателен regen

### Scaffold artifacts

- после создания редактируются руками
- шаблон задает стартовую форму, но не управляет дальнейшей жизнью файла
- scaffold не должен маскироваться под generated output

### Manual artifacts

- редактируются руками без попытки "натянуть" на них детерминированный generator
- здесь живет основная реализация slice

## Verification Policy For v0.1

Минимальная проверка generation layer в `v0.1`:

1. Если изменены `packages/contracts/*`, должен быть прогнан `pnpm generate:api`.
2. Generated transport surface должен оставаться синхронизирован с contracts.
3. Если изменен persistence source, Prisma generation path не должен противоречить текущей модели.
4. Нельзя выдавать scaffold или manual code за generated output.
5. Review должен считать finding:
   - ручную правку generated artifacts
   - drift между contracts и generated transport surface
   - drift между declared scaffold role и фактическим использованием шаблонов

Этот документ задает policy только на уровне `v0.1`.
Автоматизация проверки drift и точные scripts относятся к отдельной follow-up задаче.

## Impact On v0.1 Slices

### `health`

`health` должен использовать:

- `OpenAPI` как transport truth
- generated transport types через `packages/api-client`
- hand-written backend/frontend implementation

`health` не зависит от Prisma-derived generation.

### `users`

`users` должен использовать:

- `Prisma` как persistence truth
- `OpenAPI` как transport truth
- generated transport types
- Prisma generation path
- concrete Prisma-derived `entity.*` generation follow-up before full users implementation
- hand-written mapping и domain implementation

`users` не должен полагаться на auto-generated business logic.

## Follow-ups

Этот документ сознательно не закрывает следующие вопросы полностью:

- актуализация `_templates/*` под текущую canonical модель
- automation для проверки generated/scaffold drift
- конкретный implementation task для `entity.*` i18n key generation

До `users` этот follow-up должен:

- зафиксировать concrete target path
- зафиксировать concrete generation command or path
- зафиксировать expected output surface для `entity.*`

Эти вопросы относятся к следующим задачам roadmap:

- `A2. Templates Reconciliation`
- `A3. Generated/Scaffold Verification Rules`

## Practical Rule

Если артефакт в `v0.1` обсуждается как "генерируемый", нужно сразу ответить на три вопроса:

1. Какой у него canonical source of truth?
2. Это `generated`, `scaffold` или `manual`?
3. Нужен ли он для `health` или `users` в `v0.1` прямо сейчас?

Если хотя бы на один вопрос нет четкого ответа, артефакт не должен автоматически считаться частью codegen scope `v0.1`.
