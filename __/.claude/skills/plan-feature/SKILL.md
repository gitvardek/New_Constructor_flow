# /plan-feature

Spawn the `planner` agent for the current task.

## Steps

1. Run `git diff --name-only` to understand what's already changed (if anything).
2. Use the Agent tool with `subagent_type: planner`.
3. Pass to the agent: the task description, affected area, and any relevant file paths.
4. After the planner completes, present the plan to the user for discussion.
5. Do not proceed to implementation until the user approves the plan.

## Notes

- The planner writes to `_plans/{task-name}.md` — this is the handoff artifact for module-builder.
- The planner never writes code. If it starts writing code, stop it.
- For simple tasks (1–2 files, no contracts): skip this skill and implement inline.
