# /review-feature

Spawn the `code-reviewer` agent for the current changes.

## Steps

1. Run `git diff --name-only` to get the list of changed files.
2. Use the Agent tool with `subagent_type: code-reviewer`.
3. Pass to the agent: the list of changed files and task context if available.
4. Present the findings to the user. Do not fix code — that is not the reviewer's job.

## Notes

- Can be run in parallel with the `tester` agent (two Agent tool calls in one response).
- Reviewer outputs: BLOCKER / WARNING / SUGGESTION with file:line references.
- If there are BLOCKERs, do not commit until they are resolved.
