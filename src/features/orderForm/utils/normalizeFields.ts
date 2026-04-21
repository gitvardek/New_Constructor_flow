import type { RawFields, NormalizedFields } from "../types/form.types";

export function normalizer(raw: RawFields[]): NormalizedFields[] {

    const toBool = (v: unknown): boolean | undefined => {
        if (v === undefined || v === null) return undefined
        if (v === true || v === false) return v
        if (v === 'Y' || v === 'y') return true
        if (v === 'N' || v === 'n') return false
        if (v === 1 || v === '1') return true
        if (v === 0 || v === '0') return false
        return undefined
    }

    const toNumber = (v: unknown): number | undefined => {
        if (v === undefined || v === null || v === '') return undefined
        if (typeof v === "number") return Number.isFinite(v) ? v : undefined
        const n = Number(v)
        return Number.isFinite(n) ? n : undefined
    }

    return raw.map((f) => {
        const required = toBool(f.REQUIED)
        const multiple = toBool(f.MULTIPLE)

        // две строчки ниже пересмотреть потом
        const defaultValueRaw = f.DEFAULT_VALUE ?? f.DEFAULT_VALUE_ORIG
        let defaultValue: any = defaultValueRaw 

        if (f.TYPE === 'CHECKBOX') {
            defaultValue = toBool(defaultValueRaw) ?? false
        }

        if (f.TYPE === 'SELECT') {
            defaultValue = toNumber(defaultValueRaw) ?? 0
        }

        if (['TEXT', 'PHONE', 'TEXTAREA', 'ADDRESS_YA', 'DATE'].includes(f.TYPE)) {
            defaultValue =
                defaultValueRaw === false || defaultValueRaw === null || defaultValueRaw === undefined
                    ? ''
                    : String(defaultValueRaw)
        }

        const min = toNumber(f.MIN)
        const max = toNumber(f.MAX)

        const options = Array.isArray(f.OPTIONS)
            ? f.OPTIONS
                .map((x) => toNumber(x))
                .filter((x): x is number => x !== undefined)
            : []
        
        if (f.CODE === 'service_tech') {
            defaultValue = ''
        }

        return {
            ID: String(f.ID ?? ''),
            NAME: String(f.NAME ?? ''),
            CODE: String(f.CODE ?? ''),
            TYPE: f.TYPE,
            REQUIED: required,
            DEFAULT_VALUE: defaultValue ?? "",
            OPTIONS: options,
            MULTIPLE: multiple,
            MIN: min,
            MAX: max,
            DESCRIPTION: String(f.DESCRIPTION ?? ""),
            META: f.META && typeof f.META === 'object' ? f.META : undefined

        }
    })
}