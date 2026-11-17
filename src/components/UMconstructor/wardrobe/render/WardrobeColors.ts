// Цвета PIXI-элементов гардеробной системы (SceneBuilder.ts) — вынесены в
// отдельный файл, чтобы палитру можно было менять/подбирать, не трогая
// логику отрисовки. Здесь только полки и профили.
//
// Материалы (ЛДСП/стекло/металл) берутся из общего 2D-кита
// (editor-v2/render2d/palette.ts): те же цвета использует сцена тумбочки,
// чтобы одна деталь читалась одинаково на любом канвасе. Цвета самих
// профилей — только здесь, у тумбочки профилей нет.
//@ts-nocheck
import { CABINET_COLORS } from "@/components/UMconstructor/cabinet/render/CabinetGraphics.ts";
import { UM_MATERIAL_COLORS } from "@/components/UMconstructor/editor-v2/render2d/palette.ts";
import type { WardrobeFillingItem } from "@/components/UMconstructor/wardrobe/types.ts";

export const WARDROBE_COLORS = {
    shelf: {
        // Прямая (обычная) полка ЛДСП — по умолчанию.
        flat: UM_MATERIAL_COLORS.ldsp,
        // Наклонная (обувная) полка ЛДСП — другой цвет, по ТЗ пользователя.
        angled: UM_MATERIAL_COLORS.ldspDark,
        // Материал 'glass' — СВОЙ цвет (уточнение пользователя), приоритетнее
        // flat/angled независимо от типа (прямая/наклонная стеклянная полка
        // красится одинаково) — форма (flat/angled) по-прежнему влияет
        // только на геометрию (наклон), не на цвет. glassAlpha — прозрачность
        // поверх этого цвета (физически стекло полупрозрачное).
        glass: UM_MATERIAL_COLORS.glass,
        glassAlpha: UM_MATERIAL_COLORS.glassAlpha,
        // Штанга (type==='rail', уточнение пользователя) — металлический
        // цвет, отличный и от ЛДСП (оранжевый/коричневый), и от стекла
        // (синий) — своя, самостоятельная категория наполнения, не
        // разновидность полки.
        rail: UM_MATERIAL_COLORS.metal,
    },
    profile: {
        // Цвет зависит от ДВУХ независимых признаков: "семья" ('floor_ceiling'
        // | 'floor_wall' | 'wall_wall', вычисляется вызывающим кодом из
        // каталога fastenings[fasteningId].type — машинные идентификаторы в
        // каталоге (уточнение пользователя — раньше были русские строки
        // "Пол-потолок"/"Пол-стена"/"Стена-стена"), см. WardrobeSystem.
        // getWardrobeFasteningColorFamily — по ТЗ пользователя должны
        // визуально отличаться); draggable/edge
        // (внутренний перетаскиваемый профиль между секциями / статичный
        // крайний профиль по краю модуля) — светлее/темнее внутри семьи.
        'floor_ceiling': {
            draggable: { fill: '#5a8254', stroke: '#181005' },
            edge: { fill: '#2b3e28', stroke: '#181005' },
        },
        'floor_wall': {
            draggable: { fill: '#a56a6a', stroke: '#0f1a0a' },
            edge: { fill: '#704848', stroke: '#0f1a0a' },
        },
        'wall_wall': {
            draggable: { fill: '#577faa', stroke: '#0a141f' },
            edge: { fill: '#3d5875', stroke: '#0a141f' },
        },
    },
} as const;

// Выбор цвета полки/штанги по её признакам — та же логика, что раньше жила
// ТОЛЬКО инлайн внутри WardrobeSceneBuilder.createWardrobeShelf. Вынесено сюда как
// переиспользуемый чистый хелпер, чтобы WardrobeSceneBuilder.createWardrobeSector
// (нейминг "Полка N"/"Штанга N", см. editor-v2/render2d/dimensions.
// getContrastTextColor) мог получить ТОТ ЖЕ цвет заливки, на которой сидит
// подпись, не дублируя условия isRail/isGlass/isAngled в двух местах.
//
// Тумбочка рисуется отдельно (cabinet/render/CabinetGraphics.ts); здесь для неё
// только фон подписи — задняя стенка, на которой подпись и сидит.
export function getWardrobeShelfColors(shelf: Pick<WardrobeFillingItem, 'type' | 'shelfType' | 'material'>) {
    const isAngled = shelf.shelfType === 'angled'
    const isGlass = shelf.material === 'glass'
    const isRail = shelf.type === 'rail'

    if (shelf.type === 'cabinet') return { fill: CABINET_COLORS.back.fill, stroke: CABINET_COLORS.panel.stroke }

    return isRail
        ? WARDROBE_COLORS.shelf.rail
        : isGlass
            ? WARDROBE_COLORS.shelf.glass
            : (isAngled ? WARDROBE_COLORS.shelf.angled : WARDROBE_COLORS.shelf.flat);
}
