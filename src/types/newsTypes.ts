// Базовый тип для ответа API
export type ApiNewsResponse = {
  CODE: number
  DATA: NewsItem[]
}

// Основной тип для элемента новости
export type NewsItem = {
  ID: string
  NAME: string
  PREVIEW_PICTURE: string
  PREVIEW_TEXT: string
  PREVIEW_TEXT_TYPE: 'text' | 'html' // предполагая возможные варианты
  [key: string]: any
}

// Опционально: можно создать более строгий тип с преобразованными данными
// для использования внутри приложения
export type TransformedNewsItem = {
  id: string
  title: string
  previewImage: string
  previewText: string
  previewTextType: 'text' | 'html'
}