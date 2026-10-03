// ==== Гардеробная система (WARDROBE) ====
// Отрисовка гардеробной сетки в PIXI: секции (без стенок/cells) и профили на
// их границах, N секций -> N+1 профилей. Вынесено из SceneBuilder.ts, где
// лежало рядом с box-UM createSector/createVerticalCut — те завязаны на
// cells/rows/extras, которых у гардеробной системы нет вовсе, общего кода не
// было.
//
// Точка входа одна: SceneBuilder.renderGrid() для moduleKind === 'wardrobe'
// зовёт renderWardrobeGrid() и выходит. Общее состояние — тот же
// RenderContext, что у SceneBuilder/SelectionHighlighter/DividerDragEngine,
// так что все движки видят одни PIXI-контейнеры.
//@ts-nocheck

import { Container, Graphics, Text } from "pixi.js";
import { Shape, Section } from "@/components/UMconstructor/utils/PixiMethods.ts";
import RenderContext from "@/components/UMconstructor/utils/render2d/RenderContext.ts";
import { WARDROBE_PROFILE_WIDTH, WARDROBE_CANVAS_PADDING_PX } from "@/Application/F-wardrobeData.ts";
import { getWardrobeShelfPixiHeight, getWardrobeFasteningColorFamily, getWardrobeShelfDepth } from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { WARDROBE_COLORS, getWardrobeShelfColors } from "./WardrobeColors.ts";
import { createHorizontalDimension, createVerticalDimension, createWardrobeNameLabel } from "./WardrobeDimensions.ts";
import { isWardrobeCabinet } from "@/components/UMconstructor/cabinet/CabinetSystem.ts";
import { drawWardrobeCabinet, getCabinetSpanPx } from "@/components/UMconstructor/cabinet/render/CabinetGraphics.ts";

// Подпись элемента секции на канвасе. index — порядок в wardrobeFilling (как в
// WardrobeFillingsView.vue). Общая для createWardrobeSector и WardrobeDragEngine.
export function getWardrobeItemName(shelf, index) {
    if (shelf.type === 'rail') return `Штанга ${index + 1}`;
    if (isWardrobeCabinet(shelf)) return `Тумбочка ${index + 1}`;
    return `Полка ${index + 1}`;
}

// Горизонтальный габарит элемента в локальных px секции: тумбочка уже секции
// (cabinet/render/CabinetGraphics.getCabinetSpanPx), остальное — во всю ширину.
export function getWardrobeItemSpanPx(ctx, shelf, sectorWidthPx) {
    return isWardrobeCabinet(shelf) ? getCabinetSpanPx(ctx, sectorWidthPx) : { x: 0, width: sectorWidthPx };
}

// Заливка элемента секции в graphic (перед перерисовкой вызывающий делает clear()).
// Общая для createWardrobeShelf и живого драга (WardrobeDragEngine.onWardrobeShelfDragMove).
export function drawWardrobeItem(graphic, ctx, shelf, sectorWidthPx, topPx, heightPx) {
    if (isWardrobeCabinet(shelf)) {
        drawWardrobeCabinet(graphic, ctx, shelf, sectorWidthPx, topPx, heightPx);
        return;
    }

    const shelfColors = getWardrobeShelfColors(shelf);
    graphic.rect(0, topPx, sectorWidthPx, heightPx);
    graphic.fill({ color: shelfColors.fill, alpha: shelf.material === 'glass' ? WARDROBE_COLORS.shelf.glassAlpha : 1 });
    graphic.stroke({ width: 1, color: shelfColors.stroke, alignment: 1 });
}

// Цвет обводки выделенной полки/штанги (createWardrobeSector) — яркий,
// не встречается среди цветов самих полок/профилей (WARDROBE_COLORS), чтобы
// всегда чётко читаться поверх любой из них. Экспортирован — WardrobeDragEngine.
// onWardrobeShelfDragMove перерисовывает эту же обводку live во время драга
// (тем же цветом, не подменяя его на что-то своё).
export const WARDROBE_SHELF_HIGHLIGHT_COLOR = '#56a55fe2';

