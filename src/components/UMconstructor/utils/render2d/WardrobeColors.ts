// Цвета PIXI-элементов гардеробной системы (SceneBuilder.ts) — вынесены в
// отдельный файл, чтобы палитру можно было менять/подбирать, не трогая
// логику отрисовки. Пока только полки и профили (единственные вручную
// подбираемые цвета в этой системе на сегодня); box-UM цвета (PixiMethods.ts
// Shape/Section) сюда сознательно не перенесены — общий, давно стабильный
// код, не относится к гардеробной системе.
//@ts-nocheck

export const WARDROBE_COLORS = {
    shelf: {
        // Прямая (обычная) полка ЛДСП — по умолчанию.
        flat: { fill: '#eea557', stroke: '#181005' },
        // Наклонная (обувная) полка ЛДСП — другой цвет, по ТЗ пользователя.
        angled: { fill: '#9c785e', stroke: '#050301' },
        // Материал 'glass' — СВОЙ цвет (уточнение пользователя), приоритетнее
        // flat/angled независимо от типа (прямая/наклонная стеклянная полка
        // красится одинаково) — форма (flat/angled) по-прежнему влияет
        // только на геометрию (наклон), не на цвет. glassAlpha — прозрачность
        // поверх этого цвета (физически стекло полупрозрачное).
        glass: { fill: '#80bdfd', stroke: '#0a1e33' },
        glassAlpha: 0.55,
        // Штанга (kind==='rail', уточнение пользователя) — металлический
        // цвет, отличный и от ЛДСП (оранжевый/коричневый), и от стекла
        // (синий) — своя, самостоятельная категория наполнения, не
        // разновидность полки.
        rail: { fill: '#c4c8cc', stroke: '#5a5e63' },
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
// ТОЛЬКО инлайн внутри SceneBuilder.createWardrobeShelf. Вынесено сюда как
// переиспользуемый чистый хелпер, чтобы SceneBuilder.createWardrobeSector
// (нейминг "Полка N"/"Штанга N", см. WardrobeDimensions.
// getContrastTextColor) мог получить ТОТ ЖЕ цвет заливки, на которой сидит
// подпись, не дублируя условия isRail/isGlass/isAngled в двух местах.
export function getWardrobeShelfColors(shelf: { type: 'flat' | 'angled'; material?: 'ldsp' | 'glass'; kind?: 'shelf' | 'rail' }) {
    const isAngled = shelf.type === 'angled'
    const isGlass = shelf.material === 'glass'
    const isRail = shelf.kind === 'rail'

    return isRail
        ? WARDROBE_COLORS.shelf.rail
        : isGlass
            ? WARDROBE_COLORS.shelf.glass
            : (isAngled ? WARDROBE_COLORS.shelf.angled : WARDROBE_COLORS.shelf.flat);
}
