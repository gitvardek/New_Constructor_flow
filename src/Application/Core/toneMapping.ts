import * as THREE from "three"

export type TToneMappingItem = {
    value: number
    label: string
}

// Режимы тонового отображения three.js. CustomToneMapping сюда не входит: он работает
// только вместе с собственным шейдером в THREE.ShaderChunk.tonemapping_pars_fragment,
// а без него кадр получается чёрным
export const TONE_MAPPING_LIST: TToneMappingItem[] = [
    { value: THREE.NoToneMapping, label: "Без тонирования" },
    { value: THREE.LinearToneMapping, label: "Linear" },
    { value: THREE.ReinhardToneMapping, label: "Reinhard" },
    { value: THREE.CineonToneMapping, label: "Cineon" },
    { value: THREE.ACESFilmicToneMapping, label: "ACES Filmic" },
    { value: THREE.AgXToneMapping, label: "AgX" },
    { value: THREE.NeutralToneMapping, label: "Neutral" },
]

export const DEFAULT_TONE_MAPPING = THREE.ReinhardToneMapping

// Проекты, сохранённые до появления параметра, а также значения вне списка приводим
// к режиму по умолчанию
export const normalizeToneMapping = (value: unknown): number => {
    const found = TONE_MAPPING_LIST.find(item => item.value === Number(value))

    return found ? found.value : DEFAULT_TONE_MAPPING
}

export const getToneMappingLabel = (value: unknown): string =>
    TONE_MAPPING_LIST.find(item => item.value === Number(value))?.label
    ?? TONE_MAPPING_LIST.find(item => item.value === DEFAULT_TONE_MAPPING)!.label
