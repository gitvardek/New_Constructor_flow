# Generated And Scaffold Verification

Этот документ фиксирует verification rules для `generated`, `scaffold` и `manual` артефактов в `framework v0.1`.

Он не заменяет [_docs/workflow.md](./workflow.md) и не заменяет [_docs/codegen-scope-v0.1.md](./codegen-scope-v0.1.md).

- `_docs/workflow.md` задает общую process-модель `Plan -> Implement -> Verify -> Review`
- `_docs/codegen-scope-v0.1.md` задает границы `generated / scaffold / manual`
- этот документ отвечает на вопрос: **как это проверять на implement/verify/review фазах**

## Purpose

Generation layer в `v0.1` уже разведен по режимам:

- `generated`
- `scaffold`
- `manual`

Но без явных verification rules implement и review будут каждый раз заново решать:

- когда обязателен regen
- что считается drift
- какая ручная правка допустима
- какие findings обязательны в review

Цель этого документа:

- сделать verification для generation layer предсказуемой
- убрать procedural ambiguity перед `health` и `users`
- отделить policy от automation

## Artifact Classes

### `generated`

Детерминированный output из canonical source of truth.

Примеры для `v0.1`:

- `packages/api-client/src/generated.ts`
- Prisma-generated artifacts
- future materialized `entity.*` i18n key output after dedicated follow-up implementation

Правило:

- generated artifacts не редактируются руками

Если generation direction уже обязательна на уровне scope, но concrete output еще не materialized, implement/review не должны делать вид, что такой generated artifact уже существует в repo.

### `scaffold`

Шаблонный стартовый каркас, который после создания дописывается вручную.

Примеры для `v0.1`:

- файлы, созданные на основе `_templates/*`

Правило:

- scaffold-файлы можно редактировать руками
- но нельзя потом задним числом объявлять их generated output

### `manual`

Ручная реализация, которая не должна считаться результатом codegen.

Примеры для `v0.1`:

- backend logic
- mapping
- orchestration
- frontend page and feature logic

Правило:

- manual code проверяется по baseline stack, architecture и package boundaries, а не по правилам deterministic generation

## Implement Rules

Фаза `Implement` должна соблюдать следующие правила.

### 1. Если меняется source of truth, исполнитель обязан проверить нужен ли regen

Минимальное правило:

- изменились `packages/contracts/*` -> проверить необходимость `pnpm generate:api`
- изменился `prisma/schema.prisma` -> проверить необходимость Prisma generation path
- изменился scaffold template -> не regen существующих hand-written файлов автоматически

### 2. Generated artifacts не редактируются руками

Если задача требует изменения generated output, правильный путь:

1. изменить canonical source
2. прогнать generation path
3. проверить output

Ручная правка generated файла считается нарушением baseline.

### 3. Scaffold не masquerade-ится под generated

Если файл был создан из шаблона и дальше редактировался руками:

- он остается scaffold/manual continuation
- его нельзя проверять как deterministic output
- его drift оценивается относительно архитектуры и task scope, а не относительно повторного запуска шаблона

### 4. Manual code не должен обходить generation boundaries

Недопустимо:

- вручную дублировать transport types из contracts
- делать direct API assumptions мимо `@my-app/api-client`
- заполнять generated gaps скрытым handwritten public contract

## Verify Rules

Фаза `Verify` должна проверять generation layer по типу изменения.

### Contracts Changes

Если затронуты `packages/contracts/*`:

- убедиться, что transport truth согласована с intended API surface
- прогнать `pnpm generate:api`, если output затрагивается
- проверить, что generated transport surface синхронизирована с contracts
- проверить, что consumer code не зависит от stale generated output

### Persistence Truth Changes

Если затронут `prisma/schema.prisma`:

- проверить, что persistence changes не подменяют transport truth
- проверить, что Prisma generation path не конфликтует с declared module shape
- проверить, что DB-backed modules продолжают маппить DB -> API contract явно

### Template Changes

