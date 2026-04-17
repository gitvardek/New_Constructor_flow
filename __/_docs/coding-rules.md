# Coding Rules

`Coding Rules` — это vendor-neutral набор правил реализации для этого репозитория.

Этот документ отвечает на вопрос:
- какой код здесь считается хорошим
- что можно писать, а что нельзя
- какие формы реализации предпочитаются по умолчанию

Это не замена `_architecture/*` и не замена workflow.
Это практическая доктрина написания кода.

## Связь с другими слоями

- `CODEX.md` — operational entrypoint для Codex
- `_docs/workflow.md` — как вести задачу
- `_docs/task-contract.md` — как формулировать задачу
- `.claude/*` — Claude-specific operational rules

Если коротко:
- здесь лежат общие правила кода для всех исполнителей
- в `.claude/*` лежит Claude-specific форма этих правил
- для Codex canonical rulebook — именно этот документ

## Базовый принцип

Система должна стремиться быть:
- contract-first
- config-driven
- generator-friendly
- agent-friendly
- с явными границами слоёв

Императивная логика допустима, но не должна подменять собой декларативную модель там, где поведение может быть выражено через конфиг, таблицу соответствий или структуру данных.

## Общие правила

- NEVER удалять или переписывать рабочие тесты без явного запроса
- NEVER удалять файлы без подтверждения
- ALWAYS запускать тесты после изменений кода
- Одна задача за раз: не смешивать несколько независимых изменений в одной реализации
- Если ограничение или источник истины неясен, сначала уточнить контекст, а не угадывать
- При работе с библиотеками использовать актуальную документацию и принятый toolchain репозитория

## Source Of Truth Rules

- Контракт пишется до кода
- Все публичные endpoint-ы сначала описываются в `packages/contracts/*.yaml`
- NEVER дублировать вручную типы, уже существующие в контрактах
- После изменения контракта ALWAYS запускать `pnpm generate:api`
- Типы для transport layer должны быть производными от generated types
- Схемы в контрактах переиспользуются через `$ref`, без дублирования
- `PATCH` контракты содержат только optional поля
- `DELETE` возвращает `SuccessResponse` или `EmptyResponse`
- Контрактные ошибки используют общий `ApiError` с `errorCode`
- Списки в transport contracts используют общий paginated shape

## API Rules

- NEVER вызывать `fetch` или `axios` напрямую из приложений
- Все HTTP-вызовы идут через `packages/api-client`
- Клиент должен использовать generated transport types
- Public API пакетов не должен обещать поведение, которое реально не реализовано
- SSE используется только через `api-client` слой, а не через прямой transport в feature-коде

## Frontend Rules

- Frontend baseline: `Next.js + React + TypeScript`
- NEVER класть бизнес-логику в компоненты по умолчанию
- Компоненты отвечают за отображение и использование hooks
- NEVER делать прямые API-вызовы в компонентах
- Серверное состояние хранится в `TanStack Query`
- Клиентское состояние хранится в `Zustand`
- NEVER смешивать серверный и клиентский state
- Типы импортируются из `@my-app/api-client`, не дублируются вручную
- Тексты не хардкодятся в компонентах, а приходят через i18n или copy layer
- Числа и UI/runtime constants должны приходить из config или settings, а не из literal-ов внутри feature-кода

## Backend Rules

- Backend baseline: `NestJS + Fastify`
- Архитектура по умолчанию: `Controller -> Service -> Repository`
- NEVER держать бизнес-логику в controller
- NEVER обращаться к БД напрямую из service, только через repository
- Входящие данные валидируются через `Zod / nestjs-zod`
- Все endpoint-ы защищены `KeycloakGuard`, если не помечены как публичные явно
- Не использовать `throw new Error()` там, где нужен осмысленный framework-level exception
- Списки используют общую пагинацию
- Фильтрация и сортировка идут через общие pipes и whitelist разрешённых полей

## Auth Rules

- NEVER реализовывать собственную auth логику вместо Keycloak OIDC
- NEVER хранить токены в `localStorage`
- Проверка токена делается через guard, а не вручную в controller
- Роли и permissions берутся из token claims

## Soft Delete And Audit Rules

- ALWAYS использовать soft delete, а не физическое удаление
- Repository по умолчанию фильтрует удалённые записи
- Поля аудита заполняются через `AuditContext`, не вручную

## Filtering And Sorting Rules

- Фильтрация использует общий формат `filter[field][operator]=value`
- Сложная `OR`-логика не прячется в generic query params, а выносится в отдельный search endpoint
- NEVER писать парсинг фильтров вручную, если есть общий pipe
- Разрешённые поля фильтрации и сортировки объявляются явно

## Hardcode Rules

- NEVER хардкодить секреты
- NEVER хардкодить числа в компонентах, hooks или сервисах, если это не локальная вычислительная константа
- NEVER хардкодить пользовательские тексты в компонентах
- NEVER хардкодить dynamic UI behavior прямо в компоненте, если его можно вынести в конфиг
- Все magic numbers должны жить в конфиге
- Все dynamic UI states должны описываться конфигом, а не ветвлениями в шаблоне

## Lookup Table Rules

- NEVER писать `switch`, `if/else if` или длинные цепочки ветвлений для маппинга значений
- ALWAYS предпочитать lookup table вида `Record<Key, Config>`
- Lookup table может содержать:
  - данные
  - copy keys
  - UI config
  - функции
  - действия

Идея простая:
- маппинг — это данные
- данные лучше хранить как конфиг
- конфиг лучше читать, тестировать и генерировать, чем разрозненную императивную логику

## Config-Driven Rules

- По возможности система должна описываться деревом конфигов
- Конфиги получают зависимости параметрами, а не скрытыми импортами
- Конфиг должен быть чистым и тестируемым
- Поведение, зависящее от статуса, роли, режима, feature flag или UI state, по умолчанию выражается конфигом
- Если значение можно задать declaratively, не нужно прятать его в imperative code

## Types Rules

- Типы должны быть производными, а не дублированными
- Предпочитать `Pick`, `Omit`, `Partial`, `ReturnType` и производные от generated contracts
- Если runtime constants уже существуют, типы должны выводиться из них, а не дублироваться отдельными enum/string union там, где это не нужно

## Function Style Rules

- Если внутри функции не нужен собственный `this`, по умолчанию использовать стрелочную функцию
- Function declaration использовать только там, где это действительно нужно
- Основной допустимый случай для function declaration: когда нужен собственный `this` или функция ссылается на саму себя через имя
- Не использовать function declaration просто по привычке, если стрелочная форма выражает тот же смысл проще и локальнее

## Config Placement

- `packages/config/` — shared runtime config между фронтом и бэком
- `apps/web/config/` или `apps/web/src/config/` — фронтовые UI-конфиги
- Feature-specific configs должны жить рядом со своей feature-областью

Типичные примеры:
- pagination config
- API timeout/retry config
- route maps
- status config
- table config
- form config
- copy config

## Anti-Patterns

- fabricated defaults, скрывающие отсутствие реального runtime truth
- misleading public API
- ручное дублирование transport types
- прямой `fetch` в приложениях
- placeholder implementation, замаскированная под finished feature
- business logic inside component/controller
- dynamic behavior, размазанный по `if/else`, если его можно выразить таблицей или конфигом

## Формула качества кода

Хороший код в этом репозитории обычно:
- опирается на контракт
- соблюдает границы слоя
- минимизирует хардкод
- выражает маппинг через lookup/config
- делает runtime truth явной
- не дублирует типы
- не скрывает временные заглушки под видом законченной реализации
