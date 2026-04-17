---
globs: ["packages/contracts/**/*.yaml"]
---

# Contracts Rules

- Контракт пишется до кода.
- После изменения контракта запускается `pnpm generate:api`.
- Схемы переиспользуются через `$ref`, без дублирования.
- Все списки используют `PaginatedResponse`.
- Все ошибки используют `ApiError` c `errorCode`.
- `PATCH` контракты содержат только optional поля.
- `DELETE` возвращает `SuccessResponse` или `EmptyResponse`.
