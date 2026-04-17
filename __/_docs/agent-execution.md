# Agent Execution

`Agent Execution` описывает, как агент должен заходить в задачу в этом репозитории.

Это не документ про архитектуру приложения.
Это документ про архитектуру исполнения задач агентом.

## Цель

Документ отвечает на вопросы:
- какие инструкции читать первыми
- в каком порядке восстанавливать локальную истину репозитория
- как выбирать релевантные правила
- как соотносить общий слой и vendor-specific adapters

## Слои инструкций

### 1. Entry Layer

- `CODEX.md`
- `CLAUDE.md`

Это vendor-specific bootstrap files.
Они не должны подменять архитектуру или contracts.

### 2. Vendor-Neutral Operational Layer

- `_docs/workflow.md`
- `_docs/task-contract.md`
- `_docs/coding-rules.md`
- `_docs/output-styles.md`
- `_docs/hooks-policy.md`
- `_docs/mcp-policy.md`

Это основной operational слой для людей и агентов.

### 3. Architecture Layer

- `_architecture/*`
- `_docs/decisions.md`

Это архитектурная истина и зафиксированные решения.

### 4. Contract Layer

- `packages/contracts/*`

Это source of truth для публичного transport API.

### 5. Implementation Layer

- `apps/*`
- `packages/*`
- `_templates/*`
- `_plans/*`

Это слой фактической реализации и артефактов задач.

## Canonical Loading Order

Для Codex canonical order такой:
1. `CODEX.md`
2. `_docs/workflow.md`
3. `_docs/task-contract.md`
4. `_docs/coding-rules.md`
5. релевантные документы из `_architecture/*`
6. `_docs/decisions.md`
7. релевантные контракты из `packages/contracts/*`
8. релевантный код, шаблоны и планы

Для Claude аналогичный порядок должен применяться поверх `CLAUDE.md`, но не должен ломать vendor-neutral layer.

## Instruction Precedence

При конфликте действует такой приоритет:
1. `_architecture/*`
2. `_docs/decisions.md`
3. `packages/contracts/*`
4. `_docs/*`
5. vendor-specific adapters (`CODEX.md`, `CLAUDE.md`, `.claude/*`)

Следствие:
- vendor adapters не могут переопределять уже принятые архитектурные решения
- contracts не подменяются локальными типами
- operational docs не подменяют architecture

## Path-Scoped Reading

Агент не должен каждый раз читать весь репозиторий.
Он должен читать только релевантный маршрут.

### Если задача про backend

Читать:
- `_architecture/dca-be.md`
- `_docs/coding-rules.md`
- `_docs/decisions.md`
- relevant contracts
- `apps/api/**`

### Если задача про frontend

Читать:
- `_architecture/dca-fe.md`
- `_docs/coding-rules.md`
- `_docs/decisions.md`
- relevant contracts
- `apps/web/**`

### Если задача про contracts

Читать:
- `_architecture/generation.md`
- `_docs/coding-rules.md`
- `_docs/decisions.md`
- `packages/contracts/**`
- `packages/api-client/**`

### Если задача про workflow/agents

Читать:
- `CODEX.md`
- `_docs/workflow.md`
- `_docs/task-contract.md`
- этот документ
- vendor adapter layer при необходимости

## Preflight For New Domain Entity

Для новой доменной сущности агент обязан:
1. восстановить уже зафиксированные решения
2. отделить их от новых предложений
3. не задавать вопросы, если ответ уже есть в docs/contracts/code

Формат ответа:
- `Уже зафиксировано`
- `Открытые вопросы`
- `Новые предложения`

## Phase Model

Vendor-neutral phases:
1. `Plan`
2. `Implement`
3. `Verify`
4. `Review`

Legacy names:
- `planner` -> `Plan`
- `module-builder` -> `Implement`
- `tester` -> `Verify`
- `code-reviewer` -> `Review`

## Vendor Adapters

### Codex

- `CODEX.md` — bootstrap
- `_docs/*` — canonical operational layer

### Claude

- `CLAUDE.md` — bootstrap
- `.claude/*` — Claude-specific adapter layer

Правильная модель:
- общий смысл живёт в `_docs/*` и `_architecture/*`
- vendor-specific слой только адаптирует execution style

## Main Rule

Агент должен сначала восстановить локальную истину репозитория, и только потом предлагать решения, план или код.
