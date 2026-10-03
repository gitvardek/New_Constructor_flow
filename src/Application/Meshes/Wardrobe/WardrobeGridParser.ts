
// Гардеробная система (WARDROBE) — 3D-пайплайн, изолированный от
// BuildUniversalModule. Продукто-специфичный аналог ModulegridParser: тот не
// переиспользуется намеренно, его cells/cellsRows/extras — структура
// "коробочного" УМ (см. GridModule.moduleKind в UMtypes.ts).
//
// Читает PROPS.CONFIG.WARDROBEGRID и отдаёт плоский список профилей и полок
// в ЛОКАЛЬНЫХ координатах модуля (центр 0,0,0 — тот же нуль, что у
// WardrobeFillingMeshBuilder/ShelfBuilder/LegBuilder).
//
// Раскладка повторяет 2D (WardrobeSceneBuilder.renderWardrobeGrid): N секторов ->
// N+1 профилей, вдоль X идут профиль, сектор, профиль, ..., профиль.
// section.width — ВНУТРЕННЕЕ расстояние между профилями (сами профили в
// сектор не входят), поэтому totalWidth = sum(sections[].width) +
// (N+1)*WARDROBE_PROFILE_WIDTH — это и есть grid.width
// (= PROPS.CONFIG.SIZE.width), т.е. ПОЛНАЯ ширина модуля, а не сумма
// секторов. Прежняя формула в BuildProduct.ts (только N=1) считала SIZE.width
// шириной САМОГО СЕКТОРА и уводила профили на ~WARDROBE_PROFILE_WIDTH/2.

import { WARDROBE_PROFILE_WIDTH } from "@/Application/F-wardrobeData.ts";
import { getWardrobeFasteningColorFamily } from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import type { WardrobeCabinetConfig } from "@/components/UMconstructor/cabinet/types.ts";
import type { WardrobeFillingType, WardrobeShelfType } from "@/components/UMconstructor/wardrobe/types.ts";

export interface ParsedWardrobeProfile {
    id: number | undefined;
    x: number;
    z: number;
    height: number;
    // Тип крепления (getWardrobeFasteningColorFamily) — от него зависит,
    // нужны ли ножки снизу/сверху: у "Пол-стена" нога только снизу, см.
    // LegBuilder.buildWardrobeLegs.
    fasteningType: 'floor_ceiling' | 'floor_wall' | 'wall_wall';
    // Цвет из _COLOR (тот же каталог, что у "Настройки профилей" в 2D) —
    // для материала профиля в 3D, см. WardrobeFillingMeshBuilder.buildProfiles.
    colorId: number | undefined;
}

export interface ParsedWardrobeContent {
    id: number;
    productId: number;
    type: WardrobeFillingType;
    shelfType?: WardrobeShelfType;
    material?: 'ldsp' | 'glass';
    colorId?: number;
    positionY: number;
    railHeight?: number;
    // Параметры корпуса тумбочки (type==='cabinet'), см. cabinet/types.ts.
    cabinet?: WardrobeCabinetConfig;
    sectionIndex: number;
    sectionCenterX: number;
    sectionWidth: number;
}

export interface ParsedWardrobeGrid {
    profiles: ParsedWardrobeProfile[];
    content: ParsedWardrobeContent[];
    totalWidth: number;
}

// Без конструктора/DI (в отличие от WardrobeFillingMeshBuilder/ShelfBuilder/
// LegBuilder) — чистое преобразование данных сетки, не нуждается в доступе к
// builder/каталогу.
export class WardrobeGridParser {
    parseWardrobeGrid(grid: any): ParsedWardrobeGrid {
        const sections = grid?.sections ?? []
        const profileWidth = WARDROBE_PROFILE_WIDTH

        const totalWidth = sections.reduce((sum: number, s: any) => sum + (s.width || 0), 0)
            + (sections.length + 1) * profileWidth

        const profiles: ParsedWardrobeProfile[] = []
        const content: ParsedWardrobeContent[] = []

        let cursor = -totalWidth / 2

        for (let profileIndex = 0; profileIndex <= sections.length; profileIndex++) {
            const profileData = grid?.wardrobeProfiles?.[profileIndex]

            profiles.push({
                id: profileData?.id,
                x: cursor + profileWidth / 2,
                z: 0, // TODO: смещение к стене/относительно глубины модуля не уточнено (см. WARDROBE_MODEL_DATA.ts)
                height: profileData?.height ?? grid.height,
                fasteningType: getWardrobeFasteningColorFamily(grid.productID, profileData?.fasteningId),
                colorId: profileData?.colorId,
            })
            cursor += profileWidth

            const section = sections[profileIndex]
            if (!section) continue

            const sectionCenterX = cursor + section.width / 2

            const items = section.wardrobeFilling ?? []

            items.forEach((element: any) => {
                content.push({
                    id: element.id,
                    productId: element.productId,
                    type: element.type ?? 'shelf',
                    shelfType: element.shelfType,
                    material: element.material,
                    colorId: element.colorId,
                    positionY: element.positionY,
                    railHeight: element.railHeight,
                    cabinet: element.cabinet,
                    sectionIndex: profileIndex,
                    sectionCenterX,
                    sectionWidth: section.width,
                })
            })

            cursor += section.width
        }

        return { profiles, content, totalWidth }
    }
}
