// @ts-nocheck

// Общие хелперы гардеробной системы для UM-конструктора и загрузки продукта.
//
// Сетка лежит под ОТДЕЛЬНЫМ ключом CONFIG.WARDROBEGRID, а не MODULEGRID:
// последний одновременно триггерит открытие 2D-панели (The3D.vue) И выбор
// BuildUniversalModule для 3D-сборки (RoomManager.ts, isUM), т.е.
// переиспользование ключа молча отменило бы отдельный 3D-пайплайн
// гардеробной системы.

import { useModelState } from "@/store/appliction/useModelState.ts";
import { WARDROBE_ANGLED_SHELF_ANGLE_DEG, WARDROBE_ANGLED_SHELF_PIVOT_HEIGHT, WARDROBE_SHELF_MIN_GAP_FLAT, WARDROBE_SHELF_MIN_GAP_ANGLED, WARDROBE_SHELF_BRACKET_HEIGHT_ANGLED, WARDROBE_RAIL_MIN_GAP } from "@/Application/F-wardrobeData.ts";

export const WARDROBE_GRID_CONFIG_KEY = 'WARDROBEGRID' as const;

// Товар — "гардеробная система", если есть запись в каталоге
// _WARDROBE_SYSTEM. Проверка по каталогу, а не по сравнению с ID модели —
// тот же принцип, что у isTsargaCapableProduct в Tsarga.ts.
export function isWardrobeSystemProduct(productId: number | null | undefined): boolean {
    if (!productId) return false;
    return !!useModelState()._WARDROBE_SYSTEM[productId];
}

// Активная сетка продукта независимо от ключа хранения, плюс сам ключ —
// чтобы не дублировать "CONFIG.MODULEGRID || CONFIG.WARDROBEGRID" по всем
// вызывающим (The3D.vue, MainView.vue, UMconstructor.vue, Events.ts).
export function getUMGridFromConfig(CONFIG: any): {
    key: typeof WARDROBE_GRID_CONFIG_KEY | 'MODULEGRID';
    grid: any;
} {
    if (CONFIG?.MODULEGRID) return { key: 'MODULEGRID', grid: CONFIG.MODULEGRID };
    if (CONFIG?.[WARDROBE_GRID_CONFIG_KEY]) return { key: WARDROBE_GRID_CONFIG_KEY, grid: CONFIG[WARDROBE_GRID_CONFIG_KEY] };
    return { key: 'MODULEGRID', grid: undefined };
}

// Материалы ЛДСП для конкретной полки-товара: _WARDROBE_SYSTEM[...].shelf[
// shelfProductId].fasade (ID-строки), развёрнутые через _FASADE в
// {id, name, depth}. depth = _FASADE[id].DEPTH — реальная толщина полки для
// этого материала (используется в 3D вместо дефолтных 18мм).
export function getWardrobeShelfColorOptions(
    wardrobeProductId: number,
    shelfProductId: number,
): { id: number; name: string; depth: number }[] {
    const modelState = useModelState();
    const fasadeIds: (string | number)[] =
        modelState._WARDROBE_SYSTEM[wardrobeProductId]?.shelf?.[shelfProductId]?.fasade ?? [];

    return fasadeIds
        .map((rawId) => {
            const id = Number(rawId);
            const fasade = modelState._FASADE[id];
            if (!fasade) return null;
            return { id, name: fasade.NAME ?? `Материал ${id}`, depth: fasade.DEPTH ?? 18 };
        })
        .filter(Boolean);
}

// Тот же список, что getWardrobeShelfColorOptions, но сырыми объектами
// _FASADE (.ID/.NAME/.PREVIEW_PICTURE) — формат, который ожидает
// MaterialSelector.vue (как в CorpusMaterialRedactor.vue).
export function getWardrobeShelfMaterials(
    wardrobeProductId: number,
    shelfProductId: number,
): any[] {
    const modelState = useModelState();
    const fasadeIds: (string | number)[] =
        modelState._WARDROBE_SYSTEM[wardrobeProductId]?.shelf?.[shelfProductId]?.fasade ?? [];

    return fasadeIds
        .map((rawId) => modelState._FASADE[Number(rawId)])
        .filter(Boolean);
}

// Товары-профили для списка "Тип профиля" (WardrobeProfilesView.vue).
// _WARDROBE_SYSTEM[...].profile — СЛОВАРЬ по id товара
// ({"13100847": {id, name, width, colors}}), а не плоский объект с .colors.
// Сегодня товар один, но их может стать больше — отсюда список.
export function getWardrobeProfileProducts(wardrobeProductId: number): any[] {
    const modelState = useModelState();
    const profiles = modelState._WARDROBE_SYSTEM[wardrobeProductId]?.profile ?? {};
    return Object.values(profiles);
}