// Размерная линия зазора между ДВУМЯ конкретными полками (режим 'gap') —
// вынесено из createWardrobeSector в отдельную функцию, чтобы ТУ ЖЕ формулу
// мог переиспользовать WardrobeDragEngine.onWardrobeShelfDragMove для
// live-обновления ТОЛЬКО линий, касающихся перетаскиваемой полки (уточнение
// пользователя: "верни реактивность", "в режиме между наполнениями не
// изменяется") — без полного пересчёта всей секции на каждый move (это
// вернуло бы Text-объекты для ВСЕХ пар полок секции на каждый кадр, тот же
// баг фризов, который уже чинился отдельно). lower/upper — уже
// ОТСОРТИРОВАННАЯ по positionY пара (lower ниже, upper выше). Возвращает
// null, если зазор <= 0 (полки перекрываются/впритык — валидная линия
// невозможна, тот же кейс, что и раньше пропускался через `continue`).
export function createWardrobeGapDimension(ctx, lower, upper, depthMm, wardrobeProductId, height, absX, absY, width) {
    const lowerHeightMm = getWardrobeShelfPixiHeight(lower, depthMm, wardrobeProductId);
    const gapMm = upper.positionY - (lower.positionY + lowerHeightMm);
    if (gapMm <= 0) return null;

    // Локальные координаты секции — Y растёт ВНИЗ (PIXI), а positionY (мм
    // от пола) растёт ВВЕРХ — тот же пересчёт, что и в createWardrobeShelf
    // (bottomPx = height - getPixelHeight(positionY)).
    const lowerTopPx = height - ctx.getPixelHeight(lower.positionY + lowerHeightMm)
    const upperBottomPx = height - ctx.getPixelHeight(upper.positionY)
    // labelSide=1 (справа, по умолчанию) — уточнение пользователя,
    // haloText=true — контраст независимо от фона под текстом (см.
    // WardrobeDimensions.DIMENSION_TEXT_STYLE_HALO): подпись здесь почти
    // всегда перекрывает тёмный профиль соседней границы.
    return createVerticalDimension(absY + lowerTopPx, absY + upperBottomPx, absX + width - 4, gapMm, 1, true);
}

export default class WardrobeSceneBuilder {
    ctx: RenderContext

    constructor(ctx: RenderContext) {
        this.ctx = ctx
    }


