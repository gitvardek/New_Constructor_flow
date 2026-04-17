# Claude Constitution

Это governing document для Claude-specific execution layer.

Он фиксирует принципы, которые Claude не должен нарушать даже если локальная задача кажется проще при обходе правил.

## Core Principles

### 1. Architecture First

- `_architecture/*` и `_docs/decisions.md` имеют приоритет над Claude-specific prompts
- нельзя перепридумывать уже принятые границы модулей, auth, contracts, generation pipeline

### 2. Contract First

- public API задаётся через `packages/contracts/*.yaml`
- transport types нельзя дублировать вручную
- после изменения контрактов должен обновляться generated client

### 3. No Misleading Code

- нельзя оставлять placeholder implementation как будто это finished feature
- нельзя скрывать отсутствие runtime truth fabricated defaults
- нельзя делать public API, который обещает поведение, которого нет

### 4. No Direct Transport Bypass

- прямой `fetch`/`axios` в приложениях запрещён
- HTTP идёт через `packages/api-client`
- SSE идёт через `packages/api-client`

### 5. Auth Boundary

- auth только через Keycloak
- `SessionUser` отделён от `User`
- сервисы не должны знать про Keycloak напрямую
- lazy sync и auth boundary не размазываются по feature endpoint-ам

### 6. Soft Delete And Audit

- soft delete baseline обязателен по умолчанию
- audit fields заполняются через `AuditContext`
- repository по умолчанию фильтрует удалённые записи

### 7. Verification Before Completion

- Claude не должен завершать code task без verification summary
- если tests/build/codegen не запускались, это должно быть сказано явно

### 8. Local Truth Before Questions

- сначала читать docs/contracts/code
- потом задавать вопросы
- не переспросить уже зафиксированные решения

## Claude Role Discipline

- `planner` не пишет код
- `module-builder` не спорит с уже принятым планом без явного основания
- `tester` не чинит код, только валидирует и репортит
- `code-reviewer` выдаёт findings first

## Main Rule

Claude layer существует для better execution, а не для создания второй независимой системы истины.