// Варианты крепления профиля — _WARDROBE_SYSTEM[...].fastenings (словарь по
// id: {id, name, type, height:{min,max}, depth:{min,max}}). В UI это
// "Крепление профиля"; раньше называлось "Тип профиля" с захардкоженным
// списком Потолок/Стена, теперь читается из каталога.
export function getWardrobeProfileFastenings(wardrobeProductId: number): any[] {
    const modelState = useModelState();
    const fastenings = modelState._WARDROBE_SYSTEM[wardrobeProductId]?.fastenings ?? {};
    return Object.values(fastenings);
}

// Допустимый диапазон высоты профиля для КОНКРЕТНОГО крепления (fastenings[
// fasteningId].height.min/max — в каталоге строки, приводим к числу). Если
// крепление не найдено — откат на объединение диапазонов всех примеров из
// чата (500-3090).
export function getWardrobeProfileHeightRange(
    wardrobeProductId: number,
    fasteningId: number | null | undefined,
): { min: number; max: number } {
    const modelState = useModelState();
    const fastening = modelState._WARDROBE_SYSTEM[wardrobeProductId]?.fastenings?.[fasteningId];
    if (!fastening?.height) return { min: 500, max: 3090 };
    return { min: Number(fastening.height.min), max: Number(fastening.height.max) };
}

// type крепления, нормализованный (trim + нижний регистр). Каталог отдаёт
// машинные идентификаторы floor_wall/floor_ceiling/wall_wall, но реально
// встречались с лишним пробелом и в разном регистре (" Floor_ceiling"), так
// что сравнивать напрямую нельзя; сам type тоже может отсутствовать.
function normalizedFasteningType(fastening: any): string {
    return (fastening?.type ?? '').trim().toLowerCase();
}

// Наибольший depth.max среди креплений, РЕАЛЬНО назначенных профилям этого
// грида сейчас (grid.wardrobeProfiles[].fasteningId). Общая часть
// getWardrobeMaxDepth/getWardrobeProfileMaxDepth — чтобы правило приоритета
// не дублировалось.
//
// Приоритет у типов, упирающихся в стену (floor_wall/wall_wall): если хоть
// один профиль использует такое крепление — берём наибольший depth.max
// среди них; иначе откат на floor_ceiling по тому же правилу. undefined,
// если ни одного из трёх типов у профилей грида нет.
function getWardrobeInstalledFasteningDepthMax(grid: any): number | undefined {
    const modelState = useModelState();
    const wardrobeProductId = grid?.productID;
    const fastenings = modelState._WARDROBE_SYSTEM[wardrobeProductId]?.fastenings ?? {};

    const usedFastenings: any[] = (grid?.wardrobeProfiles ?? [])
        .map((p: any) => fastenings[p.fasteningId])
        .filter(Boolean);

    const maxDepthOf = (list: any[]): number | undefined => {
        const values = list.map((f) => f?.depth?.max).filter((v) => v != null).map(Number);
        return values.length ? Math.max(...values) : undefined;
    };

    const wallUsed = usedFastenings.filter((f) => normalizedFasteningType(f) === 'floor_wall' || normalizedFasteningType(f) === 'wall_wall');
    return wallUsed.length
        ? maxDepthOf(wallUsed)
        : maxDepthOf(usedFastenings.filter((f) => normalizedFasteningType(f) === 'floor_ceiling'));
}

// Промежуточный шаг getWardrobeProfileMaxDepth, НЕ самостоятельное
// UI-понятие: вылет установленных креплений + сечение профиля
// (profile[...].depth). Источник ДИНАМИЧЕСКИЙ
// (getWardrobeInstalledFasteningDepthMax), а не CONFIG.SIZE_EDIT и не любые
// записи fastenings из каталога — иначе значение не менялось бы при смене
// крепления профилей (запись "Пол-стена" в каталоге товара есть всегда).
// Каталожные значения приходят строками, приводим к числу. undefined — на
// тех же условиях, что у getWardrobeInstalledFasteningDepthMax.
export function getWardrobeMaxDepth(grid: any): number | undefined {
    const fasteningMax = getWardrobeInstalledFasteningDepthMax(grid);
    if (fasteningMax == null) return undefined;

    const modelState = useModelState();
    const wardrobeProductId = grid?.productID;
    const profileProductId = grid?.wardrobeProfiles?.[0]?.profileProductId;
    const profileDepth = modelState._WARDROBE_SYSTEM[wardrobeProductId]?.profile?.[profileProductId]?.depth;
    return fasteningMax + (Number(profileDepth) || 0);
}

// Максимальная ГЛУБИНА ПРОФИЛЯ — единственное UI-понятие "макс. глубина":
// и поле "Глубина" (ModuleSizeView.vue), и предел длины полок считаются
// через неё одинаково (изначально их разводили, потом унифицировали).
// = getWardrobeMaxDepth + ЕЩЁ РАЗ вылет креплений, т.е. вылет + профиль +
// вылет (пример: 300 + 250 = 550). undefined — как у getWardrobeMaxDepth.
export function getWardrobeProfileMaxDepth(grid: any): number | undefined {
    const moduleMaxDepth = getWardrobeMaxDepth(grid);
    const fasteningMax = getWardrobeInstalledFasteningDepthMax(grid);
    if (moduleMaxDepth == null || fasteningMax == null) return undefined;

    return moduleMaxDepth + fasteningMax;
}