    // Рисует секции (без стенок/cells) и профили на их границах. N секций
    // -> N+1 профилей (профили — границы секций, включая два крайних, левый
    // и правый край модуля). Полностью отдельно от box-UM SceneBuilder.
    // createSector/createVerticalCut — те завязаны на cells/rows/extras,
    // которых у гардеробной системы нет вовсе.
    renderWardrobeGrid(moduleGrid, moduleSector) {
        const ctx = this.ctx
        const sections = moduleGrid.sections
        const heightPx = ctx.getPixelHeight(moduleGrid.height)
        const profileWidthPx = ctx.getPixelWidth(WARDROBE_PROFILE_WIDTH)

        // Отступ канваса (WARDROBE_CANVAS_PADDING_PX, см. renderGrid) секции
        // и полки наследуют автоматически — они дети moduleSector, чья позиция
        // уже включает отступ. Профили и подписи ниже — нет: профили идут в
        // ctx.deviders (sectionsContainer), подписи — в ctx.sectionLables
        // (lablesContainer), оба верхнеуровневые, сидят на app.stage в (0,0) и
        // трансформацию moduleSector не получают. Поэтому её приходится
        // прибавлять вручную к каждой абсолютной координате в этом методе —
        // иначе секции/полки съезжают на отступ, а профили остаются на месте.
        const moduleOffsetX = moduleSector.position.x
        const moduleOffsetY = moduleSector.position.y

        // section.width — ВНУТРЕННЕЕ расстояние между профилями (как и в 3D).
        // Перед каждой секцией резервируется WARDROBE_PROFILE_WIDTH (правый
        // крайний профиль — после цикла), поэтому видимая ширина секции ровно
        // widthPx. Раньше профили рисовались ПОВЕРХ краёв заливки, и секция
        // визуально теряла 2×25мм при неизменном section.width.
        //
        // Из-за резерва totalWidthPx больше ctx.getPixelWidth(moduleGrid.width)
        // на (N+1)×profileWidthPx — на эту разницу увеличен канвас в
        // Render2D.vue::updateTotalSize, иначе правый край обрезался бы.
        let xOffset = 0
        sections.forEach((section, sectionIndex) => {
            xOffset += profileWidthPx
            const widthPx = ctx.getPixelWidth(section.width)
            section.xOffset = xOffset
            section.yOffset = 0

            this.createWardrobeSector({
                x: xOffset,
                y: 0,
                width: widthPx,
                height: heightPx,
                section,
                sectionIndex,
                _sector: moduleSector,
                // Длина полки считается от ТЕКУЩЕЙ grid.depth, а не от потолка
                // getWardrobeProfileMaxDepth: тот не меняется при правке поля
                // "Глубина", из-за чего высота наклонной полки переставала на
                // неё реагировать (см. WardrobeSystem.getWardrobeShelfDepth).
                depthMm: getWardrobeShelfDepth(moduleGrid),
                wardrobeProductId: moduleGrid.productID,
                moduleOffsetX,
                moduleOffsetY,
            })

            xOffset += widthPx
        })
        xOffset += profileWidthPx // правый крайний профиль

        const totalWidthPx = xOffset

        // N+1 профилей на границах 0..sections.length; 0 и sections.length —
        // крайние (левый/правый край модуля), не перетаскиваются.
        //
        // Профиль[i] занимает СВОЁ место ровно перед sections[i]
        // (section.xOffset уже учитывает резерв), правый крайний — после
        // последней секции; раньше внутренние центрировались НА границе,
        // половиной в каждом соседе. Без наложения section.width честно равен
        // видимому промежутку. Драг внутреннего профиля
        // (WardrobeDragEngine.onWardrobeProfileDragMove) от этой геометрии не
        // зависит — считает по section.width соседей и дельте мыши.
        //
        // heightPx (= moduleGrid.height в px) — высота канваса по САМОМУ
        // ВЫСОКОМУ профилю (UMconstructorClass.reset()); каждый профиль
        // рисуется СВОЕЙ высотой от пола вверх, короткие ("Стена") до верха
        // не достают (см. createWardrobeProfile).
        for (let profileIndex = 0; profileIndex <= sections.length; profileIndex++) {
            const isEdge = profileIndex === 0 || profileIndex === sections.length

            const profileX = profileIndex < sections.length
                ? sections[profileIndex].xOffset - profileWidthPx
                : totalWidthPx - profileWidthPx

            const profileData = moduleGrid.wardrobeProfiles?.[profileIndex]
            // "Семья" цвета — из каталога fastenings[fasteningId].type
            // ("floor_ceiling"/"floor_wall"/"wall_wall"), не из самого
            // fasteningId/названия (см. WardrobeSystem.getWardrobeFasteningColorFamily).
            const colorFamily = getWardrobeFasteningColorFamily(moduleGrid.productID, profileData?.fasteningId)
            // Та же логика выбора draggable/edge заливки, что и внутри
            // createWardrobeProfile ниже — нужна ЗДЕСЬ отдельно, чтобы дать
            // подписи "Профиль N" (сидит ПРЯМО на этой заливке) правильный
            // bgColorHex для контрастности (см. WardrobeDimensions.
            // getContrastTextColor, уточнение пользователя).
            const profileFillColors = WARDROBE_COLORS.profile[colorFamily] ?? WARDROBE_COLORS.profile['floor_ceiling']
            const profileFill = isEdge ? profileFillColors.edge.fill : profileFillColors.draggable.fill

            const profileHeightMm = profileData?.height ?? moduleGrid.height

            this.createWardrobeProfile({
                x: profileX + moduleOffsetX,
                y: moduleOffsetY,
                totalHeightPx: heightPx,
                profileHeightMm,
                colorFamily,
                profileIndex,
                profileId: profileData?.id,
                draggable: !isEdge,
            })

            // profileHeightPx — используется и размерной линией ниже (в
            // 'floor' от wardrobeDragActive), и контуром выделения сразу под
            // ней (нужен ВСЕГДА, не только вне драга) — вынесен из-под if,
            // формула идентична createWardrobeProfile.
            const profileHeightPx = Math.min(Math.max(ctx.getPixelHeight(profileHeightMm), 2), heightPx)

            // Выделение двустороннее: канвас <-> "Настройка профилей".
            // Обводка ПОВЕРХ профиля, не подмена заливки (как у полки в
            // createWardrobeSector); profile.position уже абсолютная, так что
            // координаты те же без пересчёта. Видимость — по
            // UM_STORE.selectedWardrobeProfileId (простое поле стора, а не
            // Vue-ref, как selectedFilling у полок). Регистрация в
            // ctx.wardrobeProfilesMap нужна, чтобы
            // SelectionHighlighter.selectWardrobeProfile переключал .visible
            // напрямую, без renderGrid.
            const profileHighlight = new Graphics();
            profileHighlight.rect(profileX + moduleOffsetX, moduleOffsetY + heightPx - profileHeightPx, profileWidthPx, profileHeightPx);
            profileHighlight.stroke({ width: 2, color: WARDROBE_SHELF_HIGHLIGHT_COLOR, alignment: 1 });
            profileHighlight.visible = ctx.UMconstructor?.value?.UM_STORE.selectedWardrobeProfileId === profileData?.id;
            ctx.sectionLables.push(profileHighlight);
            ctx.wardrobeProfilesMap.push({
                data: { id: profileData?.id },
                highlightGraphics: profileHighlight,
            });

            // Высота профиля: вертикальная размерная линия сбоку, от верха
            // профиля до низа канваса, в абсолютных координатах. Кладём в
            // ctx.sectionLables, а не ctx.dementions: dementionContainer
            // добавлен в app.stage первым и рендерится позади всего, а
            // lablesContainer — последним (обозначения на переднем плане).
            //
            // У КРАЙНЕГО ПРАВОГО профиля линия и подпись зеркалятся НАЛЕВО
            // (isLastProfile), иначе уходят за край канваса; у левого справа
            // всегда есть минимум ширина секции.
            //
            // ctx.wardrobeDragActive — во время драга пропускаем Text-объекты
            // (размерная линия + "Профиль N"), самую дорогую часть отрисовки;
            // троттлинга до кадра не хватало, т.к. медленный сам renderGrid().
            // Прямоугольник профиля рисуется всегда, полный рендер
            // возвращается на dragEnd (resetModule()).
            if (!ctx.wardrobeDragActive) {
                const isLastProfile = profileIndex === sections.length
                const dimensionX = moduleOffsetX + (isLastProfile ? profileX - 4 : profileX + profileWidthPx + 4)
                ctx.sectionLables.push(createVerticalDimension(
                    moduleOffsetY + heightPx - profileHeightPx, moduleOffsetY + heightPx, dimensionX, profileHeightMm, isLastProfile ? -1 : 1,
                ))

                // "Профиль N" (1-based) — ВЕРТИКАЛЬНЫЙ текст
                // (createWardrobeNameLabel(vertical=true)) по центру ширины и
                // видимой высоты САМОГО профиля. Сбоку подпись у левого
                // крайнего перекрывалась с "Секция N"/подписью полки, а у
                // правого уходила за край канваса; внутри профиля она всегда в
                // его границах, где бы он ни стоял.
                ctx.sectionLables.push(createWardrobeNameLabel(
                    `Профиль ${profileIndex + 1}`,
                    moduleOffsetX + profileX + profileWidthPx / 2,
                    moduleOffsetY + heightPx - profileHeightPx / 2,
                    0.5, 0.5, true,
                    profileFill,
                ))
            }
        }
    }

