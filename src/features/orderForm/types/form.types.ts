export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'PHONE'
  | 'CHECKBOX'
  | 'SELECT'
  | 'DATE'
  | 'FILE'
  | 'ADDRESS_YA'

export interface RawFields {
    ID: string
    NAME: string
    CODE: string
    TYPE: FieldType
    REQUIED?: 'Y' | 'N'
    DEFAULT_VALUE?: any
    DEFAULT_VALUE_ORIG?: any
    OPTIONS?: unknown[]
    MULTIPLE?: 'Y' | 'N'
    MIN?: number | string
    MAX?: number | string
    DESCRIPTION?: string
    META?: Record<string, unknown>
}

export interface NormalizedFields {
    ID: string
    NAME: string
    CODE: string
    TYPE: FieldType
    REQUIED?: boolean
    DEFAULT_VALUE: any
    OPTIONS?: number[]
    MULTIPLE?: boolean
    MIN?: number
    MAX?: number
    DESCRIPTION: string
    META?: Record<string, unknown>
}