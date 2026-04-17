# MCP Policy

`MCP Policy` определяет, как агент должен использовать внешние knowledge/tool servers по отношению к локальному репозиторию.

Цель:
- убрать магические ожидания от `.mcp.json`
- определить приоритет между local context, MCP, docs tools и web
- сделать использование MCP воспроизводимым

## Основной принцип

MCP — это дополнительный execution/knowledge layer.
Он не подменяет:
- локальные документы репозитория
- contracts
- архитектурные решения

Сначала агент обязан использовать локальную истину репозитория.
Только потом MCP и внешние источники.

## Priority Order

Порядок такой:
1. локальные файлы репозитория
2. MCP resources
3. documentation tools вроде `Context7`
4. browser/UI automation вроде `Playwright`
5. web search

## Что означает `.mcp.json`

`.mcp.json` — это декларация желаемой MCP-конфигурации.

Это не гарантия, что:
- все серверы реально доступны в текущей сессии
- агент автоматически их уже использует
- они являются source of truth

Следовательно:
- агент должен различать declared MCP setup и actually available MCP tools

## Когда использовать MCP

### Использовать MCP, если:

- нужен live context из внешнего инструмента
- нужен доступ к issue tracker / project system / external docs / external services
- задача зависит от данных, которых нет в локальном репозитории

### Не использовать MCP, если:

- ответ уже есть в `_docs/*`, `_architecture/*`, `packages/contracts/*`
- задача чисто про локальный код и локальные правила
- локальный контекст достаточен

## MCP Transport Policy

Предпочтительный baseline transport:
- `HTTP`
- `stdio`

Не делать `SSE` transport baseline для MCP server integration.
Если где-то он ещё встречается, это должно считаться legacy/integration-specific исключением, а не основным путём.

Причина:
- это лучше соответствует текущим рекомендациям экосистемы Claude Code docs
- transport policy должна быть устойчивой и современной

## MCP Usage Categories

### 1. Documentation MCP

Для:
- библиотек
- framework docs
- API references

Пример:
- `Context7`

### 2. Resource MCP

Для:
- структурированных ресурсов
- project data
- shared internal knowledge

### 3. Browser/UI Tooling

Для:
- UI smoke checks
- browser workflows
- визуальной проверки runtime behavior

Пример:
- `Playwright`

## Verification Rule

Если ответ получен через MCP, агент должен:
- отделить локальную истину от внешнего контекста
- не подменять external info локальные contracts/architecture
- явно понимать, что из ответа является authoritative для этого репо, а что нет

## Safe Fallback Strategy

Если MCP tool:
- недоступен
- не даёт достаточно информации
- противоречит локальной истине репозитория

агент должен:
1. опереться на локальный репозиторий
2. при необходимости использовать docs tools или web search
3. явно обозначить границы уверенности

## Recommended MCP Use In This Repo

### Для локальных feature-задач

Обычно MCP не нужен.

### Для библиотечных вопросов

Предпочитать docs tool (`Context7`) перед web search.

### Для UI runtime проверки

Использовать browser tooling (`Playwright`) после локального анализа кода.

### Для внешней проектной интеграции

Использовать MCP resources только если локального контекста недостаточно.

## Main Rule

MCP усиливает агентную работу, но не заменяет локальную архитектурную и контрактную истину репозитория.