    // Секция гардеробной системы — просто прямоугольник (тот же Section/
    // cellGraphics, что и у обычных секций box-UM, для единого визуального
    // стиля), без cells/fasades/тсарги/наполнения.
    //
    // _sector (moduleSector из createModule) ОБЯЗАТЕЛЕН:
    // SelectionHighlighter.toggleSectionColor снимает подсветку через
    // ctx.sections[0].children, т.е. секции должны быть ДЕТЬМИ
    // ctx.sections[0], а не соседями в ctx.sections (тот же контракт, что у
    // box-UM createSector). С `ctx.sections.push(sector)` клик по секции не
    // подсвечивал его и не снимал подсветку с других.
    createWardrobeSector({ x, y, width, height, section, sectionIndex, _sector, depthMm, wardrobeProductId, moduleOffsetX = 0, moduleOffsetY = 0 }) {
        const ctx = this.ctx
        const sector = new Container({ isRenderGroup: true });

        sector.position.set(x, y);
        // absX/absY — АБСОЛЮТНЫЕ координаты канваса; x/y выше локальные,
        // относительно moduleSector: верны для sector.position, но не для
        // меток ниже (см. moduleOffsetX/Y в renderWardrobeGrid).
        const absX = x + moduleOffsetX;
        const absY = y + moduleOffsetY;
        sector.shapes = [];
        sector.sectorData = section;
        sector.sections = ctx.sections;
        sector.secIndex = sectionIndex;

        const cell = new Section(section, width, height, sector, false);

        const selected = ctx.selectedCell;
        cell.highlightGraphics.visible = selected.value.sec === sectionIndex;

        sector.addChild(cell.cellGraphics);
        sector.addChild(cell.highlightGraphics);

        cell.cellGraphics.on("pointerdown", () => {
            ctx.selectCell("module", <TSelectedCell>{ sec: sectionIndex, cell: null, row: null, extra: null, item: null });
        });
        cell.cellGraphics.eventMode = "static";
        cell.cellGraphics.cursor = "pointer";

        // Полки — ДЕТИ sector (а не отдельного shared-контейнера, как box-UM
        // createFilling/Shape), поэтому работают в локальных координатах
        // секции (0..width/0..height), см. createWardrobeShelf. shelfIndex —
        // порядок в МАССИВЕ, не сортировка по positionY: та же нумерация, что
        // в WardrobeFillingsView.vue ("Полка N"/"Штанга N"), чтобы канвас и
        // панель "Конфигурация" совпадали.
        const shelves = section.wardrobeFilling || [];
        shelves.forEach((shelf) => {
            sector.addChild(this.createWardrobeShelf({ sectorWidthPx: width, sectorHeightPx: height, shelf, depthMm, sectionIndex, wardrobeProductId }));
        });

        // Все размерные линии и нейминги ниже идут НЕ детьми sector (тот
        // рендерится в общем порядке ctx.sections и может оказаться позади
        // fasades/handles-контейнеров), а в ctx.sectionLables →
        // lablesContainer: он добавлен в app.stage последним и всегда на
        // переднем плане — как высота профиля в renderWardrobeGrid.
        // Локальные координаты (0..width/0..height) переводятся в абсолютные
        // добавлением x/y секции: lablesContainer сидит на app.stage в (0,0).

        // Режим размерных данных полок/штанг — переключатель "Наполнение"
        // (WardrobeRightPanelView.vue -> UM_STORE.wardrobeShelfDimensionMode).
        // 'gap' — зазор МЕЖДУ соседними полками, отдельная размерная линия у
        // ПРАВОГО края секции (контраст-фикс labelSide=-1 здесь НЕ
        // применяется — линия должна остаться справа).
        const dimensionMode = ctx.UMconstructor?.value?.UM_STORE.wardrobeShelfDimensionMode ?? 'floor'

        // ctx.wardrobeDragActive — во время драга размерные линии зазора
        // пропускаются целиком (Text — самое дорогое при большом числе полок);
        // полный рендер возвращается на dragEnd.
        if (dimensionMode === 'gap' && !ctx.wardrobeDragActive) {
            // Сортировка по positionY нужна отдельно от shelfIndex ниже
            // (порядок добавления в массив НЕ совпадает с порядком по высоте).
            const sortedShelves = [...shelves].sort((a, b) => a.positionY - b.positionY);
            const gapLines = [];
            for (let i = 1; i < sortedShelves.length; i++) {
                const lower = sortedShelves[i - 1];
                const upper = sortedShelves[i];
                // Формула в createWardrobeGapDimension — её же зовёт
                // WardrobeDragEngine.onWardrobeShelfDragMove, чтобы живьём
                // обновлять только линии у перетаскиваемой полки.
                const gapContainer = createWardrobeGapDimension(ctx, lower, upper, depthMm, wardrobeProductId, height, absX, absY, width);
                if (!gapContainer) continue;
                ctx.sectionLables.push(gapContainer);
                // По ПАРЕ id, не индексу — см. RenderContext.wardrobeGapLinesMap
                // (соседство по positionY может смениться за один драг).
                gapLines.push({ lowerId: lower.id, upperId: upper.id, container: gapContainer });
            }
            ctx.wardrobeGapLinesMap[sectionIndex] = gapLines;
        }

        // Подписи полок/штанг — по центру секции (x+width/2, anchor 0.5) и по
        // центру своей PIXI-высоты; слева от секции (x+4) они накладывались
        // на подпись и размерную линию соседнего профиля.
        //
        // В режиме 'floor' расстояние до пола пишется ПРЯМО В подпись, а не
        // отдельной размерной линией (линии от пола раздвигались "веером").
        // positionY по всей модели данных и так хранится в мм от пола.
        shelves.forEach((shelf, shelfIndex) => {
            const shelfHeightMm = getWardrobeShelfPixiHeight(shelf, depthMm, wardrobeProductId);
            const shelfTopPx = height - ctx.getPixelHeight(shelf.positionY + shelfHeightMm);
            const shelfHeightPx = Math.max(ctx.getPixelHeight(shelfHeightMm), 2);

            // ctx.wardrobeDragActive — во время драга пропускаем ТОЛЬКО
            // подпись (Text); контур выделения ниже дешёвый и рисуется всегда,
            // он показывает, какую полку тащим.
            //
            // nameLabel (null, если подпись пропущена — например при драге
            // ПРОФИЛЯ) регистрируется в wardrobeShelvesMap: при живом драге
            // ПОЛКИ WardrobeDragEngine.onWardrobeShelfDragMove двигает и
            // переписывает её напрямую, иначе она замирала бы до конца драга —
            // renderGrid() в это время не вызывается.
            let nameLabel = null;
            if (!ctx.wardrobeDragActive) {
                const baseName = getWardrobeItemName(shelf, shelfIndex);
                const label = dimensionMode === 'floor' ? `${baseName} — ${Math.round(shelf.positionY)} мм` : baseName;
                // bgColorHex — подпись сидит прямо на заливке полки/штанги,
                // контраст подбирается динамически
                // (WardrobeDimensions.getContrastTextColor).
                nameLabel = createWardrobeNameLabel(
                    label, absX + width / 2, absY + shelfTopPx + shelfHeightPx / 2, 0.5, 0.5, false,
                    getWardrobeShelfColors(shelf).fill,
                );
                ctx.sectionLables.push(nameLabel);
            }

            // Выделение двустороннее: канвас <-> WardrobeFillingsView.vue.
            // Обводка ПОВЕРХ полки, а не подмена заливки (как box-UM
            // highlightGraphics): цвет полки сам несёт тип/материал, см.
            // getWardrobeShelfColors. В ctx.sectionLables (передний план),
            // иначе рамка терялась бы под соседями. Видимость — по
            // ctx.selectedFilling.value; регистрация в ctx.wardrobeShelvesMap
            // нужна, чтобы SelectionHighlighter.selectCell переключал .visible
            // напрямую (как с ctx.fillingsMap).
            const span = getWardrobeItemSpanPx(ctx, shelf, width);
            const shelfHighlight = new Graphics();
            shelfHighlight.rect(absX + span.x, absY + shelfTopPx, span.width, shelfHeightPx);
            shelfHighlight.stroke({ width: 2, color: WARDROBE_SHELF_HIGHLIGHT_COLOR, alignment: 1 });
            shelfHighlight.visible =
                ctx.selectedFilling.value?.sec === sectionIndex &&
                ctx.selectedFilling.value?.item === shelf.id;
            ctx.sectionLables.push(shelfHighlight);
            ctx.wardrobeShelvesMap.push({
                data: { sec: sectionIndex, cell: null, row: null, extra: null, id: shelf.id },
                highlightGraphics: shelfHighlight,
                nameLabel,
            });
        });

        // Ширина и нейминг секции вынесены НАД верхней границей
        // модуля, в зону WARDROBE_CANVAS_PADDING_PX — внутри секции они
        // наезжали на её верхнюю границу. Обе подписи на одной строке Y:
        // "Секция N" слева (anchor 0,1 — текст растёт вверх от линии),
        // размерная линия по центру секции (её подпись тоже над линией).
        //
        // -6, а не -10: при WARDROBE_CANVAS_PADDING_PX=20 линии нужно ~15px
        // над собой под текст и засечки, при -10 текст вылезал за верх.
        //
        // ctx.wardrobeDragActive — во время драга пропускаем Text-объекты.
        if (!ctx.wardrobeDragActive) {
            const sectorTopLabelsY = absY - 6;
            ctx.sectionLables.push(createHorizontalDimension(absX + 0, absX + width, sectorTopLabelsY, section.width));
            ctx.sectionLables.push(createWardrobeNameLabel(`Секция ${sectionIndex + 1}`, absX + 4, sectorTopLabelsY, 0, 1));
        }

        if (_sector) _sector.addChild(sector);
        else ctx.sections.push(sector);
        section.sector = sector;

        return sector;
    }

