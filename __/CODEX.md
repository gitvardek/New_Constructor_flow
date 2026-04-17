# CODEX.md

`CODEX.md` — это operational bootstrap для работы с Codex в этом репозитории.

Это не общий архитектурный документ и не замена `_architecture/*`.
Это entrypoint, который определяет, как Codex должен заходить в задачу, какие документы читать дальше и как выбирать режим работы.

## Что читать после этого файла

Этот файл нужно читать первым, а затем переходить к следующим документам:

- [_docs/workflow.md](./_docs/workflow.md) — vendor-neutral процесс работы: `Plan -> Implement -> Verify -> Review`
- [_docs/task-contract.md](./_docs/task-contract.md) — как ставить задачи Codex и как Codex должен восстанавливать недостающий контекст
- [_docs/agent-layer.md](./_docs/agent-layer.md) — как Codex соотносится с legacy agent model и operational слоем
- [_docs/coding-rules.md](./_docs/coding-rules.md) — явные правила кода и shape реализации
- [_docs/bootstrap-test-policy.md](./_docs/bootstrap-test-policy.md) — минимальная test policy для bootstrap-этапа и reference layers
- `_architecture/*` — каноническая архитектурная модель
- [_docs/decisions.md](./_docs/decisions.md) — уже принятые архитектурные решения

Для Codex canonical operational chain такая:
- `CODEX.md` → entrypoint
- `_docs/workflow.md` → процесс
- `_docs/task-contract.md` → формат задачи
- `_docs/coding-rules.md` → правила кода
- `_docs/bootstrap-test-policy.md` → минимальная test policy для bootstrap-stage
- `_plans/*` → планы для нетривиальных задач
- `_architecture/*` → архитектурная истина
- `_docs/decisions.md` → зафиксированные решения

`.claude/*` и [CLAUDE.md](./CLAUDE.md) не являются canonical источником для Codex workflow.
Они рассматриваются как отдельный Claude-specific adapter layer.

Если нужно кратко понять, “как работать с Codex здесь”, ответ начинается именно с этого файла.

## Порядок чтения

Перед нетривиальной задачей читать в таком порядке:
1. `CODEX.md`
2. `_docs/workflow.md`
3. `_docs/task-contract.md`
4. `_docs/coding-rules.md`
5. `_docs/bootstrap-test-policy.md`, если задача затрагивает bootstrap/reference layer
6. релевантные файлы из `_architecture/`
7. `_docs/decisions.md`
8. релевантные контракты из `packages/contracts/`

## Приоритет источников истины

Порядок приоритета:
1. `_architecture/*`
2. `_docs/decisions.md`
3. `packages/contracts/*`
4. `_docs/*`
5. `.claude/*` как legacy operational reference

Если `_architecture/*` конфликтует со старыми Claude-ориентированными файлами, приоритет у `_architecture/*`.

## Baseline фреймворка

- Frontend: `Next.js + React + TypeScript`
- Backend: `NestJS + Fastify`
- Validation: `Zod` / `nestjs-zod`
- Client state: `Zustand`
- Server state: `TanStack Query`
- Public API source of truth: `packages/contracts/*.yaml`
- DB source of truth: Prisma schema
- Auth baseline: `KeycloakGuard`

## Режим работы Codex

- Для простых задач можно сразу писать код.
- Для нетривиальных задач сначала изучить контекст и дать короткий план.
- Для крупных изменений работать по фазам: `Plan -> Implement -> Verify -> Review`.
- Для review-mode выдавать findings first, без длинного пересказа.
- Baseline качество подразумевается по умолчанию.
- Временное отклонение от baseline допустимо только как явно проговоренное исключение, а не как отдельный нормальный режим работы.

## Как использовать MCP

Приоритет доступа к знаниям и окружению:
1. локальные файлы репозитория
2. MCP resources, если доступны
3. `Context7` для документации библиотек
4. `Playwright` для UI/browser-проверок
5. web search только если локального и MCP-контекста недостаточно

`.mcp.json` считать декларацией желаемых MCP-серверов, а не гарантией, что все они доступны в текущей сессии.

## Как ставить задачи Codex

Предпочтительный стиль запроса:
- `Task type`: `bootstrap` / `feature`
- цель
- границы изменений
- что нельзя трогать
- expected result
- как проверять
- если baseline временно недостижим: явно указать `Temporary Deviation`

Если это не указано явно, Codex должен восстановить это из `_docs/task-contract.md`, `_docs/coding-rules.md` и релевантного контекста.

## Правило для новой доменной сущности

Перед тем как предлагать модель, CRUD shape, flow, Prisma schema или уточняющие вопросы по новой доменной сущности, Codex обязан сначала восстановить локальную истину репозитория.

Обязательный порядок:
1. `CODEX.md`
2. `_docs/decisions.md`
3. релевантные файлы из `_architecture/*`
4. релевантные контракты из `packages/contracts/*`
5. релевантные шаблоны, планы и существующую реализацию, если они уже есть

После этого Codex обязан:
- явно перечислить уже зафиксированные решения, влияющие на сущность
- отделить зафиксированные решения от собственных новых предложений
- не задавать вопросы, если ответ уже есть в документах, контрактах или коде
- задавать только вопросы о реально незакрытых пробелах или о конфликтах между источниками

Для новых сущностей ответ должен начинаться с коротких блоков:
- `Уже зафиксировано`
- `Открытые вопросы`
- `Новые предложения`

Недопустимо повторно спрашивать про:
- soft delete, если он уже принят глобально
- auth boundary, если она уже зафиксирована
- shape публичной сущности, если контракт уже существует
