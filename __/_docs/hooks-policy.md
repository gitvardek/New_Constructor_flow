# Hooks Policy

`Hooks Policy` описывает, какие проверки и автоматические действия должны выполняться вокруг агентной работы.

Цель документа:
- превратить markdown rules в enforceable workflow
- отделить blocking checks от advisory checks
- определить точки интеграции для Claude hooks, Codex automation и CI

## Что такое hook в этом репозитории

Hook — это автоматическое действие или проверка, привязанная к событию:
- до редактирования
- после редактирования
- после изменения контрактов
- перед review
- перед commit

Hook может:
- блокировать действие
- добавлять контекст
- запускать проверку
- генерировать артефакты

## Hook Events

### `pre-edit`

Запускается перед существенными правками.

Задача:
- проверить, что выбран релевантный source of truth
- проверить, что задача не противоречит already-decided architecture
- напомнить про `_plans/*`, если задача нетривиальная

### `post-edit`

Запускается после изменения кода.

Задача:
- определить, затронуты ли contracts
- определить, затронут ли backend/frontend
- определить, нужна ли дополнительная verification

### `post-contract-change`

Запускается после изменения `packages/contracts/*`.

Задача:
- обязательно запускать `pnpm generate:api`
- проверять, что generated surface обновлён

### `pre-review`

Запускается перед review.

Задача:
- напомнить checklist review
- проверить, есть ли незапущенные тесты или codegen drift

### `pre-commit`

Запускается перед commit.

Задача:
- убедиться, что обязательные проверки выполнены
- блокировать commit, если project baseline нарушен

## Blocking Hooks

Эти проверки должны блокировать продолжение действия.

### 1. Contract Drift

Если изменились `packages/contracts/*`, но не обновлён generated client:
- блокировать

Действие:
- запуск `pnpm generate:api`

### 2. Failed Tests Before Commit

Если `pnpm test` не проходит:
- блокировать commit

### 3. Direct HTTP Calls Outside `packages/api-client`

Если в приложениях найден прямой `fetch`/`axios`:
- блокировать

Исключения:
- только внутри `packages/api-client`
- только в явно согласованном temporary deviation

### 4. Manual Transport Type Duplication

Если transport types продублированы руками вместо generated/contracts:
- блокировать

### 5. Secret Hardcode

Если обнаружены вероятные секреты в коде/конфигах:
- блокировать

## Advisory Hooks

Эти проверки не блокируют, но должны добавлять сигнал.

### 1. Hardcoded UI Copy

Если найдены пользовательские тексты в feature/component code:
- предупреждение

### 2. Legacy Stack Mentions

Если в canonical docs остались старые stack references:
- предупреждение

### 3. Missing Tests For New Module

Если появился новый slice без тестов:
- предупреждение

### 4. Placeholder Implementation

Если найдены заглушки, похожие на finished code:
- предупреждение или блокировка в review-mode

## Minimal Hook Matrix

### Contracts changed

Событие:
- `post-contract-change`

Действие:
- `pnpm generate:api`

Тип:
- blocking

### Backend code changed

Событие:
- `post-edit`

Действие:
- relevant backend tests
- `pnpm --filter @my-app/api build`

Тип:
- advisory during editing
- blocking before commit if broken

### Frontend code changed

Событие:
- `post-edit`

Действие:
- relevant frontend tests
- `pnpm --filter @my-app/web build`

Тип:
- advisory during editing
- blocking before commit if broken

### Review requested

Событие:
- `pre-review`

Действие:
- проверить tests/codegen/build status
- затем findings-first review

## Enforcement Strategy

Уровни enforcement:

### 1. Agent-level

Сам агент обязан следовать policy даже без автоматизации.

### 2. Hook-level

Vendor-specific hooks:
- Claude hooks
- local scripts
- future Codex automation

### 3. CI-level

Финальный guardrail.

## Scope Rule

Hooks не должны:
- подменять архитектурные решения
- генерировать скрытые side effects
- вносить неожиданные правки без явного правила

Hooks должны:
- усиливать уже существующие правила
- делать drift видимым
- автоматизировать рутинную verification

## First Hooks To Implement

Практический приоритет:
1. contracts changed -> `pnpm generate:api`
2. pre-commit -> `pnpm test`
3. detect direct `fetch` outside `packages/api-client`
4. detect manual transport types
5. detect obvious hardcoded secrets