    // Полка секции — плоская (обычная) или наклонная (обувная), ЛДСП или
    // стекло. Перетаскивается мышью по вертикали (DividerDragEngine.
    // onWardrobeShelfDragStart/Move/End) — секции/shelfId записаны прямо на
    // graphic (тот же приём, что profile.profileIndex у createWardrobeProfile),
    // настройка типа/материала по-прежнему только через правую панель.
    //
    // Цвет — по ТИПУ (у прямой и наклонной разные базовые, см.
    // WardrobeColors.ts), материал (ЛДСП/стекло) — прозрачностью поверх.
    // Высота — getWardrobeShelfPixiHeight: у прямой толщина материала, у
    // наклонной проекция повёрнутого прямоугольника на вертикаль (как в 3D
    // ShelfBuilder.buildWardrobeAngledShelf), поэтому наклонная занимает
    // больше — это её реальный силуэт, не искажение.
    //
    // positionY — мм от низа секции до НИЖНЕЙ грани полки (см.
    // WardrobeShelvesManager.updateWardrobeShelfPositionY).
    createWardrobeShelf({ sectorWidthPx, sectorHeightPx, shelf, depthMm, sectionIndex, wardrobeProductId }) {
        const ctx = this.ctx
        const heightMm = getWardrobeShelfPixiHeight(shelf, depthMm, wardrobeProductId)
        const heightPx = Math.max(ctx.getPixelHeight(heightMm), 2)

        const bottomPx = sectorHeightPx - ctx.getPixelHeight(Math.max(shelf.positionY || 0, 0))
        const topPx = bottomPx - heightPx

        // Цвет — WardrobeColors.getWardrobeShelfColors, его же берёт
        // createWardrobeSector для фона подписи (WardrobeDimensions.getContrastTextColor).
        const graphic = new Graphics();
        drawWardrobeItem(graphic, ctx, shelf, sectorWidthPx, topPx, heightPx);

        graphic.eventMode = 'static';
        graphic.cursor = 'ns-resize';
        graphic.secIndex = sectionIndex;
        graphic.shelfId = shelf.id;
        graphic.on('pointerdown', ctx.onWardrobeShelfDragStart);

        return graphic;
    }