// РЕАЛЬНАЯ (текущая) длина полки, мм = РОВНО grid.depth: она сама по себе
// полная (вылет + профиль 50 + вылет), как и :max этого поля в UI
// (getWardrobeProfileMaxDepth — та же тройка).
//
// Две прошлых ошибки: getWardrobeProfileMaxDepth (ПОТОЛОК) не реагировал на
// правку поля "Глубина", а grid.depth + вылет считал вылет ДВАЖДЫ — 2D рисовал
// проекцию наклонной полки от 800 вместо 500 и расходился с 3D.
//
// Функция оставлена как именованное понятие "длина полки" (~8 вызывающих) —
// единая точка правки, если состав глубины снова уточнится.
export function getWardrobeShelfDepth(grid: any): number {
    return grid?.depth || 0;
}

// "Семья" цвета профиля в 2D (WardrobeColors.ts рисует Потолок/Стена/
// Стена-стена разными цветами). Берётся из fastenings[...].type, а НЕ из
// name: они в каталоге расходятся (встречалось name:"стена стена" при
// type:"floor_ceiling"). Откат на 'floor_wall' для нераспознанного или
// отсутствующего крепления.
export function getWardrobeFasteningColorFamily(
    wardrobeProductId: number,
    fasteningId: number | null | undefined,
): 'floor_ceiling' | 'floor_wall' | 'wall_wall' {
    const modelState = useModelState();
    const fastening = modelState._WARDROBE_SYSTEM[wardrobeProductId]?.fastenings?.[fasteningId];
    const type = normalizedFasteningType(fastening);
    if (type === 'floor_ceiling') return 'floor_ceiling';
    if (type === 'wall_wall') return 'wall_wall';
    return 'floor_wall';
}

// Список доступных цветов КОНКРЕТНОГО товара-профиля — colors лежит НЕ
// плоско на .profile, а на записи товара-профиля внутри него
// (_WARDROBE_SYSTEM[wardrobeProductId].profile[profileProductId].colors,
// массив ID-строк, тот же паттерн, что shelf[...].fasade), развёрнутых
// через _COLOR (не _FASADE — тот же каталог, что уже используют обычные
// УМ-профили, PROFILECOLOR, см. SidecolorsView.vue/FillingMeshBuilder.ts).
// Формат — сырые объекты каталога, для MaterialSelector.vue.
export function getWardrobeProfileMaterials(wardrobeProductId: number, profileProductId: number): any[] {
    const modelState = useModelState();
    const colorIds: (string | number)[] =
        modelState._WARDROBE_SYSTEM[wardrobeProductId]?.profile?.[profileProductId]?.colors ?? [];

    return colorIds
        .map((rawId) => modelState._COLOR[Number(rawId)])
        .filter(Boolean);
}

// Группы наполнения вкладки "Наполнение" -> "Вставка" (кроме "Полки" — та
// отдельный, всегда видимый элемент). Тот же путь, что у box-UM
// RightPanelView.vue::getFillings (_PRODUCTS[...].FILLING_SECTION ->
// _SECTIONS[groupID].PRODUCTS -> _PRODUCTS[itemId]), только через
// useModelState — как остальные хелперы этого файла. Формат результата тот
// же, [{groupName, groupID, items}], но element.groupID у объектов каталога
// НЕ мутируется: читать это сейчас некому (WardrobeInsertView.vue только
// отображает список).
//
// ВРЕМЕННЫЙ откат: FILLING_SECTION у товара пуст, поэтому пока используется
// захардкоженная группа "Аксессуары для шкафов". Убрать, как только
// FILLING_SECTION начнёт возвращать группы.
const WARDROBE_FALLBACK_FILLING_GROUP_IDS = [6174300];

export function getWardrobeFillingsGroups(wardrobeProductId: number): {
    groupName: string;
    groupID: number;
    items: any[];
}[] {
    const modelState = useModelState();
    const fillingSection = modelState._PRODUCTS[wardrobeProductId]?.FILLING_SECTION;
    const realGroupIds = fillingSection && typeof fillingSection === 'object' ? Object.keys(fillingSection) : [];
    const groupIds = realGroupIds.length ? realGroupIds : WARDROBE_FALLBACK_FILLING_GROUP_IDS;

    const result = groupIds
        .map((groupID) => {
            const fillingsGroup = modelState._SECTIONS[groupID];
            if (!fillingsGroup?.PRODUCTS) return null;

            return {
                groupName: fillingsGroup.NAME,
                groupID: fillingsGroup.ID,
                items: fillingsGroup.PRODUCTS
                    .map((itemId: any) => modelState._PRODUCTS[itemId])
                    .filter(Boolean),
            };
        })
        .filter(Boolean);

    console.log(result, "result")

    return result
}