Если затронуты `_templates/*`:

- проверить, что шаблон остается scaffold layer
- проверить, что шаблон не навязывает неподтвержденный CRUD/API surface
- проверить, что шаблон согласован с `_docs/codegen-scope-v0.1.md`
- проверить, что template drift не маскируется под feature implementation

### Reference Structure Changes

Если затронуты `apps/*` или `packages/*` в рамках baseline cleanup:

- проверить, что изменения не нарушают package boundaries
- проверить, что changes не подменяют feature-task bootstrap-cleanup'ом без явной маркировки
- проверить, что generated/scaffold/manual distinctions остаются читаемыми

## Review Rules

Фаза `Review` обязана поднимать findings по следующим типам проблем.

### Mandatory Findings

- ручная правка generated artifacts
- stale generated transport surface после changes в contracts
- ручное дублирование transport types там, где должен использоваться `@my-app/api-client`
- scaffold, который выдается за generated output
- hidden temporary deviation в generation path
- template change, которая не согласована с canonical `v0.1` model

### Typical Review Questions

Review должен задавать себе вопросы:

1. Изменился ли canonical source of truth?
2. Если да, был ли прогнан нужный generation path?
3. Если нет, почему изменился generated output?
4. Не скрыт ли structural drift под видом scaffold convenience?
5. Не превращает ли implement-задача bootstrap cleanup в feature code silently?

## What Counts As Drift

### Generated Drift

Drift есть, если:

- canonical source изменен, а generated output не синхронизирован
- generated output изменен вручную
- consumer code рассчитывает на shape, которого уже нет в source of truth

### Scaffold Drift

Drift есть, если:

- шаблон продолжает размножать старую canonical модель
- шаблон навязывает лишний module/API shape, не подтвержденный scope
- template baseline расходится с текущими `_docs/*` и `_architecture/*`

### Manual Drift

Drift есть, если:

- ручной код начинает дублировать generated/public contract layer
- feature implementation нарушает declared package boundaries
- runtime shape расходится с контрактом без явного temporary deviation

## Required Checks By Change Type

### If `packages/contracts/*` changed

- review contracts
- run `pnpm generate:api`
- проверить generated transport surface
- проверить affected consumer code

### If `prisma/schema.prisma` changed

- review persistence truth impact
- проверить Prisma generation path
- проверить mapping boundaries DB -> API
- если concrete Prisma-derived output еще не materialized, явно назвать это ограничение, а не притворяться fully closed pipeline

### If `_templates/*` changed

- review template against current canonical docs
- проверить, что template остается scaffold-only
- проверить, что template не тащит устаревший baseline

### If reference baseline changed

- проверить package boundaries
- проверить route/module structural consistency
- проверить, что cleanup не подменяет feature implementation

## Policy Vs Automation

Для `v0.1` важно явно различать policy и automation.

### Policy

Policy уже обязательна:

- regen rules
- edit boundaries
- review findings
- drift classification

### Automation

Automation может быть неполной.

Это означает:

- не каждая policy rule обязана уже иметь script или CI check
- отсутствие automation не отменяет обязательность policy
- если verification пока выполняется вручную, это должно быть явно сказано в task result

## Temporary Limitations In v0.1

В `v0.1` допустимо, что часть verification существует как documented process, а не как полный automated pipeline.

Это допустимо только если:

- limitation явно названа
- scope ограничения локализован
- limitation не маскируется под "все и так проверяется"
- generation direction не выдается за уже существующий concrete generated output

Недопустимо:

- делать вид, что drift проверяется автоматически, если это не так
- оставлять generated/scaffold ambiguity без явной фиксации

## Practical Rule

Если задача затрагивает generation-related слой, исполнитель должен явно ответить:

1. Что здесь является source of truth?
2. Какие артефакты здесь `generated`, `scaffold`, `manual`?
3. Какой verification step обязателен до завершения задачи?
4. Что review должна проверить отдельно?

Если ответы неочевидны, задача еще не готова к implement-фазе.
