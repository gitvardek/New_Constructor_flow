# CLAUDE.md

Bootstrap for Claude Code. For Claude-specific workflow details see `.claude/WORKFLOW.md`.

## Baseline Stack

- Frontend: Next.js + React + TypeScript
- Backend: NestJS + Fastify
- Validation: Zod / nestjs-zod
- Client state: Zustand
- Server state: TanStack Query
- API contracts: `packages/contracts/*.yaml`
- DB schema: `prisma/schema.prisma`
- Auth: KeycloakGuard

## Truth Priority

When sources conflict:
1. `_architecture/*`
2. `_docs/decisions.md`
3. `packages/contracts/*`
4. `_docs/*`
5. `.claude/*` and `CLAUDE.md`

## Non-negotiable Rules

- No direct `fetch` or `axios` in apps — only `packages/api-client`
- No manual transport type duplication — use generated types
- `KeycloakGuard` on all endpoints unless explicitly marked public
- Soft delete by default — no hard deletes
- After contract changes: run `pnpm generate:api`
- Before commit: run `pnpm test`

## Agent Pipeline

For non-trivial tasks: `planner → discuss plan → module-builder → [tester || code-reviewer]`

- `planner` saves output to `_plans/{task-name}.md`
- `tester` and `code-reviewer` run in parallel after module-builder completes
- For simple tasks (1–2 files, no contracts touched): implement inline, no agents

## New Domain Entity Rule

Before proposing model, CRUD shape, or flow for a new entity, read:
1. `_docs/decisions.md`
2. Relevant `_architecture/*`
3. Existing contracts in `packages/contracts/`

Response format: **Already Decided** / **Open Questions** / **New Proposals**

Do not re-ask about: soft delete, auth boundary, existing contract shapes.