// "Монтажная высота" сектора — до какой высоты в нём вообще можно ставить
// полки. Это МЕНЬШАЯ из высот двух ограничивающих профилей
// (wardrobeProfiles[secIndex] и [secIndex+1]): полка висит на обоих, и выше
// верха короткого держаться ей не на чем. GridModule.height здесь не
// годится — это максимум по ВСЕМ профилям модуля (UMconstructorClass.reset).
export function getWardrobeSectionInstallableHeight(grid: any, secIndex: number): number {
    const left = grid.wardrobeProfiles?.[secIndex];
    const right = grid.wardrobeProfiles?.[secIndex + 1];
    const heights = [left?.height, right?.height].filter((h) => typeof h === 'number');

    if (!heights.length) return grid.height;
    return Math.min(...heights);
}

// Товар-полка с type === 'glass' в _WARDROBE_SYSTEM[...].shelf. У стекла
// ОТДЕЛЬНЫЙ товар от ЛДСП, из него берётся реальная толщина
// (_PRODUCTS[id].height). На добавление полок не влияет — там по-прежнему
// один WARDROBE_SHELF_PRODUCT_ID (createWardrobeGrid.ts), речь только о
// толщине.
function getWardrobeGlassShelfProductId(wardrobeProductId: number): number | undefined {
    const modelState = useModelState();
    const shelves: any[] = Object.values(modelState._WARDROBE_SYSTEM[wardrobeProductId]?.shelf ?? {});
    return shelves.find((s: any) => s?.type === 'glass')?.id;
}

// Толщина полки, мм:
// - ЛДСП (и когда material/wardrobeProductId не переданы) —
//   _FASADE[colorId].DEPTH, откат 18мм;
// - СТЕКЛО — _PRODUCTS[<товар-полка type:"glass">].height. У стеклянной
//   полки colorId не выставляется вовсе (материал для неё не выбирается),
//   поэтому откат на _FASADE для неё неприменим.
export function getWardrobeShelfThickness(
    colorId: number | null | undefined,
    material?: 'ldsp' | 'glass',
    wardrobeProductId?: number,
): number {
    if (material === 'glass' && wardrobeProductId != null) {
        const glassProductId = getWardrobeGlassShelfProductId(wardrobeProductId);
        const glassHeight = glassProductId != null ? useModelState()._PRODUCTS[glassProductId]?.height : undefined;
        console.log(glassHeight, 'glassHeight')

        if (glassHeight != null) return Number(glassHeight);
    }

    if (!colorId) return 18;
    const fasade = useModelState()._FASADE[colorId];
    return fasade?.DEPTH ?? 18;
}

// Геометрия наклонной полки — ОДИН источник для 2D
// (getWardrobeShelfPixiHeight) и 3D (ShelfBuilder.buildWardrobeAngledShelf).
//
// Полка не лежит на кронштейне сверху (как прямая), а поворачивается вокруг
// оси на WARDROBE_ANGLED_SHELF_PIVOT_HEIGHT над его низом; в 2D кронштейн
// отдельно не рисуется, поэтому входит в эту высоту.
//
//  1. shelfProjection — проекция полки БЕЗ толщины: depthMm × sin(угол).
//  2. frontEdgeProjection — проекция переднего ребра: thickness × cos(угол).
//  3. dropToLowestCorner = (1 + 2)/2 — спуск от оси до нижнего угла доски;
//     на столько же доска поднимается над осью.
//
// Низ габарита задаёт то, что опускается ниже — кронштейн или доска; верх
// всегда доска. Обе ветки сворачиваются в
// `dropToLowestCorner + max(PIVOT_HEIGHT, dropToLowestCorner)` и на границе
// сходятся непрерывно. Проверено в Blender на глубинах 176 и 500: на 176
// доска не достаёт до низа кронштейна, на 500 уходит ниже.
function getWardrobeAngledShelfProjection(thicknessMm: number, depthMm: number) {
    const angleRad = (WARDROBE_ANGLED_SHELF_ANGLE_DEG * Math.PI) / 180;

    // 1) проекция полки без учёта толщины материала
    const shelfProjection = depthMm * Math.sin(angleRad);
    // 2) проекция переднего ребра полки
    const frontEdgeProjection = thicknessMm * Math.cos(angleRad);

    // 3) спуск от ОСИ ПОВОРОТА (центра доски) до её НИЖНЕГО УГЛА — половина
    // полной проекции повёрнутого прямоугольника
    const dropToLowestCorner = (shelfProjection + frontEdgeProjection) / 2;

    // Низ габарита — что опускается от оси ниже: кронштейн или доска. Верх
    // всегда доска: кронштейн поднимается над осью лишь на 68.8-50.5=18.3мм.
    const bracketDefinesBottom = dropToLowestCorner < WARDROBE_ANGLED_SHELF_PIVOT_HEIGHT;
    const pivotOffsetFromBottom = bracketDefinesBottom
        ? WARDROBE_ANGLED_SHELF_PIVOT_HEIGHT
        : dropToLowestCorner;

    return {
        bracketDefinesBottom,
        shelfProjection,
        frontEdgeProjection,
        // Спуск от оси до СЕРЕДИНЫ переднего ребра. В габарите не участвует
        // (там отсчёт от нижнего угла), нужен только правилу коллизии
        // "прямая полка над наклонной" — getWardrobeAngledShelfFlatGapAbove.
        dropToFrontEdgeCenter: dropToLowestCorner - frontEdgeProjection / 2,
        // Полная занимаемая вертикаль (высота PIXI-элемента в 2D): подъём
        // доски над осью + спуск того, что ниже.
        totalHeight: dropToLowestCorner + pivotOffsetFromBottom,
        // От НИЗА габарита (positionY) до ОСИ ПОВОРОТА, она же центр доски:
        // в ветке "кронштейн" низ габарита — это низ кронштейна, в ветке
        // "доска" — её нижний угол.
        pivotOffsetFromBottom,
    };
}