    // Профиль — тонкая вертикальная планка на границе секции(й). Крайние
    // (draggable=false) статичны, внутренние — тянутся (см. DividerDragEngine.
    // onWardrobeProfileDragStart), меняя ширину двух соседних секций.
    // Ножки в 2D сознательно НЕ рисуются: в 3D они уходят ЗА пределы #Y#
    // (720 + 45 + 45 = 810мм, см. LegBuilder.buildWardrobeLegs), а здесь
    // планка идёт на всю moduleGrid.height — усечённые ножки поверх неё
    // читались бы так, будто 720 это высота вместе с ними.
    //
    // У каждого профиля СВОЯ высота (profileHeightMm): он крепится к полу и
    // растёт ВВЕРХ, поэтому короткие просто не достают до totalHeightPx
    // (эталон — самый высокий профиль), а не растягиваются — как positionY у
    // полок, пол общая точка отсчёта. Цвет зависит от colorFamily
    // ('floor_ceiling'|'floor_wall'|'wall_wall', вычисляет вызывающий код из
    // fastenings[fasteningId].type) и draggable (WardrobeColors.ts).
    createWardrobeProfile({ x, y = 0, totalHeightPx, profileHeightMm, colorFamily, profileIndex, profileId, draggable }) {
        const ctx = this.ctx
        const widthPx = ctx.getPixelWidth(WARDROBE_PROFILE_WIDTH)
        const heightPx = Math.min(Math.max(ctx.getPixelHeight(profileHeightMm), 2), totalHeightPx)
        const colors = WARDROBE_COLORS.profile[colorFamily] ?? WARDROBE_COLORS.profile['floor_ceiling']
        const color = draggable ? colors.draggable : colors.edge

        const profile = new Graphics();
        profile.rect(0, 0, widthPx, heightPx);
        profile.fill(color.fill);
        profile.stroke({ width: 1, color: color.stroke, alignment: 1 });

        // y — отступ канваса гардеробной системы (WARDROBE_CANVAS_PADDING_PX,
        // см. renderGrid/renderWardrobeGrid) — профили НЕ дети moduleSector
        // (добавляются в ctx.deviders → отдельный верхнеуровневый
        // sectionsContainer), поэтому не наследуют его позицию автоматически
        // через PIXI-трансформацию, как секции/полки — нужно прибавлять
        // вручную. По умолчанию 0 (box-UM/вызовы без явного отступа —
        // поведение не меняется).
        profile.position.set(x, y + totalHeightPx - heightPx);

        // Выделение по клику — на ВСЕХ профилях, включая крайние: они
        // настраиваются в панели, просто не тянутся мышью. profileId записан
        // прямо на graphic — как secIndex/shelfId у полки.
        profile.eventMode = "static";
        profile.profileIndex = profileIndex;
        profile.profileId = profileId;

        if (draggable) {
            profile.cursor = "ew-resize";
            profile.on("pointerdown", ctx.onWardrobeProfileDragStart);
        } else {
            profile.cursor = "pointer";
            profile.on("pointerdown", ctx.onWardrobeProfileClick);
        }

        ctx.deviders.push(profile);

        return profile;
    }

}
