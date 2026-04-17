# Bootstrap Test Policy

`Bootstrap Test Policy` — это минимальная политика тестирования для раннего этапа сборки framework.

Она нужна для ситуации, когда:

- архитектурные границы еще формируются
- reference slices еще собираются
- не хочется тащить тяжелую test architecture раньше времени

Но при этом нельзя полностью потерять сигналы о регрессиях.

## Базовый принцип

На bootstrap-этапе мы не строим full test strategy заранее.

Вместо этого мы держим только **минимальные smoke tests на канонические boundaries**.

Цель:

- не раздувать test harness
- не тянуть awkward public API только ради тестов
- не оставлять reference-layer совсем без проверки

## Что обязательно тестировать

### 1. Public boundary слоя

Если слой уже претендует на canonical/public boundary, он должен иметь хотя бы минимальный smoke coverage.

Типичные примеры:

- `packages/api-client`
- первый backend reference endpoint
- первый frontend reference page/module

### 2. Parser / Normalizer boundary

Если в коде появился отдельный parser или normalizer layer, который легко сломать рефактором, он должен иметь минимальную проверку.

Типичные примеры:

- `parseBackendApiError`
- `parseSseEvent`
- transport result unwrapping

### 3. Первый reference slice

Если slice позиционируется как канонический пример, у него должен быть хотя бы минимальный smoke path.

Для `v0.1` это в первую очередь:

- `health` backend
- `health` frontend/page-module

## Что пока не нужно делать

- не покрывать каждый helper только потому, что он существует
- не строить сложные mocks/harnesses ради архитектурной чистоты тестов
- не держать лишние convenience APIs только ради тестирования
- не делать snapshot-heavy тесты без прямой пользы
- не превращать bootstrap-stage в full QA discipline

## Как выбирать, нужен ли тест

Для нового bootstrap-куска задается 3 вопроса:

1. Это public boundary?
2. Это parser/normalizer boundary?
3. Это reference slice или reference-quality fragment?

Если ответ `да` хотя бы на один вопрос, нужен хотя бы один минимальный smoke test.

Если ответ `нет` на все три вопроса, подробное тестирование можно отложить.

## Anti-Pattern

Неправильно:

- расширять public API только ради удобства тестов
- встраивать test-specific детали в канонический runtime shape
- откладывать все тесты полностью “на потом”, если слой уже объявлен reference-quality

## Практическое правило

На bootstrap-этапе мы держим **не много тестов, а правильные тесты**:

- по одному короткому smoke test на важную boundary
- без лишней тестовой инфраструктуры
- без протекания тестовых нужд в public API

## Связь с workflow

Эта политика не отменяет правило из `workflow.md`, что после code changes тесты нужно запускать.

Она уточняет только одно:

- для bootstrap-задач минимально достаточным считается smoke coverage канонических boundaries
- расширенная test strategy может быть вынесена в отдельные follow-up задачи