// Высота оси поворота наклонной полки над НИЗОМ её габарита (positionY) —
// для 3D: центр доски ставится на эту высоту, а низ кронштейна — на
// WARDROBE_ANGLED_SHELF_PIVOT_HEIGHT ниже неё. См.
// getWardrobeAngledShelfProjection выше.
export function getWardrobeAngledShelfPivotOffset(
    shelf: { colorId?: number; material?: 'ldsp' | 'glass' },
    depthMm: number,
    wardrobeProductId?: number,
): number {
    const thicknessMm = getWardrobeShelfThickness(shelf.colorId, shelf.material, wardrobeProductId);
    return getWardrobeAngledShelfProjection(thicknessMm, depthMm).pivotOffsetFromBottom;
}

// Отступ ПРЯМОЙ полки, стоящей НАД наклонной, от верхнего края её проекции.
// Работает только при условии
//     (проекция + ребро)/2 - ребро/2  <  WARDROBE_ANGLED_SHELF_PIVOT_HEIGHT
// (спуск от оси до СЕРЕДИНЫ переднего ребра меньше высоты оси); иначе null
// и вызывающий getWardrobeShelfMinGap остаётся на общей логике.
//
// Формула оставлена в исходной записи (алгебраически это просто
// BRACKET_HEIGHT_ANGLED - проекция) — так видно, из чего складывается.
//
// Отступ может выйти ОТРИЦАТЕЛЬНЫМ, если проекция больше высоты кронштейна.
// Это не ошибка: габарит наклонной полки прямоугольный, а доска в нём
// диагональ, так что прямая полка сверху может заходить в пустой угол над
// задним краем.
export function getWardrobeAngledShelfFlatGapAbove(
    shelf: { colorId?: number; material?: 'ldsp' | 'glass' },
    depthMm: number,
    wardrobeProductId?: number,
): number | null {
    const thicknessMm = getWardrobeShelfThickness(shelf.colorId, shelf.material, wardrobeProductId);
    const { shelfProjection, dropToFrontEdgeCenter } = getWardrobeAngledShelfProjection(thicknessMm, depthMm);

    if (dropToFrontEdgeCenter >= WARDROBE_ANGLED_SHELF_PIVOT_HEIGHT) return null;

    return WARDROBE_SHELF_MIN_GAP_FLAT
        - (shelfProjection - (WARDROBE_SHELF_BRACKET_HEIGHT_ANGLED - WARDROBE_SHELF_MIN_GAP_FLAT));
}

// Высота "PIXI-элемента" полки, мм. Прямая занимает ровно толщину
// материала; наклонная — свою проекцию вместе с кронштейном (см.
// getWardrobeAngledShelfProjection); штанга — свой railHeight напрямую
// (item.height каталога), минуя getWardrobeShelfThickness: у неё нет ни
// material, ни colorId. wardrobeProductId нужен только для толщины стекла.
export function getWardrobeShelfPixiHeight(
    shelf: { type: 'flat' | 'angled'; colorId?: number; material?: 'ldsp' | 'glass'; kind?: 'shelf' | 'rail'; railHeight?: number },
    depthMm: number,
    wardrobeProductId?: number,
): number {
    if (shelf.kind === 'rail') return Number(shelf.railHeight) || 0;

    const thicknessMm = getWardrobeShelfThickness(shelf.colorId, shelf.material, wardrobeProductId);
    if (shelf.type !== 'angled') return thicknessMm;

    return getWardrobeAngledShelfProjection(thicknessMm, depthMm).totalHeight;
}

