// @ts-nocheck

// ЧЕРНОВИК: константы + временная модель товара "Гардеробная система"
// (15342627). Товар ссылается на модель 3954678 ("Новый нестандартный
// модуль")
//
// WARDROBE_MODEL_DATA внизу — тот же формат (json.items, токены #X#/#Y#/#Z#,
// см. BuildersHelper.createModelData), но с профилями вместо стенок. Описывает
// только N=1 и больше не используется: на произвольное N профили строятся
// процедурно (WardrobeFillingMeshBuilder.buildProfiles).
//
// Раскладка: N секторов → N+1 профилей (профиль — граница сектора).
//
// Ширина сектора из каталога: MIN/MAX —
// _WARDROBE_SYSTEM[15342627].product.sections.width ({min:200,max:900}),
// стартовая (при 1 секторе = вся ширина модуля) — _PRODUCTS[15342627].width.
export const WARDROBE_SECTION_WIDTH_MIN = 200
export const WARDROBE_SECTION_WIDTH_MAX = 900
export const WARDROBE_START_WIDTH = 600

// Отступ (px) от модуля до края канваса — резерв под числовые обозначения
// (WardrobeDimensions.ts/SceneBuilder.ts), которые иначе обрезались границей
// канваса.
//
// (Render2D.vue::updateTotalSize, SceneBuilder.ts::renderGrid
// стартует xOffset/yOffset отсюда), расчёт мм/px для
// драга (DividerDragEngine.getMmHeight/getMmWidth) завязан на ГЛОБАЛЬНОЕ
// соотношение канваса, а не на масштаб контейнера — при Container.scale
// визуальная позиция полки и посчитанная из дельты мыши разъехались бы.
// Смещение на дельты не влияет. Только для wardrobe, box-UM использует 0.
export const WARDROBE_CANVAS_PADDING_PX = 30

// Кол-во секторов — _WARDROBE_SYSTEM[15342627].product.sections.quantity ({min:"1",max:"3"})
export const WARDROBE_SECTIONS_QUANTITY_MIN = 1
export const WARDROBE_SECTIONS_QUANTITY_MAX = 3

// Сечение профиля (см. предположения ниже про ориентацию осей)
export const WARDROBE_PROFILE_WIDTH = 25   // ось X

// Общая высота регулировочной ножки (LegBuilder.createWardrobeLeg + 2D-рендер
// профилей в SceneBuilder.ts — держим одно число на обе стороны)
export const WARDROBE_LEG_HEIGHT = 45
export const WARDROBE_PROFILE_DEPTH = 50   // ось Z (глубина в сцене)

// Угол наклона наклонной (обувной) полки. Общий для 2D
// (WardrobeSystem.getWardrobeShelfPixiHeight) и 3D
// (ShelfBuilder.buildWardrobeAngledShelf) — раньше жил хардкодом только в 3D.
export const WARDROBE_ANGLED_SHELF_ANGLE_DEG = 14

// Высота (мм) оси поворота наклонной полки НАД НИЗОМ кронштейна (измерено на
// 3D-модели). Ключевое отличие от прямой полки: та ЛЕЖИТ на верхней
// точке кронштейна, а наклонная поворачивается вокруг оси ВНУТРИ его тела
// (сам кронштейн — WARDROBE_SHELF_BRACKET_HEIGHT_ANGLED). Отсюда для
// неглубоких полок габарит задаёт кронштейн, а не доска — см.
// WardrobeSystem.getWardrobeAngledShelfProjection.
export const WARDROBE_ANGLED_SHELF_PIVOT_HEIGHT = 50.5

// Минимальный зазор (мм) между полками сектора — РАЗНЫЙ у прямой и
// наклонной (см. WardrobeSystem.getWardrobeShelfMinGap): у прямой берётся
// как есть, у наклонной это базовый порог формулы, зависящей ещё и от её
// "высоты PIXI-элемента".
export const WARDROBE_SHELF_MIN_GAP_FLAT = 52
// 74 = 68 (высота кронштейна наклонной) + по 2мм сверху
// и снизу. Порог завышен на кронштейн намеренно: в 2D он отдельно не
// рисуется, поэтому короткие/неглубокие наклонные полки должны получать
// зазор с запасом под физически существующий крепёж.
export const WARDROBE_SHELF_MIN_GAP_ANGLED = 74

// Крепёжный кронштейн полки — рисуется в 3D
// (ShelfBuilder.buildWardrobeShelfBrackets, по 2 на полку у профилей
// сектора). 4мм поперёк сектора (X), 50мм по глубине (Z, вровень с WARDROBE_PROFILE_DEPTH).
export const WARDROBE_SHELF_BRACKET_WIDTH = 4    // ось X (поперёк сектора)
export const WARDROBE_SHELF_BRACKET_DEPTH = 50   // ось Z (глубина)

// Высота кронштейна ПРЯМОЙ полки — выводится из зазора между прямыми полками
// по той же схеме, что и у наклонной (74 = 68 + отступы): этот зазор и есть
// место под кронштейн верхней полки. Доска ЛЕЖИТ на нём сверху, поэтому
// кронштейн занимает [positionY - высота, positionY].
export const WARDROBE_SHELF_BRACKET_HEIGHT_FLAT = WARDROBE_SHELF_MIN_GAP_FLAT - 2

// Высота кронштейна НАКЛОННОЙ полки 
export const WARDROBE_SHELF_BRACKET_HEIGHT_ANGLED = 68.8

// Минимальный зазор (мм) для штанги —  штанга СВЕРХУ полки
// требует только своих 2мм, а штанга СНИЗУ добавляет их СВЕРХ собственного
// отступа полки — полка над ней сохраняет своё требование к пространству.
export const WARDROBE_RAIL_MIN_GAP = 2


export const WARDROBE_MODEL_DATA = {
    id: "WARDROBE_TEMP_MODEL",
    name: "Гардеробная система — 1 сектор, 2 профиля (черновик)",
    json: {
        material: {
            type: "MeshLambertMaterial",
            opt: {
                color: 16777215,
            },
        },
        items: [
            {
                id: "profile_1",   // левая граница сектора 1
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: {
                        x: WARDROBE_PROFILE_WIDTH,
                        y: "#Y#",   // длина профиля — переменная, = высоте модуля/системы
                        z: WARDROBE_PROFILE_DEPTH,
                    },
                },
                rotation: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                position: {
                    x: `(-#X#/2) - ${WARDROBE_PROFILE_WIDTH / 2}`,
                    y: 0,   // по центру высоты — профиль тянется от пола до потолка (box центрирован)
                    z: 0,  
                },
            },
            {
                id: "profile_2",   // правая граница сектора 1
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: {
                        x: WARDROBE_PROFILE_WIDTH,
                        y: "#Y#",
                        z: WARDROBE_PROFILE_DEPTH,
                    },
                },
                rotation: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                position: {
                    x: `(#X#/2) + ${WARDROBE_PROFILE_WIDTH / 2}`,
                    y: 0,
                    z: 0,
                },
            },
        ],
    },
    type_label: "",
    type: null,
    shininess: 10,
    material: null,
    color: null,
    DAE: null,
    file: null,
    model_type: "",
    scale: 1,
    width: null,
    height: null,
    depth: null,
    corr_x: null,
    corr_y: null,
    corr_z: null,
    loop_position: null,
    loop_model: null,
    wall_thickness: 18,
}
