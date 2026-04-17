---
globs: ["apps/**/*.ts", "packages/**/*.ts"]
---

# Testing Rules

- После code changes запускать релевантные проверки
- Перед завершением серии code changes запускать `pnpm test`
- Новые backend slices должны иметь backend tests
- Новые frontend slices должны иметь хотя бы минимальный verification signal
- Review не считается заменой тестов
- Если что-то не удалось прогнать, это нужно писать явно
