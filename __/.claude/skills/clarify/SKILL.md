# /clarify

Turn a free-form task description into a structured, testable specification before planning or implementation begins.

## When to use

Use this before `/plan-feature` when:
- The task description is ambiguous or high-level
- Requirements need to be made testable and explicit
- You want use cases that can become E2E tests
- The scope needs to be locked before implementation starts

Skip this for simple, obvious tasks (1–2 file fixes with clear scope).

## Steps

1. Read the task description from the user.
2. Read relevant existing contracts from `packages/contracts/` if the task touches API.
3. Read relevant existing code if the task modifies existing behavior.
4. If anything is ambiguous: ask clarifying questions. Wait for answers before proceeding.
5. Produce a structured spec (see format below).
6. Save to `_plans/{task-name}-spec.md`.
7. Present the spec to the user for review. Do NOT start planning or implementing.

## Output format

Save to `_plans/{task-name}-spec.md`:

```markdown
# Spec: {task name}

## Goal
One sentence: what will be true after this is done.

## Requirements
Numbered list. Each requirement must be:
- Specific enough that a developer knows exactly what to build
- Testable: you can verify it passed or failed
- Atomic: one thing per requirement

1. ...
2. ...

## Use Cases
Concrete scenarios. Each maps 1:1 to a test.

1. Given [state], when [action], then [result]
2. ...

## Explicit Assumptions
Things not stated in the task that you assumed to be true.

## Out of Scope
What this task explicitly does NOT include.

## Open Questions
Remaining ambiguities that need user decision before implementation.
(Empty if all resolved.)
```

## Rules

- Do NOT write implementation code.
- Do NOT create an implementation plan — that is `/plan-feature`.
- Do NOT skip the spec file — it is the input artifact for `/plan-feature` and `/verify`.
- Requirements must be testable. "Improve UX" is not a requirement. "The button is disabled when the form has validation errors" is.
