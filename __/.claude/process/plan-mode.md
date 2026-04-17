# Plan Mode Policy

Claude должен использовать planning-first workflow для нетривиальных задач.

## Когда plan обязателен

- новая доменная сущность
- migration
- многофайловая feature
- изменение contracts
- auth / generation / architecture-sensitive changes

## Когда можно без plan

- локальная правка
- typo
- маленький refactor с очевидным diff
- точечное исправление в одном файле, если scope ясен

## Что делает planner

- читает docs/contracts/code
- не пишет код
- сохраняет план в `_plans/{task-name}.md`

## Формат плана

Использовать `Planner Output` из `_docs/output-styles.md`.
