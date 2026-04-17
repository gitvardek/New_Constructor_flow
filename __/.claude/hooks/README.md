# Claude Hooks

Этот каталог описывает hook strategy для Claude Code в этом репозитории.

## Current MVP

Сейчас в `.claude/settings.json` реально включён один blocking hook:
- перед `git commit` запускать `pnpm test`

## Planned Hooks

Следующий полезный минимум:
1. contracts changed -> `pnpm generate:api`
2. pre-review reminder/check
3. detect direct `fetch` outside `packages/api-client`
4. detect manual transport type duplication

## Hook Policy Source

Основной источник правил:
- `_docs/hooks-policy.md`

Claude hooks должны усиливать существующие правила, а не создавать вторую независимую систему.
