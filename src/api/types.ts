import { components, paths } from "./schema";

// ===== TABS API TYPES =====

// Узел дерева табов для обучения
export type TabNode = components["schemas"]["TabNode"];

export type NodeId = TabContent['id'];

// Контент таба с текстом, изображениями, видео и ссылками
export type TabContent = components["schemas"]["TabContent"];

//TODO!!! Отчет об ошибке для отправки
export type ErrorReport = paths["/api/modeller/message/senderror/"]["post"]["requestBody"]["content"]["application/json"];

// ===== AUTH API TYPES =====

// Данные для входа в систему (логин/пароль)
export type LoginData = components["schemas"]["LoginData"];

// Данные для получения информации пользователя по токену
export type TokenData = components["schemas"]["TokenData"];

// Ответ от API аутентификации
export type ApiResponse = components["schemas"]["ApiResponse"];

// ===== CATALOG API TYPES =====

// Ответ каталога с товарами, пагинацией и секциями
export type CatalogResponse = components["schemas"]["CatalogResponse"];

// Элемент товара в каталоге
export type ProductItem = components["schemas"]["ProductItem"];

// Секция каталога
export type CatalogSectionItem = components["schemas"]["CatalogSectionItem"];

// Данные для запроса информации о товаре
export type ProductRequestData = components["schemas"]["ProductRequestData"];

// Ответ с деталями товара
export type ProductDetailsResponse = components["schemas"]["ProductDetailsResponse"];

// Ответ с ценой товара
export type ProductPriceResponse = components["schemas"]["ProductPriceResponse"];

//TODO ===== ERROR TYPES =====

// Стандартная ошибка API
export type Error = components["schemas"]["Error"];