# Claude Code Workflow

Claude-specific execution guide. Vendor-neutral workflow lives in `_docs/workflow.md`.

---

## Core Principles

### Context Economy

CLAUDE.md loads automatically into every main session.
Subagents spawned via Agent tool do NOT receive CLAUDE.md — they start fresh.
Each agent reads only what's relevant to its role, lazily.

Do not read the full doc chain before every task. Read what the task requires.

### Agent Isolation

The only artifact passed between agents is a plan file at `_plans/{task-name}.md`.
No conversation history. No "as we discussed". Just the file.

### Parallel Verification

After implementation, tester and code-reviewer run in parallel as independent Agent calls.
They are independent — no ordering needed between them.

---

## When to Use Agents vs Inline

| Signal | Action |
|--------|--------|
| 1–2 files, obvious scope, no contracts touched | Inline — no agents |
| 3–5 files, or new feature slice | `planner` → discuss → `module-builder` |
| New entity, contract changes, auth changes, 6+ files | Full pipeline |

If uncertain: inline first, spawn agent if it gets complex.

---

## Pipeline

### Inline (no skills/agents)

```
Read relevant files → Implement → Run tests → Done
```

### Standard pipeline

```
/clarify → /plan-feature → module-builder → /verify → /document
```

Step by step:
1. `/clarify` — free-form task → structured spec in `_plans/{task}-spec.md`
2. `/plan-feature` — spawns planner agent → implementation plan in `_plans/{task}.md`
3. Review plan with user before proceeding
4. `module-builder` agent — implements per plan
5. `/verify` — spawns tester + code-reviewer in parallel, checks requirements traceability
6. `/document` — updates CLAUDE.md and decisions.md if needed, then commit

### Shortcuts

- Already have a clear spec? Skip `/clarify`, go straight to `/plan-feature`.
- Simple task (1–2 files)? Skip `/clarify` and `/plan-feature`, implement inline, run `/verify`.
- Quick review only? Use `/review-feature` directly.

### Parallel execution in /verify

`/verify` makes two Agent tool calls in a single response (parallel):
- tester agent — runs tests, reports results
- code-reviewer agent — reviews code, reports findings

Both start in fresh context. Results are merged before reporting.

---

## Plan File Contract

Plans live in `_plans/{task-name}.md`. This is the handoff artifact.

Required sections:

```markdown
# Plan: {name}

## Task Type
bootstrap | feature

## Goal

## Already Decided
Constraints from decisions.md and architecture that apply here.
Do not re-question these.

## Open Questions
Real gaps only. Skip if answer is in existing docs/contracts.

## Scope
Changed: [file list]
Must not change: [file list]

## Non-goals

## Steps
1.
2.

## Verification

## Risks
```

planner writes this. module-builder reads it. No other format accepted.

---

## Scale Decision Logic

**Skip planner if:**
- Single clear fix, 1–2 files
- No contract changes
- No new module or entity
- Scope is obvious from the task description

**Use planner if:**
- New module, entity, or feature slice
- Contract changes (always)
- Auth boundary touched
- 3+ files or cross-package changes
- Task requires architectural decision

---

## Hooks

| Trigger | Command | Type |
|---------|---------|------|
| `git commit` | `pnpm test` | blocking |
| contracts changed | `pnpm generate:api` | manual (no hook yet) |

Planned but not implemented: contract drift detection, direct fetch detection.

---

## ADR Trigger Conditions

Write a new entry in `_docs/decisions.md` when:
- Contract changes that affect 3+ files or 2+ packages
- Auth boundary changes
- New external dependency added
- Data flow between layers changes
- Breaking change to existing contract

Skip decisions.md for: local refactors, naming, UI details, test changes.
