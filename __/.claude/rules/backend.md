---
globs: ["apps/api/**/*.ts"]
---

# Backend Rules

- Backend baseline: `NestJS + Fastify`
- Архитектура по умолчанию: `Controller -> Service -> Repository`
- NEVER держать бизнес-логику в controller
- NEVER обращаться к БД напрямую из service
- Входящие данные валидируются через `Zod / nestjs-zod`
- Все endpoint-ы защищены `KeycloakGuard`, если не помечены как публичные явно
- Списки используют общую пагинацию
- Фильтрация и сортировка идут через общие pipes и whitelist полей
- Soft delete обязателен
- Audit поля заполняются через `AuditContext`
- Не использовать `throw new Error()` там, где нужен осмысленный exception
- Env читается только через `@my-app/configs`; прямой `process.env` в `apps/api/**` запрещён
- Исключение: `NEXT_PUBLIC_*` переменные в `apps/web/**` читаются напрямую — они compile-time константы Next.js, не runtime env