// Минимальный зазор (мм) между парой объектов сектора. ПОРЯДОК АРГУМЕНТОВ
// ЗНАЧИМ: below — снизу, above — сверху (пара НЕ взаимозаменяемая):
// - обе ШТАНГИ — фиксированные WARDROBE_RAIL_MIN_GAP, направление не важно;
// - штанга СНИЗУ, полка сверху — отступ полки (getWardrobeShelfFloorGap) ПЛЮС
//   WARDROBE_RAIL_MIN_GAP: штанга не отменяет требования полки к месту под ней;
// - штанга СВЕРХУ, полка снизу — ТОЛЬКО отступ штанги: требование нижней
//   полки относится к пространству над ней и сюда не тянется;
// - две ОБЫЧНЫЕ полки, направление не важно: между двумя ПРЯМЫМИ —
//   WARDROBE_SHELF_MIN_GAP_FLAT; если хоть одна НАКЛОННАЯ — её высота
//   PIXI-элемента сравнивается с порогом WARDROBE_SHELF_MIN_GAP_ANGLED +
//   толщина этой полки: height >= порога -> 2мм, иначе (порог - height) + 2
//   (чем ниже полка, тем больше зазор); если наклонные обе — больший из двух.
//
// Отдельно от всего этого — ПРЯМАЯ над НАКЛОННОЙ, см. первую ветку в теле.
export function getWardrobeShelfMinGap(
    below: { type: 'flat' | 'angled'; colorId?: number; material?: 'ldsp' | 'glass'; kind?: 'shelf' | 'rail' },
    above: { type: 'flat' | 'angled'; colorId?: number; material?: 'ldsp' | 'glass'; kind?: 'shelf' | 'rail' },
    depthMm: number,
    wardrobeProductId?: number,
): number {
    const belowIsRail = below.kind === 'rail';
    const aboveIsRail = above.kind === 'rail';

    if (belowIsRail && aboveIsRail) return WARDROBE_RAIL_MIN_GAP;
    if (belowIsRail) return getWardrobeShelfFloorGap(above, depthMm, wardrobeProductId) + WARDROBE_RAIL_MIN_GAP;
    if (aboveIsRail) return WARDROBE_RAIL_MIN_GAP;

    // ПРЯМАЯ полка НАД наклонной — не по общей формуле ниже, а от высоты
    // кронштейна наклонной. Условие внутри; null -> общая логика.
    if (below.type === 'angled' && above.type !== 'angled') {
        const flatAboveGap = getWardrobeAngledShelfFlatGapAbove(below, depthMm, wardrobeProductId);
        if (flatAboveGap !== null) return flatAboveGap;
    }

    const angledGap = (shelf: typeof below) => {
        const height = getWardrobeShelfPixiHeight(shelf, depthMm, wardrobeProductId);
        const thickness = getWardrobeShelfThickness(shelf.colorId, shelf.material, wardrobeProductId);
        return height >= WARDROBE_SHELF_MIN_GAP_ANGLED + thickness ? 2 : (WARDROBE_SHELF_MIN_GAP_ANGLED - height) + 2;
    };

    let gap = null;
    if (below.type === 'angled') gap = angledGap(below);
    if (above.type === 'angled') gap = gap === null ? angledGap(above) : Math.max(gap, angledGap(above));

    return gap ?? WARDROBE_SHELF_MIN_GAP_FLAT;
}

// Зазор (мм) от ПОЛА до нижней полки: пол требует ТОТ ЖЕ зазор, что и
// соседняя полка (а не 0, как было раньше — полка садилась вплотную).
// У пола нет своего "типа", но на зазор влияет только наклонность самих
// полок, поэтому передаём полку дважды: наклонная посчитается по своей
// угловой геометрии, прямая даст фиксированный WARDROBE_SHELF_MIN_GAP_FLAT.
export function getWardrobeShelfFloorGap(
    shelf: { type: 'flat' | 'angled'; colorId?: number; material?: 'ldsp' | 'glass' },
    depthMm: number,
    wardrobeProductId?: number,
): number {
    return getWardrobeShelfMinGap(shelf, shelf, depthMm, wardrobeProductId);
}

// Ищет свободную позицию по Y для новой полки, sweep'ом от пола вверх (тот
// же принцип, что у ShapeAdjuster.getRandomPosition в box-UM, но с зазором
// по типу пары полок, а не фиксированным шагом). Используется
// ShelvesManager.addWardrobeShelf: новые секторы создаются БЕЗ полок.
// ceilingHeight — "монтажная" высота сектора
// (getWardrobeSectionInstallableHeight), НЕ grid.height. null, если места
// не осталось.
//
// candidateY округляется ВВЕРХ на КАЖДОМ шаге, а не один раз в конце:
// высоты/зазоры наклонной дробные (тригонометрия), и Math.round в конце мог
// увести итог за границу диапазона — тогда UMconstructorClass.reset() тут
// же удалял полку как "не помещается". Ceil — безопасное направление, в
// чужую запретную зону не заезжает.
export function findFreeWardrobeShelfPositionY(
    shelves: { type: 'flat' | 'angled'; colorId?: number; material?: 'ldsp' | 'glass'; positionY: number }[],
    newShelf: { type: 'flat' | 'angled'; colorId?: number; material?: 'ldsp' | 'glass' },
    depthMm: number,
    ceilingHeight: number,
    wardrobeProductId?: number,
): number | null {
    const newHeight = getWardrobeShelfPixiHeight(newShelf, depthMm, wardrobeProductId);
    const sorted = [...shelves].sort((a, b) => a.positionY - b.positionY);

    let candidateY = Math.ceil(getWardrobeShelfFloorGap(newShelf, depthMm, wardrobeProductId));
    for (const existing of sorted) {
        // Sweep снизу вверх — existing всегда ниже кандидата, отсюда порядок
        // (below=existing, above=newShelf); он значим, см. getWardrobeShelfMinGap.
        const gap = getWardrobeShelfMinGap(existing, newShelf, depthMm, wardrobeProductId);
        const existingHeight = getWardrobeShelfPixiHeight(existing, depthMm, wardrobeProductId);
        const forbiddenBottom = existing.positionY - gap;
        const forbiddenTop = Math.ceil(existing.positionY + existingHeight + gap);

        if (candidateY + newHeight > forbiddenBottom && candidateY < forbiddenTop) {
            candidateY = forbiddenTop;
        }
    }

    if (candidateY + newHeight > ceilingHeight) return null;
    return candidateY;
}

