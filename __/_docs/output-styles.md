# Output Styles

`Output Styles` задаёт стандартные форматы ответов агента для разных типов задач.

Цель:
- сделать ответы предсказуемыми
- сократить дрейф между агентами и режимами работы
- отделить формат ответа от содержания задачи

## Общие правила

Любой output style должен:
- быть кратким
- быть ориентированным на действие
- не дублировать лишний контекст
- явно отделять findings от предложений, если это review

## 1. Planner Output

Используется для:
- plan-mode задач
- decomposition
- новых модулей
- migration tasks

Форма:
- `Task Type`
- `Goal`
- `Already Fixed / Already Decided`
- `Open Questions`
- `Scope`
- `Non-goals`
- `Constraints`
- `Step-by-step plan`
- `Verification`
- `Risks`

Если задача про новую доменную сущность, planner output обязательно должен начинаться с:
- `Уже зафиксировано`
- `Открытые вопросы`
- `Новые предложения`

## 2. Implementation Summary

Используется после implement phase.

Форма:
- что изменено
- какие ключевые файлы затронуты
- какие проверки запущены
- какие ограничения или остаточные риски остались

Не превращать summary в changelog на 50 пунктов.

## 3. Review Output

Используется для review-mode.

Форма:
- findings first
- затем assumptions / open questions
- затем короткий итог

Каждый finding должен:
- иметь severity
- иметь file reference
- объяснять реальный риск
- содержать направление исправления

Review не должен начинаться с общей похвалы или длинного summary.

## 4. Decision Record Output

Используется, когда нужно зафиксировать архитектурное решение.

Форма:
- `Контекст`
- `Решение`
- `Альтернативы`
- `Причина`
- `Последствия`

Этот стиль должен совпадать с `_docs/decisions.md`.

## 5. Risk Report Output

Используется, когда задача упирается в ограничения.

Форма:
- `Что блокирует`
- `Почему это важно`
- `Что можно сделать сейчас`
- `Что нужно сделать позже`

Применяется для:
- temporary deviation
- missing contour
- external dependency gaps

## 6. Verification Output

Используется после test/build/codegen/checks.

Форма:
- список реально запущенных команд
- что прошло
- что не удалось запустить
- что это означает для confidence level

Если что-то не прогнано, это нужно писать явно.

## 7. Discussion Output

Используется, когда пользователь просит “пока просто подумать”.

Форма:
- короткая позиция
- ключевые tradeoffs
- предлагаемый next step

Не превращать discussion в implement plan, если пользователь этого не просил.

## Style Selection Rule

Агент должен выбирать style по задаче:
- planning -> `Planner Output`
- coding done -> `Implementation Summary`
- review -> `Review Output`
- architecture decision -> `Decision Record Output`
- blocked state -> `Risk Report Output`
- verification -> `Verification Output`
- discussion -> `Discussion Output`

## Main Rule

Формат ответа должен помогать двигать задачу дальше, а не просто выглядеть аккуратно.
