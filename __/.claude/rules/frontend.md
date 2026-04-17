---
globs: ["apps/web/**/*.tsx", "apps/web/**/*.ts"]
---

# Frontend Rules

- Frontend baseline: `Next.js + React + TypeScript`
- Компоненты отвечают за отображение и использование hooks
- NEVER делать прямые API-вызовы в компонентах
- Серверное состояние хранится в `TanStack Query`
- Клиентское состояние хранится в `Zustand`
- NEVER смешивать серверный и клиентский state
- Типы импортируются из `@my-app/api-client`
- Тексты не хардкодятся в компонентах
- Числа и UI/runtime constants берутся из config или settings
- Для маппинга использовать lookup tables, а не цепочки `if/else`