// СТАТИЧНЫЕ границы positionY: считаются ОДИН РАЗ относительно исходного
// порядка полок (кто был ниже — ограничивает снизу, кто выше — сверху), так
// что "перепрыгнуть" соседа нельзя. Используются числовым полем "Положение
// по Y" (WardrobeFillingsView.vue), которому нужен единый диапазон min/max.
// Живой драг мышью работает иначе — см. resolveWardrobeShelfDragPositionY.
// Зазоры и нижняя граница — те же getWardrobeShelfMinGap/FloorGap, что при
// добавлении; ceilingHeight — монтажная высота сектора.
//
// minY округляется ВВЕРХ, maxY — ВНИЗ: границы дробные (тригонометрия), а
// потребитель клампит по ним и ПОТОМ округляет позицию до целых мм —
// округление у дробной границы уводило итог за диапазон, и reset() удалял
// полку как "не помещается". С целыми границами round зажатого значения
// перескочить их уже не может.
export function getWardrobeShelfDragBounds(
    shelves: { id: number; type: 'flat' | 'angled'; colorId?: number; material?: 'ldsp' | 'glass'; positionY: number }[],
    draggedShelfId: number,
    depthMm: number,
    ceilingHeight: number,
    wardrobeProductId?: number,
): { minY: number; maxY: number } {
    const dragged = shelves.find((s) => s.id === draggedShelfId);
    if (!dragged) return { minY: 0, maxY: ceilingHeight };

    const draggedHeight = getWardrobeShelfPixiHeight(dragged, depthMm, wardrobeProductId);

    let minY = Math.ceil(getWardrobeShelfFloorGap(dragged, depthMm, wardrobeProductId));
    let maxY = Math.floor(ceilingHeight - draggedHeight);

    shelves.forEach((other) => {
        if (other.id === draggedShelfId) return;

        const otherHeight = getWardrobeShelfPixiHeight(other, depthMm, wardrobeProductId);

        if (other.positionY < dragged.positionY) {
            // other СНИЗУ, dragged СВЕРХУ — порядок аргументов значим
            const gap = getWardrobeShelfMinGap(other, dragged, depthMm, wardrobeProductId);
            minY = Math.max(minY, Math.ceil(other.positionY + otherHeight + gap));
        } else {
            // other СВЕРХУ, dragged СНИЗУ (below=dragged, above=other).
            const gap = getWardrobeShelfMinGap(dragged, other, depthMm, wardrobeProductId);
            maxY = Math.min(maxY, Math.floor(other.positionY - gap - draggedHeight));
        }
    });

    return { minY, maxY: Math.max(minY, maxY) };
}

