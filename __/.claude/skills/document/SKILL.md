# /document

Update project documentation after a feature is complete. Keeps CLAUDE.md and decisions log in sync with what was actually built.

## When to use

After `/verify` passes and the feature is ready to commit.

## Steps

### 1. Collect context

Run `git diff --name-only` to see what changed.
Read `_plans/{task-name}-spec.md` if it exists.
Read `_plans/{task-name}.md` if it exists.

### 2. Check CLAUDE.md for drift

Read `CLAUDE.md`.
Ask: does anything in the baseline stack, rules, or agent pipeline need updating based on what was just built?
If yes: propose the update. Do not edit without user confirmation.

### 3. Check decisions log

Read `_docs/decisions.md`.
Ask: did this feature introduce an architectural decision worth recording?

Record a new entry if:
- A new external dependency was added
- A contract was introduced or changed in a non-trivial way
- An architectural pattern was established (not just "used existing pattern")
- A significant tradeoff was made that future developers should know about

Do NOT record: local refactors, naming decisions, UI tweaks.

If an entry is needed, write it in this format and propose it to the user:

```markdown
## [YYYY-MM] Short decision title

**Context:** What problem were we solving.

**Decision:** What we chose.

**Alternatives:** What we considered.

**Reason:** Why we chose this.

**Consequences:** What this means for the codebase going forward.
```

### 4. Clean up plan files

Ask the user: archive or delete `_plans/{task-name}*.md`?
Default: keep them (git history preserves them, plans directory stays clean on its own).

### 5. Report

```
## Documentation Review

CLAUDE.md: up to date | proposed update (see below)
decisions.md: no new entries needed | proposed entry (see below)

[proposed changes if any]
```

## Rules

- Do NOT edit files without user confirmation.
- Do NOT write decisions for obvious or trivial choices.
- One decision entry per meaningful architectural choice, not per file changed.
