---
globs: ["apps/api/src/auth/**/*.ts", "packages/contracts/common/auth.yaml"]
---

# Auth Rules

- Auth только через Keycloak OIDC
- NEVER реализовывать собственную auth-логику вместо Keycloak
- `SessionUser` отделён от `User`
- `displayName` вычисляется на backend boundary
- Guard валидирует claims и материализует auth context
- Lazy sync пользователя не размазывается по feature endpoint-ам
- Роли и permissions берутся из token claims или из отдельного permission layer, если он явно введён