// Живой драг мышью (DividerDragEngine.onWardrobeShelfDragMove): на каждое
// движение разрешает столкновения ДИНАМИЧЕСКИ, по текущим позициям соседей,
// поэтому элемент может перескакивать через них. Статичный аналог для
// числового поля — getWardrobeShelfDragBounds выше.
//
// Свободные зоны: для каждого соседа строится запретный интервал Y (тот же
// forbiddenBottom/forbiddenTop, что в findFreeWardrobeShelfPositionY),
// интервалы сливаются и дополняются до floorMin/ceilMax; слишком узкие зоны
// отбрасываются.
//
// Обход зон НАПРАВЛЕННЫЙ, от текущего положения элемента: он едет с мышью
// внутри своей зоны и переходит в следующую, только когда rawY долетает до
// её начала, иначе фиксируется на границе. Выбор глобально ближайшей к МЫШИ
// зоны давал порог посередине между зонами и телепортацию от дрожания
// курсора.
//
// Вырожденные случаи:
//  - позиция не попадает ни в одну зону (выставлена через "Положение по Y",
//    а сосед с тех пор сдвинулся): rawY для направления не используем (та же
//    телепортация) — разово поджимаем к ближайшей границе;
//  - свободных зон нет вовсе (соседи коллективно перекрыли диапазон, хотя
//    каждый проходит проверку reset()): не двигаем элемент. Клампинг к
//    [floorMin,ceilMax] попал бы в запретную зону, и reset() потом
//    "чинил" её рывком.
//
// Границы округляются НАРУЖУ — как в getWardrobeShelfDragBounds.
export function resolveWardrobeShelfDragPositionY(
    shelves: { id: number; type: 'flat' | 'angled'; colorId?: number; material?: 'ldsp' | 'glass'; kind?: 'shelf' | 'rail'; railHeight?: number; positionY: number }[],
    draggedShelfId: number,
    depthMm: number,
    ceilingHeight: number,
    rawY: number,
    wardrobeProductId?: number,
): number {
    const dragged = shelves.find((s) => s.id === draggedShelfId);
    if (!dragged) return rawY;

    const others = shelves.filter((s) => s.id !== draggedShelfId);
    const newHeight = getWardrobeShelfPixiHeight(dragged, depthMm, wardrobeProductId);

    const floorMin = Math.ceil(getWardrobeShelfFloorGap(dragged, depthMm, wardrobeProductId));
    const ceilMax = Math.floor(ceilingHeight - newHeight);
    if (ceilMax <= floorMin) return Math.round(dragged.positionY);

    const rawIntervals = others
        .map((other) => {
            const otherHeight = getWardrobeShelfPixiHeight(other, depthMm, wardrobeProductId);
            // Зазор направленный: lower — для "dragged снизу, other сверху",
            // upper — наоборот. Если в паре штанга, это ДВА разных значения.
            const gapBelow = getWardrobeShelfMinGap(dragged, other, depthMm, wardrobeProductId);
            const gapAbove = getWardrobeShelfMinGap(other, dragged, depthMm, wardrobeProductId);
            return {
                lower: Math.floor(other.positionY - gapBelow - newHeight),
                upper: Math.ceil(other.positionY + otherHeight + gapAbove),
            };
        })
        .sort((a, b) => a.lower - b.lower);

    const segments: { lower: number; upper: number }[] = [];
    for (const iv of rawIntervals) {
        const last = segments[segments.length - 1];
        // Строгое "<": если интервалы ровно КАСАЮТСЯ (iv.lower ===
        // last.upper), это не пересечение — граничная точка между ними
        // валидна (та же логика открытого интервала, что и в
        // findFreeWardrobeShelfPositionY). Иначе два стоящих впритык объекта
        // склеивались в один запретный отрезок, стирая единственную валидную
        // позицию между ними, и currentY-fallback ниже уводил элемент в
        // далёкую свободную зону.
        if (last && iv.lower < last.upper) {
            last.upper = Math.max(last.upper, iv.upper);
        } else {
            segments.push({ ...iv });
        }
    }

    // Свободные зоны внутри [floorMin, ceilMax] — дополнение слитых запретных
    // отрезков до границ пола/потолка. Слишком узкая зона в список не попадёт.
    const freeZones: { start: number; end: number }[] = [];
    let cursor = floorMin;
    for (const seg of segments) {
        if (cursor > ceilMax) break;
        // ">=", не строгое ">": совпадение seg.lower с cursor — валидная зона
        // нулевой ширины. Со строгим ">" стартовая позиция элемента могла не
        // найтись ни в одной зоне, и fallback ниже уводил его на первом же
        // кадре в другую, отдалённую точку.
        if (seg.lower >= cursor) freeZones.push({ start: cursor, end: Math.min(seg.lower, ceilMax) });
        cursor = Math.max(cursor, seg.upper);
    }
    if (cursor <= ceilMax) freeZones.push({ start: cursor, end: ceilMax });

    // Вырожденный случай — свободных промежутков нет вовсе, см. doc-комментарий
    // выше. Не двигаем элемент.
    if (!freeZones.length) return Math.round(dragged.positionY);

    // Зона, содержащая текущую позицию — точка отсчёта направленного обхода
    const currentY = dragged.positionY;
    const curIdx = freeZones.findIndex((z) => currentY >= z.start - 0.01 && currentY <= z.end + 0.01);

    if (curIdx === -1) {
        // Текущая позиция невалидна — разовая коррекция к ближайшей границе,
        // без rawY (иначе получим телепортацию, см. doc выше)
        let bestIdx = 0;
        let bestDist = Infinity;
        freeZones.forEach((z, i) => {
            const d = currentY < z.start ? z.start - currentY : currentY > z.end ? currentY - z.end : 0;
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        });
        const zone = freeZones[bestIdx];
        return Math.round(Math.max(zone.start, Math.min(zone.end, currentY)));
    }

    // Направленный обход: идём к следующей зоне в сторону rawY, но только
    // если rawY реально долетела до её края; иначе стоим на границе текущей.
    let idx = curIdx;
    if (rawY > freeZones[idx].end) {
        while (idx < freeZones.length - 1 && rawY >= freeZones[idx + 1].start) idx++;
    } else if (rawY < freeZones[idx].start) {
        while (idx > 0 && rawY <= freeZones[idx - 1].end) idx--;
    }

    // Округление безопасно: start/end зоны уже целые (границы округлены
    // наружу выше), а значение зажато между ними — round перескочить их не
    // может. Иначе дробный positionY на границе приводил к удалению полки.
    const zone = freeZones[idx];
    return Math.round(Math.max(zone.start, Math.min(zone.end, rawY)));
}
