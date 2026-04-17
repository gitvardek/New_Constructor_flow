# /verify

Comprehensive post-implementation verification. Runs tester and code-reviewer in parallel, then checks requirements traceability.

## Steps

### 1. Collect context

Run `git diff --name-only` to get changed files.
Check if `_plans/{task-name}-spec.md` exists (from `/clarify`).
Check if `_plans/{task-name}.md` exists (from `/plan-feature`).

### 2. Run parallel verification

Make two Agent tool calls in a single response (parallel):

**Agent 1 — tester**
Pass: list of changed files, task context.
The tester runs tests and reports results.

**Agent 2 — code-reviewer**
Pass: list of changed files, task context.
The reviewer checks for rule violations and findings.

Wait for both to complete.

### 3. Requirements traceability (if spec exists)

For each requirement in `_plans/{task-name}-spec.md`:
- Find the implementation that satisfies it (file + line reference).
- Find the test that verifies it (test name or file).
- Mark as: ✅ covered | ⚠️ partial | ❌ missing

For each use case in the spec:
- Confirm a test exists that covers it.

### 4. Build check

Run: `pnpm build` (or scoped: `pnpm --filter @my-app/api build`, `pnpm --filter @my-app/web build`)
Report: passed / failed with output.

### 5. Combined report

```
## Build
[passed | failed]

## Tests
[from tester agent]

## Code Review Findings
[from code-reviewer agent]

## Requirements Traceability
1. Requirement text — ✅ impl: file:line | test: test-name
2. Requirement text — ❌ missing implementation
...

## Use Cases
1. Scenario — ✅ covered by: test-name
2. Scenario — ❌ no test found

## Summary
Blockers: X
Warnings: Y
Missing coverage: Z requirements, W use cases
Ready to commit: yes | no
```

## Rules

- Do not fix code — report only.
- If no spec file exists, skip requirements traceability and note it.
- "Ready to commit: yes" requires: 0 BLOCKER findings, all tests passing, build passing.
