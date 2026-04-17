# Session Management

Claude session discipline в этом репозитории должна быть явной.

## Когда очищать контекст

- новая несвязанная задача -> новая сессия или `/clear`
- если контекст разросся и задача сменилась -> `/compact` или новая сессия

## Когда делать checkpoints

- перед крупным рефакторингом
- перед risky migration
- перед fan-out across files

## Когда использовать resume

- длинная задача, продолжаемая позже
- task chain, где важно сохранить контекст решения

## Когда открывать новый worktree/session

- параллельные независимые задачи
- review отдельно от implementation
- remediation отдельно от feature work

## Main Rule

Контекст Claude — это ограниченный ресурс.
Если задача перестала помещаться в одну clean session, нужно сменить session strategy, а не надеяться на память модели.
