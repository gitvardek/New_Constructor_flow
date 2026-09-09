// Перетаскивание разделителей мышью (изменение размеров секций/ячеек/рядов),
// в отличие от числового ввода в правой панели — см. ExternalSizeAdjuster.
// Вынесено из Render2D.vue (Фаза 2f рефакторинга, см.
// C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md).
//
// onVerticalDragStart/onHorizontalDragStart — единственные, кому НУЖЕН
// caller-provided this: PIXI зовёт их через
// divider.on("pointerdown", engine.onVerticalDragStart), и внутри
// this === divider. Поэтому они объявлены обычными `function` и присвоены
// полям в конструкторе, а ctx получают через замыкание, а не через this.
// Остальные (onDragMove/onDragEnd/handleGlobalPointerMove) — стрелочные поля
// класса: привязанный this можно без потери контекста передавать в
// app.stage.on/off и addEventListener/removeEventListener.
//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import RenderContext from "./RenderContext.ts";
import { UM_PARAMS } from "./../Const.ts";
import { createTsargaData, isTsargaEligibleWidth, applyTsargaToRow } from "./../Tsarga.ts";
import { WARDROBE_SECTION_WIDTH_MIN, WARDROBE_SECTION_WIDTH_MAX, WARDROBE_CANVAS_PADDING_PX } from "@/Application/F-wardrobeData.ts";
import { getWardrobeSectionInstallableHeight, getWardrobeShelfDepth, getWardrobeShelfPixiHeight, resolveWardrobeShelfDragPositionY } from "./../WardrobeSystem.ts";
import { WARDROBE_COLORS, getWardrobeShelfColors } from "./WardrobeColors.ts";
import { createWardrobeGapDimension, WARDROBE_SHELF_HIGHLIGHT_COLOR } from "./SceneBuilder.ts";

const { RASPASHNOY_ID, MIN_SECTION_WIDTH, MIN_SECTION_HEIGHT } = UM_PARAMS;

export default class DividerDragEngine {
    ctx: RenderContext
    onVerticalDragStart: (event: any) => void
    onHorizontalDragStart: (event: any) => void
    onWardrobeProfileDragStart: (event: any) => void
    onWardrobeProfileClick: (event: any) => void
    onWardrobeShelfDragStart: (event: any) => void

    // Гардеробная система (временно, черновик) — состояние драга профиля,
    // изолировано от ctx.dragState выше (тот сделан под box-UM cells/rows/
    // extras и слишком сильно на него завязан, чтобы безопасно переиспользовать
    // для плоских секторов гардеробной системы).
    private wardrobeDrag: {
        isDragging: boolean
        profileIndex: number | null
        startX: number
        leftStartWidth: number
        rightStartWidth: number
    } = { isDragging: false, profileIndex: null, startX: 0, leftStartWidth: 0, rightStartWidth: 0 }

    // Драг полки внутри сектора, только по вертикали. Границы НЕ фиксируются
    // на старте: коллизии перерешаются на каждый move по текущим позициям
    // соседей (WardrobeSystem.resolveWardrobeShelfDragPositionY), поэтому за
    // один драг полка может "перепрыгнуть" через другую.
    //
    // graphic/sectorWidthPx/sectorHeightPx/highlightGraphic — против фризов:
    // renderGrid() пересобирает всю сцену, поэтому во время move он не
    // зовётся вовсе, а перерисовывается только graphic самой полки
    // (onWardrobeShelfDragMove) — O(1) вместо O(N), как у box-UM
    // Shape.setupDraggable. highlightGraphic на время драга прячем.
    //
    // nameLabel/baseName/dimensionMode — подпись полки (в режиме 'floor' она
    // же показывает расстояние до пола) едет и обновляет текст живьём прямой
    // мутацией PIXI Text; baseName/dimensionMode за один Y-драг не меняются,
    // считаются один раз.
    //
    // absX/absY/gapDimensionContainers — режим 'gap': живьём обновляются
    // только ДВЕ линии зазора, касающиеся полки (соседи снизу и сверху) —
    // вся секция вернула бы фризы. absX/absY (абсолютные координаты канваса)
    // считаются один раз; gapDimensionContainers пересоздаются на каждый
    // move, т.к. число линий (0/1/2) и пары соседей меняются. Оригинальные
    // линии из renderGrid() убираются один раз в onWardrobeShelfDragStart.
    private wardrobeShelfDrag: {
        isDragging: boolean
        secIndex: number | null
        shelfId: number | null
        startY: number
        startPositionY: number
        graphic: any
        sectorWidthPx: number
        sectorHeightPx: number
        highlightGraphic: any
        nameLabel: any
        baseName: string
        dimensionMode: 'gap' | 'floor'
        absX: number
        absY: number
        gapDimensionContainers: any[]
        gapLinesInitialized: boolean
    } = {
        isDragging: false, secIndex: null, shelfId: null, startY: 0, startPositionY: 0,
        graphic: null, sectorWidthPx: 0, sectorHeightPx: 0, highlightGraphic: null,
        nameLabel: null, baseName: '', dimensionMode: 'floor',
        absX: 0, absY: 0, gapDimensionContainers: [], gapLinesInitialized: false,
    }

    // Троттлинг renderGrid() до 1 раза за кадр (requestAnimationFrame) во
    // время живого драга: pointermove приходит чаще, чем экран рисует кадры
    // (высокочастотная мышь), а renderGrid() каждый раз ПОЛНОСТЬЮ
    // перестраивает сцену — секторы/профили/полки/подписи/размерные линии, и
    // на большом числе объектов это давало фризы. Клампинг и коллизии
    // по-прежнему считаются на КАЖДЫЙ move (позиция под курсором должна быть
    // актуальной) — троттлится только перерисовка, которая всё равно не
    // покажет больше кадров, чем успевает экран.
    private wardrobeRenderScheduled = false
    private wardrobeRenderRafId: number | null = null

    private scheduleWardrobeRender() {
        if (this.wardrobeRenderScheduled) return
        this.wardrobeRenderScheduled = true
        this.wardrobeRenderRafId = requestAnimationFrame(() => {
            this.wardrobeRenderScheduled = false
            this.wardrobeRenderRafId = null
            this.ctx.renderGrid()
        })
    }

    // Вызывается на dragEnd — resetModule() ниже сам делает полный
    // пересчёт+рендер, поэтому отложенный renderGrid() от последнего move
    // (если он ещё не успел сработать) больше не нужен — иначе получился бы
    // лишний, избыточный кадр перерисовки сразу после resetModule().
    private cancelScheduledWardrobeRender() {
        if (this.wardrobeRenderRafId !== null) {
            cancelAnimationFrame(this.wardrobeRenderRafId)
            this.wardrobeRenderRafId = null
        }
        this.wardrobeRenderScheduled = false
    }

    constructor(ctx: RenderContext) {
        this.ctx = ctx
        const engine = this

        // Обработчик для вертикального перетаскивания (между колонками).
        // this внутри === divider (PIXI Graphics, на который навешан этот листенер).
        this.onVerticalDragStart = function (event) {
            const ctx = engine.ctx

            const module = ctx.props.module;
            if (module.productID === RASPASHNOY_ID) return

            // event.stopPropagation();
            ctx.cursorCheck = true;
            const sectionIndex = this.section;
            const cellIndex = this.cell;
            const rowIndex = this.row;
            const extraIndex = this.extra;

            const column = module.sections[sectionIndex];
            const cell = column.cells?.[cellIndex];
            const row = cell?.cellsRows?.[rowIndex];
            const extra = row?.extras?.[extraIndex];

            const cur = row || cell || column;

            let next = {};
            let nextSector, curSector;
            switch (cur.type) {
                case "section":
                    if (!cur.sector) {
                        curSector =
                            cur.cells[0].sector ||
                            cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].sector ||
                            cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].extras[0]
                                .sector;
                    } else curSector = cur.sector;

                    next = module.sections[sectionIndex + 1];
                    if (!next.sector) {
                        nextSector =
                            next.cells[0].sector ||
                            next.cells[0].cellsRows[0].sector ||
                            next.cells[0].cellsRows[next.cells[0].cellsRows.length - 1].extras[0]
                                .sector;
                    } else nextSector = next.sector;
                    break;
                case "cell":
                    if (!cur.sector) {
                        curSector =
                            cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].sector ||
                            cur.cells[0].cellsRows[cur.cells[0].cellsRows.length - 1].extras[0]
                                .sector;
                    } else curSector = cur.sector;

                    next = module.sections[sectionIndex + 1];
                    if (!next.sector) {
                        nextSector =
                            next.cells[0].sector ||
                            next.cells[0].cellsRows[0].sector ||
                            next.cells[0].cellsRows[next.cells[0].cellsRows.length - 1].extras[0]
                                .sector;
                    } else nextSector = next.sector;
                    break;
                case "rowCell":
                    if (!cur.sector) {
                        curSector = cur.extras[0].sector;
                    } else curSector = cur.sector;

                    next = cell.cellsRows[rowIndex + 1];

                    if (!next.sector) {
                        nextSector = next.extras[0].sector;
                    } else nextSector = next.sector;
                    break;
                case "rowExtra":
                    curSector = cur.sector;

                    next = cell.cellsRows[rowIndex + 1];
                    if (!next.sector) {
                        nextSector = next.extras[0].sector;
                    } else nextSector = next.sector;
                    break;
            }

            ctx.dragState.isDragging = true;
            ctx.dragState.type = "vertical";

            ctx.dragState.secIndex = sectionIndex;
            ctx.dragState.cellIndex = cellIndex;
            ctx.dragState.rowIndex =
                rowIndex !== null && cell.cellsRows[rowIndex + 1] ? rowIndex : null;
            ctx.dragState.extraIndex = null;
            ctx.dragState.startX = event.data.global.x;

            ctx.dragState.startLeftWidth = cur.width;
            ctx.dragState.startRightWidth = next.width;

            let curMin = cur.maxX;
            if (cur.cells?.length) {
                let count = 1;
                cur.cells.forEach((elem) => {
                    if (elem.cellsRows?.length > count) {
                        count = elem.cellsRows.length;
                    }
                });

                curMin = Math.max(
                    curMin,
                    MIN_SECTION_WIDTH * count + module.moduleThickness * (count - 1),
                );
                ctx.dragState.minXleft = curMin;
            } else
                ctx.dragState.minXleft = ctx.shapeAdjuster.getLeftSectionWidth(curSector, curMin);

            let nextMin = next.minX;
            if (next.cells?.length) {
                let count = 1;
                next.cells.forEach((elem) => {
                    if (elem.cellsRows?.length > count) {
                        count = elem.cellsRows.length;
                    }
                });

                nextMin = Math.max(
                    nextMin,
                    MIN_SECTION_WIDTH * count + module.moduleThickness * (count - 1),
                );
                ctx.dragState.minXRight = nextMin;
            } else
                ctx.dragState.minXRight = ctx.shapeAdjuster.getRightSectionWidth(
                    nextSector,
                    nextMin,
                );

            ctx.dragState.element = this;
            this.onDrag = true;

            ctx.app.stage.on("pointermove", engine.onDragMove);
            ctx.app.stage.on("pointerup", engine.onDragEnd);
            ctx.app.stage.on("pointerupoutside", engine.onDragEnd);
        }

        // Обработчик для горизонтального перетаскивания (между строками).
        // this внутри === divider (PIXI Graphics, на который навешан этот листенер).
        this.onHorizontalDragStart = function (event) {
            const ctx = engine.ctx
            // event.stopPropagation();
            const module = ctx.props.module;
            // event.stopPropagation();
            ctx.cursorCheck = true;
            const sectionIndex = this.section;
            const cellIndex = this.cell;
            const rowIndex = this.row;
            const extraIndex = this.extra;

            const column = module.sections[sectionIndex];
            const cell = column.cells?.[cellIndex];
            const row = cell?.cellsRows?.[rowIndex];
            const extra = row?.extras?.[extraIndex];

            const cur = extra || row || cell;

            let next = {};
            let nextSector, curSector;
            switch (cur.type) {
                case "cell":
                    if (!cur.sector) {
                        curSector =
                            cur.cellsRows[0].sector ||
                            cur.cellsRows[0].extras[cur.cellsRows[0].extras.length - 1].sector;
                    } else curSector = cur.sector;

                    next = column.cells[cellIndex + 1];
                    if (!next.sector) {
                        nextSector =
                            next.cellsRows[0].sector || next.cellsRows[0].extras[0].sector;
                    } else nextSector = next.sector;
                    break;
                case "rowCell":
                    if (!cur.sector) {
                        curSector = cur.extras[cur.extras.length - 1].sector;
                    } else curSector = cur.sector;

                    next = cell.cellsRows[rowIndex + 1];

                    if (!next.sector) {
                        nextSector = next.extras[0].sector;
                    } else nextSector = next.sector;
                    break;
                case "rowExtra":
                    curSector = cur.sector;
                    next = row.extras[extraIndex + 1];
                    nextSector = next.sector;
                    break;
            }

            // event.currentTarget.alpha = 0.5;
            ctx.dragState.element = this;
            this.onDrag = true;
            ctx.dragState.isDragging = true;
            ctx.dragState.type = "horizontal";

            ctx.dragState.secIndex = sectionIndex;
            ctx.dragState.cellIndex = cellIndex;
            ctx.dragState.rowIndex = rowIndex;
            ctx.dragState.extraIndex = extraIndex;

            ctx.dragState.startY = event.data.global.y;
            ctx.dragState.startTopHeight = cur.height;
            ctx.dragState.startBottomHeight = next.height;

            let curMin = cur.maxY;
            if (cur.cellsRows?.length) {
                let count = 1;
                cur.cellsRows.forEach((elem) => {
                    if (elem.extras?.length > count) {
                        count = elem.extras.length;
                    }
                });

                curMin = Math.max(
                    curMin,
                    MIN_SECTION_HEIGHT * count + module.moduleThickness * (count - 1),
                );
                ctx.dragState.minTop = curMin;
            } else ctx.dragState.minTop = ctx.shapeAdjuster.getSectionTop(curSector, curMin);

            ctx.dragState.minTop = Math.max(
                ctx.dragState.minTop,
                ctx.UMconstructor.value?.SHELVES.getCellMinHeight(cur, module) ?? MIN_SECTION_HEIGHT,
            );

            let nextMin = next.minY;
            if (next.cellsRows?.length) {
                let count = 1;
                next.cellsRows.forEach((elem) => {
                    if (elem.extras?.length > count) {
                        count = elem.extras.length;
                    }
                });

                nextMin = Math.max(
                    nextMin,
                    MIN_SECTION_HEIGHT * count + module.moduleThickness * (count - 1),
                );
                ctx.dragState.minBottom = nextMin;
            } else
                ctx.dragState.minBottom = ctx.shapeAdjuster.getSectionBottom(nextSector, nextMin);

            ctx.dragState.minBottom = Math.max(
                ctx.dragState.minBottom,
                ctx.UMconstructor.value?.SHELVES.getCellMinHeight(next, module) ?? MIN_SECTION_HEIGHT,
            );

            ctx.app.stage.on("pointermove", engine.onDragMove);
            ctx.app.stage.on("pointerup", engine.onDragEnd);
            ctx.app.stage.on("pointerupoutside", engine.onDragEnd);
        }

        // ==== Гардеробная система (WARDROBE) — временно, черновик ====
        // Драг профиля между двумя секторами (изменяет их ширину навстречу
        // друг другу). this внутри === profile (PIXI Graphics), как и у
        // onVerticalDragStart выше — тот же паттерн (обычная function,
        // не стрелочная, доступ к ctx через замыкание engine.ctx).
        // Крайние профили (0 и sections.length) не тянутся — им навешан
        // ДРУГОЙ обработчик, onWardrobeProfileClick ниже (только выбор, без
        // драга — см. SceneBuilder.createWardrobeProfile), сюда не попадают.
        this.onWardrobeProfileDragStart = function (event) {
            const ctx = engine.ctx
            const module = ctx.props.module
            const profileIndex = this.profileIndex

            // Выделение на КАЖДОЕ нажатие (как у полки в
            // onWardrobeShelfDragStart ниже): на эту запись в UM_STORE
            // реагируют watch'и в WardrobeMainView.vue/
            // WardrobeRightPanelView.vue, переключающие вкладки.
            ctx.selectWardrobeProfile(this.profileId)

            // ctx.wardrobeDragActive здесь НЕ выставляется, в отличие от драга
            // полки: профиль рендерится через scheduleWardrobeRender(), т.е.
            // полным renderGrid() каждый кадр (резайз профиля меняет ширину и
            // позицию сразу двух секторов и всех полок в них — инкрементально
            // это куда сложнее, чем одну Y-позицию полки). Раз рендер полный,
            // Text пропускать не нужно — подписи и размерные линии живут сами.
            ctx.cursorCheck = true
            engine.wardrobeDrag.isDragging = true
            engine.wardrobeDrag.profileIndex = profileIndex
            engine.wardrobeDrag.startX = event.data.global.x
            engine.wardrobeDrag.leftStartWidth = module.sections[profileIndex - 1].width
            engine.wardrobeDrag.rightStartWidth = module.sections[profileIndex].width

            ctx.app.stage.on("pointermove", engine.onWardrobeProfileDragMove)
            ctx.app.stage.on("pointerup", engine.onWardrobeProfileDragEnd)
            ctx.app.stage.on("pointerupoutside", engine.onWardrobeProfileDragEnd)
        }

        // ==== Гардеробная система (WARDROBE) — временно, черновик ====
        // Клик по КРАЙНЕМУ профилю (draggable=false в
        // SceneBuilder.createWardrobeProfile) — только выбор: ширину секторов
        // они не двигают, но настраиваются в "Настройка профилей"
        // (высота/крепление/цвет). renderGrid() не нужен —
        // SelectionHighlighter.selectWardrobeProfile переключает .visible на
        // уже отрисованных объектах.
        this.onWardrobeProfileClick = function (event) {
            const ctx = engine.ctx
            ctx.selectWardrobeProfile(this.profileId)
        }

        // ==== Гардеробная система (WARDROBE) — временно, черновик ====
        // Драг полки внутри сектора (только по вертикали). this внутри ===
        // graphic полки (PIXI Graphics), как и у onWardrobeProfileDragStart
        // выше — тот же паттерн (обычная function, доступ к ctx через
        // замыкание engine.ctx). secIndex/shelfId записаны прямо на graphic
        // при отрисовке (см. SceneBuilder.createWardrobeShelf).
        this.onWardrobeShelfDragStart = function (event) {
            const ctx = engine.ctx
            const module = ctx.props.module
            const secIndex = this.secIndex
            const shelfId = this.shelfId

            const section = module.sections[secIndex]
            const shelf = section?.wardrobeShelves?.find((s) => s.id === shelfId)
            if (!shelf) return

            // См. RenderContext.wardrobeDragActive — на время драга рендер
            // пропускает Text-объекты. UM_STORE.wardrobeDragActive — то же
            // самое, но реактивное: Vue-компоненты (WardrobeFillingsView.vue)
            // простого поля RenderContext не видят. Держим обе копии синхронно.
            ctx.wardrobeDragActive = true
            if (ctx.UMconstructor?.value) ctx.UMconstructor.value.UM_STORE.wardrobeDragActive = true

            // Выделение на КАЖДОЕ нажатие, а не только на реальный драг —
            // клик без сдвига мыши тоже выделяет (как box-UM
            // filling.graphic.on('pointerdown')). Вкладки "Наполнение"/
            // "Конфигурация" переключаются watch'ами на эту запись в UM_STORE.
            ctx.selectCell("fillings", { sec: secIndex, cell: null, row: null, extra: null, item: shelfId })

            ctx.cursorCheck = true
            engine.wardrobeShelfDrag.isDragging = true
            engine.wardrobeShelfDrag.secIndex = secIndex
            engine.wardrobeShelfDrag.shelfId = shelfId
            engine.wardrobeShelfDrag.startY = event.data.global.y
            engine.wardrobeShelfDrag.startPositionY = shelf.positionY

            // Прямая манипуляция PIXI-объектом полки вместо renderGrid() на
            // каждый move (см. поле wardrobeShelfDrag выше); this === graphic
            // полки. sectorWidthPx/sectorHeightPx за этот драг не меняются
            // (тянем только Y одной полки), поэтому считаются один раз.
            engine.wardrobeShelfDrag.graphic = this
            engine.wardrobeShelfDrag.sectorWidthPx = ctx.getPixelWidth(section.width)
            engine.wardrobeShelfDrag.sectorHeightPx = ctx.getPixelHeight(module.height)

            // Контур выделения (SceneBuilder.createWardrobeSector,
            // ctx.wardrobeShelvesMap) во время драга остаётся видимым и
            // перерисовывается на каждый move в onWardrobeShelfDragMove — так
            // же, как graphic полки (.clear()+.rect()+.stroke() на
            // существующем объекте), но в АБСОЛЮТНЫХ координатах:
            // highlightGraphics лежит в lablesContainer, не внутри sector.
            const shelfMapEntry = ctx.wardrobeShelvesMap?.find(
                (e) => e.data.sec === secIndex && e.data.id === shelfId,
            )
            engine.wardrobeShelfDrag.highlightGraphic = shelfMapEntry?.highlightGraphics ?? null

            // Именная подпись — живьём двигается/переписывается на каждый
            // move (уточнение пользователя), см. onWardrobeShelfDragMove.
            // baseName/dimensionMode те же формулы, что и в SceneBuilder.
            // createWardrobeSector — считаются один раз здесь, не на каждый
            // move (не меняются в течение ОДНОГО Y-драга полки).
            engine.wardrobeShelfDrag.nameLabel = shelfMapEntry?.nameLabel ?? null
            const shelfIndex = section.wardrobeShelves.findIndex((s) => s.id === shelfId)
            engine.wardrobeShelfDrag.baseName = shelf.kind === 'rail' ? `Штанга ${shelfIndex + 1}` : `Полка ${shelfIndex + 1}`
            engine.wardrobeShelfDrag.dimensionMode = ctx.UMconstructor?.value?.UM_STORE.wardrobeShelfDimensionMode ?? 'floor'

            // Режим 'gap' — размерные линии зазора живьём, см. комментарий у
            // поля wardrobeShelfDrag. absX/absY — та же формула, что в
            // renderWardrobeGrid/createWardrobeSector (section.xOffset —
            // позиция сектора в модуле, WARDROBE_CANVAS_PADDING_PX — отступ
            // канваса).
            //
            // ИСХОДНЫЕ линии (из последнего renderGrid()) здесь НЕ убираются:
            // pointerdown запускает этот обработчик и на простом клике без
            // движения — тогда onWardrobeShelfDragMove не пересоздаст их, а
            // resetModule() на dragEnd откладывает renderGrid() на 100мс
            // (debounce в UMconstructorClass.reset()), и значения заметно
            // "пропадали". Удаление отложено до ПЕРВОГО реального move (см.
            // gapLinesInitialized в onWardrobeShelfDragMove).
            engine.wardrobeShelfDrag.absX = section.xOffset + WARDROBE_CANVAS_PADDING_PX
            engine.wardrobeShelfDrag.absY = WARDROBE_CANVAS_PADDING_PX
            engine.wardrobeShelfDrag.gapDimensionContainers = []
            engine.wardrobeShelfDrag.gapLinesInitialized = false

            ctx.app.stage.on("pointermove", engine.onWardrobeShelfDragMove)
            ctx.app.stage.on("pointerup", engine.onWardrobeShelfDragEnd)
            ctx.app.stage.on("pointerupoutside", engine.onWardrobeShelfDragEnd)
        }
    }

    onDragMove = (event) => {
        const ctx = this.ctx
        if (!event) return;
        ctx.lastDragEvent.value = event;
    }

    updateRowTsarga(row, isCellRoof = false) {
        const ctx = this.ctx
        if (!ctx.hasTsargaProduct.value) {
            delete row.tsarga;
            row.extras?.forEach(extra => delete extra.tsarga);
            return;
        }
        applyTsargaToRow(row, isCellRoof, ctx.hasMetalTsarga.value);
    }

    dragMove(event) {
        const ctx = this.ctx
        if (!ctx.dragState.isDragging || !ctx.lastDragEvent.value) return;
        const {
            type,
            secIndex,
            cellIndex,
            rowIndex,
            extraIndex,
            startX,
            startY,
            startLeftWidth,
            startRightWidth,
            startTopHeight,
            startBottomHeight,
            minXleft,
            minXRight,
            minTop,
            minBottom,
            element,
        } = ctx.dragState;

        if (type === "vertical") {
            // Infinity не спасается через ||, поэтому проверяем isFinite явно
            let curMin = !Number.isFinite(minXleft) || minXleft < MIN_SECTION_WIDTH ? MIN_SECTION_WIDTH : minXleft;
            let nextMin = !Number.isFinite(minXRight) || minXRight < MIN_SECTION_WIDTH ? MIN_SECTION_WIDTH : minXRight;

            const deltaPixels = event.data.global.x - startX;

            element.position.x =
                Math.floor(event.data.global.x / ctx.props.step) * ctx.props.step;
            let deltaMm =
                Math.floor((deltaPixels * ctx.pixelRatioWidth.value) / ctx.props.step) *
                ctx.props.step;

            if (deltaMm === 0) return;

            let section = ctx.props.module.sections[secIndex];
            let cell = section.cells[cellIndex];
            let row = cell?.cellsRows?.[rowIndex];
            let extra = row?.extras?.[extraIndex];

            // Calculate new dimensions
            let newLeftWidth = startLeftWidth + deltaMm;
            let newRightWidth = startRightWidth - deltaMm;

            // Enforce minimum dimensions
            if (newLeftWidth < curMin) {
                deltaMm += curMin - newLeftWidth;
                newLeftWidth = curMin;
                newRightWidth = startRightWidth - deltaMm;
            } else if (newRightWidth < nextMin) {
                deltaMm -= nextMin - newRightWidth;
                newRightWidth = nextMin;
                newLeftWidth = startLeftWidth + deltaMm;
            }

            if (row) {
                const deltaLeft = row.width - newLeftWidth;
                row.position.x -= deltaLeft / 2;
                row.width = newLeftWidth;
                this.updateRowTsarga(row, cellIndex === 0);

                row.extras?.forEach((item) => {
                    item.width = row.width;
                    item.position.x = row.position.x;

                    if (item.fillings?.length) {
                        item.fillings.forEach((filling) => {
                            filling.width = item.width;
                            filling.size.x = filling.width;
                        });
                    }
                });

                let nextRow = cell.cellsRows[rowIndex + 1];
                let delta2 = nextRow.width - newRightWidth;
                nextRow.position.x += delta2 / 2;
                nextRow.width = newRightWidth;
                this.updateRowTsarga(nextRow, cellIndex === 0);

                nextRow.extras?.forEach((item) => {
                    item.width = nextRow.width;
                    item.position.x = nextRow.position.x;

                    if (item.fillings?.length) {
                        item.fillings.forEach((filling) => {
                            filling.width = item.width;
                            filling.size.x = filling.width;
                        });
                    }
                });

                if (row.fillings?.length) {
                    row.fillings.forEach((filling) => {
                        filling.width = row.width;
                        filling.size.x = filling.width;
                    });
                }

                if (nextRow.fillings?.length) {
                    nextRow.fillings.forEach((filling) => {
                        filling.width = nextRow.width;
                        filling.size.x = filling.width;
                        filling.position.x += delta2 / 2;
                    });
                }
            } else {
                let next = ctx.props.module.sections[secIndex + 1];
                let prev = ctx.props.module.sections[secIndex - 1];

                let nextSection = next || prev;

                if (newLeftWidth > ctx.effectiveMaxSectionWidth.value) {
                    deltaMm -= newLeftWidth - ctx.effectiveMaxSectionWidth.value;
                    newLeftWidth = ctx.effectiveMaxSectionWidth.value;
                    newRightWidth = startRightWidth - deltaMm;
                } else if (newRightWidth > ctx.effectiveMaxSectionWidth.value) {
                    deltaMm += newRightWidth - ctx.effectiveMaxSectionWidth.value;
                    newRightWidth = ctx.effectiveMaxSectionWidth.value;
                    newLeftWidth = startLeftWidth + deltaMm;
                }

                let delta1 = section.width - newLeftWidth;
                let deltaPos1 = next ? -delta1 / 2 : delta1 / 2;
                section.width = newLeftWidth;
                section.position.x += deltaPos1;

                section.cells.forEach((cell, cellIdx) => {
                    cell.width = section.width;
                    cell.position.x = section.position.x;
                    if (cell.cellsRows?.length) {
                        delete cell.tsarga;
                    } else {
                        this.updateRowTsarga(cell, cellIdx === 0);
                    }

                    if (cell.cellsRows?.length) {
                        let divideDelta = Math.floor(-delta1 / cell.cellsRows.length);
                        let divideDeltaPos1 = next ? divideDelta / 2 : -divideDelta / 2;
                        let extraSize =
                            (cell.cellsRows.length - 1) * ctx.currentModule.value.moduleThickness;

                        cell.cellsRows.forEach((item) => {
                            if (item.width + divideDelta >= MIN_SECTION_WIDTH) {
                                item.width += divideDelta;
                                this.updateRowTsarga(item, cellIdx === 0);
                                item.position.x += divideDeltaPos1;

                                item.extras?.forEach((extra) => {
                                    extra.width = item.width;
                                    extra.position.x = item.position.x;

                                    if (extra.fillings?.length) {
                                        extra.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.x += divideDeltaPos1;
                                            } else {
                                                filling.width = extra.width;
                                                filling.size.x = filling.width;
                                                filling.position.x = item.position.x - item.width / 2;
                                            }
                                        });
                                    }
                                });

                                if (item.fillings?.length) {
                                    item.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += divideDeltaPos1;
                                        } else {
                                            filling.width = item.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = item.position.x - item.width / 2;
                                        }
                                    });
                                }
                            } else {
                                item.width = MIN_SECTION_WIDTH;
                                this.updateRowTsarga(item, cellIdx === 0);
                            }

                            extraSize += item.width;
                        });

                        let lastRow = next
                            ? cell.cellsRows[cell.cellsRows.length - 1]
                            : cell.cellsRows[0];
                        if (lastRow.width + (newLeftWidth - extraSize) >= MIN_SECTION_WIDTH) {
                            lastRow.width += newLeftWidth - extraSize;
                            this.updateRowTsarga(lastRow, cellIdx === 0);
                            lastRow.position.x += (newLeftWidth - extraSize) / 2;

                            lastRow.fillings?.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.x += (newLeftWidth - extraSize) / 2;
                                } else {
                                    filling.width = lastRow.width;
                                    filling.size.x = filling.width;
                                    filling.position.x = lastRow.position.x - lastRow.width / 2;
                                }
                            });

                            lastRow.extras?.forEach((extra) => {
                                extra.width = lastRow.width;
                                extra.position.x = lastRow.position.x;

                                extra.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (newLeftWidth - extraSize) / 2;
                                    } else {
                                        filling.width = extra.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = extra.position.x - extra.width / 2;
                                    }
                                });
                            });
                        } else {
                            lastRow = cell.cellsRows.find((item) => {
                                return (
                                    item.width + (newLeftWidth - extraSize) >= MIN_SECTION_WIDTH
                                );
                            });

                            if (lastRow) {
                                lastRow.width += newLeftWidth - extraSize;
                                this.updateRowTsarga(lastRow, cellIdx === 0);
                                lastRow.position.x += (newLeftWidth - extraSize) / 2;

                                lastRow.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (newLeftWidth - extraSize) / 2;
                                    } else {
                                        filling.width = lastRow.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = lastRow.position.x - lastRow.width / 2;
                                    }
                                });

                                lastRow.extras?.forEach((extra) => {
                                    extra.width = lastRow.width;
                                    extra.position.x = lastRow.position.x;

                                    extra.fillings?.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += (newLeftWidth - extraSize) / 2;
                                        } else {
                                            filling.width = extra.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = extra.position.x - extra.width / 2;
                                        }
                                    });
                                });
                            }
                        }
                    }

                    if (cell.fillings?.length) {
                        cell.fillings.forEach((filling) => {
                            if (filling.isVerticalItem) {
                                filling.position.x += deltaPos1;
                            } else {
                                filling.width = cell.width;
                                filling.size.x = filling.width;
                                filling.position.x = cell.position.x - cell.width / 2;
                            }
                        });
                    }
                });

                if (!section.cells.length) {
                    if (ctx.hasTsargaProduct.value && !ctx.hasMetalTsarga.value && isTsargaEligibleWidth(section.width)) {
                        section.tsarga = createTsargaData(section.width, section.position.x);
                    } else {
                        delete section.tsarga;
                    }
                }

                if (section.fillings?.length) {
                    section.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.x += deltaPos1;
                        } else {
                            filling.width = section.width;
                            filling.size.x = filling.width;
                            filling.position.x = section.position.x - section.width / 2;
                        }
                    });
                }

                let delta2 = nextSection.width - newRightWidth;
                nextSection.width = newRightWidth;
                nextSection.position.x += deltaPos1;

                nextSection.cells.forEach((cell, cellIdx) => {
                    cell.width = nextSection.width;
                    cell.position.x = nextSection.position.x;
                    if (cell.cellsRows?.length) {
                        delete cell.tsarga;
                    } else {
                        this.updateRowTsarga(cell, cellIdx === 0);
                    }

                    if (cell.cellsRows?.length) {
                        let divideDelta = Math.floor(-delta2 / cell.cellsRows.length);
                        let divideDeltaPos = next ? -divideDelta / 2 : divideDelta / 2;
                        let extraSize =
                            (cell.cellsRows.length - 1) * ctx.currentModule.value.moduleThickness;

                        cell.cellsRows.forEach((item) => {
                            if (item.width + divideDelta >= MIN_SECTION_WIDTH) {
                                item.width += divideDelta;
                                this.updateRowTsarga(item, cellIdx === 0);
                                item.position.x += divideDeltaPos;

                                item.extras?.forEach((extra) => {
                                    extra.width = item.width;
                                    extra.position.x = item.position.x;

                                    if (extra.fillings?.length) {
                                        extra.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.x += divideDeltaPos;
                                            } else {
                                                filling.width = extra.width;
                                                filling.size.x = filling.width;
                                                filling.position.x = extra.position.x - extra.width / 2;
                                            }
                                        });
                                    }
                                });

                                if (item.fillings?.length) {
                                    item.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += divideDeltaPos;
                                        } else {
                                            filling.width = item.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = item.position.x - item.width / 2;
                                        }
                                    });
                                }
                            } else {
                                item.width = MIN_SECTION_WIDTH;
                                this.updateRowTsarga(item, cellIdx === 0);
                            }

                            extraSize += item.width;
                        });

                        let lastRow = next
                            ? cell.cellsRows[0]
                            : cell.cellsRows[cell.cellsRows.length - 1];

                        if (
                            lastRow.width + (newRightWidth - extraSize) >=
                            MIN_SECTION_WIDTH
                        ) {
                            lastRow.width += newRightWidth - extraSize;
                            this.updateRowTsarga(lastRow, cellIdx === 0);
                            lastRow.position.x += (newRightWidth - extraSize) / 2;

                            lastRow.fillings?.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.x += (newRightWidth - extraSize) / 2;
                                } else {
                                    filling.width = lastRow.width;
                                    filling.size.x = filling.width;
                                    filling.position.x = lastRow.position.x - lastRow.width / 2;
                                }
                            });

                            lastRow.extras?.forEach((extra) => {
                                extra.width = lastRow.width;
                                extra.position.x = lastRow.position.x;

                                extra.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (newRightWidth - extraSize) / 2;
                                    } else {
                                        filling.width = extra.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = extra.position.x - extra.width / 2;
                                    }
                                });
                            });
                        } else {
                            lastRow = cell.cellsRows.find((item) => {
                                return (
                                    item.width + (newRightWidth - extraSize) >= MIN_SECTION_WIDTH
                                );
                            });

                            if (lastRow) {
                                lastRow.width += newRightWidth - extraSize;
                                this.updateRowTsarga(lastRow, cellIdx === 0);
                                lastRow.position.x += (newRightWidth - extraSize) / 2;

                                lastRow.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (newRightWidth - extraSize) / 2;
                                    } else {
                                        filling.width = lastRow.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = lastRow.position.x - lastRow.width / 2;
                                    }
                                });

                                lastRow.extras?.forEach((extra) => {
                                    extra.width = lastRow.width;
                                    extra.position.x = lastRow.position.x;

                                    extra.fillings?.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += (newRightWidth - extraSize) / 2;
                                        } else {
                                            filling.width = extra.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = extra.position.x - extra.width / 2;
                                        }
                                    });
                                });
                            }
                        }
                    }

                    if (cell.fillings?.length) {
                        cell.fillings.forEach((filling) => {
                            if (filling.isVerticalItem) {
                                filling.position.x += deltaPos1;
                            } else {
                                filling.width = cell.width;
                                filling.size.x = filling.width;
                                filling.position.x = cell.position.x - cell.width / 2;
                            }
                        });
                    }
                });

                if (!nextSection.cells.length) {
                    if (ctx.hasTsargaProduct.value && !ctx.hasMetalTsarga.value && isTsargaEligibleWidth(nextSection.width)) {
                        nextSection.tsarga = createTsargaData(nextSection.width, nextSection.position.x);
                    } else {
                        delete nextSection.tsarga;
                    }
                }

                if (nextSection.fillings?.length) {
                    nextSection.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.x += deltaPos1;
                        } else {
                            filling.width = nextSection.width;
                            filling.size.x = filling.width;
                            filling.position.x = nextSection.position.x - nextSection.width / 2;
                        }
                    });
                }
            }
        } else if (type === "horizontal") {
            // Infinity не спасается через ||, поэтому проверяем isFinite явно
            let curMin = !Number.isFinite(minTop) || minTop < MIN_SECTION_HEIGHT ? MIN_SECTION_HEIGHT : minTop;
            let nextMin = !Number.isFinite(minBottom) || minBottom < MIN_SECTION_HEIGHT ? MIN_SECTION_HEIGHT : minBottom;

            const deltaPixels = event.data.global.y - startY;

            element.position.y =
                Math.floor(event.data.global.y / ctx.props.step) * ctx.props.step;
            const deltaMm =
                Math.floor((deltaPixels * ctx.pixelRatioHeight.value) / ctx.props.step) *
                ctx.props.step;

            if (deltaMm === 0) return;

            let section = ctx.props.module.sections[secIndex];
            let cell = section.cells[cellIndex];
            let row = cell?.cellsRows?.[rowIndex];
            let extra = row?.extras?.[extraIndex];

            // Calculate new dimensions
            let newTopHeight = startTopHeight + deltaMm;
            let newBottomHeight = startBottomHeight - deltaMm;

            // Enforce minimum dimensions
            if (newTopHeight < curMin) {
                newTopHeight = curMin;
                newBottomHeight = startTopHeight + startBottomHeight - curMin;
            } else if (newBottomHeight < nextMin) {
                newBottomHeight = nextMin;
                newTopHeight = startTopHeight + startBottomHeight - nextMin;
            }

            if (extra) {

                let delta1 = newTopHeight - extra.height;
                extra.height = newTopHeight;
                extra.position.y += -delta1;

                let nextExtra = row.extras[extraIndex + 1];
                nextExtra.height = newBottomHeight;
            } else {

                let delta1 = cell.height - newTopHeight;
                cell.height = newTopHeight;
                cell.position.y += delta1;

                if (cell.cellsRows?.length) {
                    cell.cellsRows.forEach((row) => {
                        row.height = newTopHeight;
                        row.position.y = cell.position.y;

                        if (row.fillings?.length) {
                            row.fillings.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.y = row.position.y;
                                    filling.height = row.height;
                                    filling.size.y = filling.height;
                                    filling.distances.bottom = 0;
                                    filling.distances.top = 0;
                                }
                            });
                        }

                        if (row.extras?.length) {
                            let divideDelta = Math.floor(-delta1 / row.extras.length);
                            let divideDeltaPos1 = divideDelta;
                            let extraSize =
                                (row.extras.length - 1) * ctx.currentModule.value.moduleThickness;

                            row.extras.forEach((item) => {
                                if (item.height + divideDelta >= MIN_SECTION_HEIGHT) {
                                    item.height += divideDelta;

                                    if (item.fillings?.length) {
                                        item.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.y = item.position.y;
                                                filling.height = item.height;
                                                filling.size.y = filling.height;
                                                filling.distances.bottom = 0;
                                                filling.distances.top = 0;
                                            } else {
                                                filling.position.y += divideDeltaPos1;
                                            }
                                        });
                                    }
                                } else {
                                    item.height = MIN_SECTION_HEIGHT;
                                }

                                extraSize += item.height;
                            });

                            let lastRow = row.extras[row.extras.length - 1];
                            if (
                                lastRow.height + (newTopHeight - extraSize) >=
                                MIN_SECTION_HEIGHT
                            ) {
                                lastRow.height += newTopHeight - extraSize;
                                lastRow.position.y += (newTopHeight - extraSize) / 2;

                                if (lastRow.fillings?.length) {
                                    lastRow.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.y = lastRow.position.y;
                                            filling.height = lastRow.height;
                                            filling.size.y = filling.height;
                                            filling.distances.bottom = 0;
                                            filling.distances.top = 0;
                                        } else {
                                            filling.position.y += (newTopHeight - extraSize) / 2;
                                        }
                                    });
                                }
                            } else {
                                lastRow = row.extras.find((item) => {
                                    return (
                                        item.height + (newTopHeight - extraSize) >= MIN_SECTION_HEIGHT
                                    );
                                });

                                if (lastRow) {
                                    lastRow.height += newTopHeight - extraSize;
                                    lastRow.position.y += (newTopHeight - extraSize) / 2;

                                    if (lastRow.fillings?.length) {
                                        lastRow.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.y = lastRow.position.y;
                                                filling.height = lastRow.height;
                                                filling.size.y = filling.height;
                                                filling.distances.bottom = 0;
                                                filling.distances.top = 0;
                                            } else {
                                                filling.position.y += (newTopHeight - extraSize) / 2;
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    });
                }

                if (cell.fillings?.length) {
                    cell.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.y = cell.position.y;
                            filling.height = cell.height;
                            filling.size.y = filling.height;
                            filling.distances.bottom = 0;
                            filling.distances.top = 0;
                        }
                    });
                }

                let nextCell = ctx.props.module.sections[secIndex].cells[cellIndex + 1];
                let delta2 = nextCell.height - newBottomHeight;
                nextCell.height = newBottomHeight;

                if (nextCell.cellsRows) {
                    nextCell.cellsRows.forEach((row) => {
                        row.height = newBottomHeight;
                        row.position.y = nextCell.position.y;

                        if (row.fillings?.length) {
                            row.fillings.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.y = row.position.y;
                                    filling.height = row.height;
                                    filling.size.y = filling.height;
                                    filling.distances.bottom = 0;
                                    filling.distances.top = 0;
                                }
                            });
                        }

                        if (row.extras?.length) {
                            let divideDelta = Math.floor(-delta2 / row.extras.length);
                            let divideDeltaPos2 = -divideDelta;
                            let extraSize =
                                (row.extras.length - 1) * ctx.currentModule.value.moduleThickness;

                            row.extras.forEach((item) => {
                                if (item.height + divideDelta >= MIN_SECTION_HEIGHT) {
                                    item.height += divideDelta;
                                    item.position.y += divideDelta;

                                    if (item.fillings?.length) {
                                        item.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.y = item.position.y;
                                                filling.height = item.height;
                                                filling.size.y = filling.height;
                                                filling.distances.bottom = 0;
                                                filling.distances.top = 0;
                                            } else {
                                                filling.position.y += divideDeltaPos2;
                                            }
                                        });
                                    }
                                } else {
                                    item.height = MIN_SECTION_HEIGHT;
                                }

                                extraSize += item.height;
                            });

                            let lastRow = row.extras[0];
                            if (
                                lastRow.height + (newBottomHeight - extraSize) >=
                                MIN_SECTION_HEIGHT
                            ) {
                                lastRow.height += newBottomHeight - extraSize;
                                lastRow.position.y += (newBottomHeight - extraSize) / 2;

                                if (lastRow.fillings?.length) {
                                    lastRow.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.y = lastRow.position.y;
                                            filling.height = lastRow.height;
                                            filling.size.y = filling.height;
                                            filling.distances.bottom = 0;
                                            filling.distances.top = 0;
                                        } else {
                                            filling.position.y += (newBottomHeight - extraSize) / 2;
                                        }
                                    });
                                }
                            } else {
                                lastRow = row.extras.find((item) => {
                                    return (
                                        item.height + (newBottomHeight - extraSize) >=
                                        MIN_SECTION_HEIGHT
                                    );
                                });

                                if (lastRow) {
                                    lastRow.height += newBottomHeight - extraSize;
                                    lastRow.position.y += (newBottomHeight - extraSize) / 2;

                                    if (lastRow.fillings?.length) {
                                        lastRow.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.y = lastRow.position.y;
                                                filling.height = lastRow.height;
                                                filling.size.y = filling.height;
                                                filling.distances.bottom = 0;
                                                filling.distances.top = 0;
                                            } else {
                                                filling.position.y += (newBottomHeight - extraSize) / 2;
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    });
                }

                if (nextCell.fillings?.length) {
                    nextCell.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.y = nextCell.position.y;
                            filling.height = nextCell.height;
                            filling.size.y = filling.height;
                            filling.distances.bottom = 0;
                            filling.distances.top = 0;
                        }
                    });
                }
            }
        }

        ctx.renderGrid();
    }

    onDragEnd = (event) => {
        const ctx = this.ctx

        if (ctx.dragState.element) {
            delete ctx.dragState.element.onDrag;
            if (ctx.dragState.element.parent) {
                ctx.dragState.element.removeFromParent();
            }
            ctx.dragState.element.destroy();
        }

        ctx.dragState.element = null;
        ctx.dragState.isDragging = false;
        ctx.dragState.type = null;
        ctx.dragState.secIndex = null;
        ctx.dragState.cellIndex = null;
        ctx.dragState.rowIndex = null;
        ctx.dragState.curRoundMax = null;
        ctx.dragState.nextRoundMax = null;
        ctx.lastDragEvent.value = null;

        ctx.app.stage.off("pointermove", this.onDragMove);
        ctx.app.stage.off("pointerup", this.onDragEnd);
        ctx.app.stage.off("pointerupoutside", this.onDragEnd);
        ctx.cursorCheck = false;

        ctx.resetModule();
    }

    // ==== Гардеробная система (WARDROBE) — временно, черновик ====
    // Живое перетаскивание внутреннего профиля: сдвигает границу между
    // sections[profileIndex-1] и sections[profileIndex], клампится так,
    // чтобы обе стороны остались в [WARDROBE_SECTION_WIDTH_MIN, MAX] —
    // считаем допустимый диапазон самой дельты, а не клампим каждую ширину
    // по отдельности (иначе суммарная ширина module могла бы поехать).
    onWardrobeProfileDragMove = (event) => {
        const ctx = this.ctx
        const drag = this.wardrobeDrag
        if (!drag.isDragging || drag.profileIndex === null || !event) return

        const module = ctx.props.module
        const { profileIndex, startX, leftStartWidth, rightStartWidth } = drag

        const deltaXmm = ctx.getMmWidth(event.data.global.x - startX)

        const minDelta = Math.max(
            WARDROBE_SECTION_WIDTH_MIN - leftStartWidth,
            rightStartWidth - WARDROBE_SECTION_WIDTH_MAX,
        )
        const maxDelta = Math.min(
            WARDROBE_SECTION_WIDTH_MAX - leftStartWidth,
            rightStartWidth - WARDROBE_SECTION_WIDTH_MIN,
        )
        const clampedDelta = Math.max(minDelta, Math.min(maxDelta, deltaXmm))

        module.sections[profileIndex - 1].width = leftStartWidth + clampedDelta
        module.sections[profileIndex].width = rightStartWidth - clampedDelta

        this.scheduleWardrobeRender()
    }

    onWardrobeProfileDragEnd = () => {
        const ctx = this.ctx

        this.cancelScheduledWardrobeRender()
        this.wardrobeDrag.isDragging = false
        this.wardrobeDrag.profileIndex = null
        ctx.cursorCheck = false

        ctx.app.stage.off("pointermove", this.onWardrobeProfileDragMove)
        ctx.app.stage.off("pointerup", this.onWardrobeProfileDragEnd)
        ctx.app.stage.off("pointerupoutside", this.onWardrobeProfileDragEnd)

        ctx.resetModule()
    }

    // ==== Гардеробная система (WARDROBE) — временно, черновик ====
    // Живое перетаскивание полки по вертикали внутри своего сектора.
    // Коллизии с соседними полками/штангами и границы пола/потолка сектора
    // разрешаются ЗАНОВО на каждое движение мыши (см.
    // WardrobeSystem.resolveWardrobeShelfDragPositionY) — не статичный
    // клампинг к исходным соседям, а динамическое разрешение, позволяющее
    // "перепрыгивать" через объекты за один драг, если по пути есть
    // свободный промежуток (по требованию пользователя).
    onWardrobeShelfDragMove = (event) => {
        const ctx = this.ctx
        const drag = this.wardrobeShelfDrag
        if (!drag.isDragging || drag.secIndex === null || !event) return

        const module = ctx.props.module
        const section = module.sections[drag.secIndex]
        const shelf = section?.wardrobeShelves?.find((s) => s.id === drag.shelfId)
        if (!shelf) return

        const deltaYpx = event.data.global.y - drag.startY
        // Экран/PIXI: Y растёт вниз. positionY (мм от пола) растёт вверх —
        // движение мыши ВВЕРХ (deltaYpx < 0) должно УВЕЛИЧИВАТЬ positionY.
        const deltaPositionYmm = -ctx.getMmHeight(deltaYpx)
        const rawY = drag.startPositionY + deltaPositionYmm

        // Те же величины, что раньше считались один раз в onWardrobeShelfDragStart
        // (см. комментарий у WardrobeSystem.getWardrobeShelfDepth/
        // getWardrobeSectionInstallableHeight) — теперь нужны на каждый move,
        // т.к. разрешение коллизий больше не кэшируется в начале драга.
        const depthMm = getWardrobeShelfDepth(module)
        const ceilingHeight = getWardrobeSectionInstallableHeight(module, drag.secIndex)

        shelf.positionY = resolveWardrobeShelfDragPositionY(
            section.wardrobeShelves, drag.shelfId, depthMm, ceilingHeight, rawY, module.productID,
        )

        // Прямая перерисовка ТОЛЬКО graphic перетаскиваемой полки (+ её
        // именной подписи ниже) — НЕ renderGrid() (см. подробный комментарий
        // у поля wardrobeShelfDrag). Формула topPx/heightPx идентична
        // SceneBuilder.createWardrobeShelf (та же полка) — единственная
        // разница: перерисовка уже СУЩЕСТВУЮЩИХ объектов (.clear()+заново
        // для Graphics, прямое присвоение .position/.text для Text), а не
        // создание новых. Всё остальное на сцене (соседние полки/профили/
        // подписи секторов и профилей) не трогается вовсе.
        const shelfHeightMm = getWardrobeShelfPixiHeight(shelf, depthMm, module.productID)
        const heightPx = Math.max(ctx.getPixelHeight(shelfHeightMm), 2)
        const bottomPx = drag.sectorHeightPx - ctx.getPixelHeight(Math.max(shelf.positionY, 0))
        const topPx = bottomPx - heightPx

        if (drag.graphic) {
            const isGlass = shelf.material === 'glass'
            const shelfColors = getWardrobeShelfColors(shelf)

            drag.graphic.clear()
            drag.graphic.rect(0, topPx, drag.sectorWidthPx, heightPx)
            drag.graphic.fill({ color: shelfColors.fill, alpha: isGlass ? WARDROBE_COLORS.shelf.glassAlpha : 1 })
            drag.graphic.stroke({ width: 1, color: shelfColors.stroke, alignment: 1 })
        }

        // Контур выделения (уточнение пользователя: "пропало выделение
        // полки на канвасе при драге") — АБСОЛЮТНЫЕ координаты (в отличие от
        // graphic полки выше, лежит в ctx.sectionLables/lablesContainer, не
        // внутри sector — своей позиции/трансформации не наследует).
        if (drag.highlightGraphic) {
            drag.highlightGraphic.clear()
            drag.highlightGraphic.rect(drag.absX, drag.absY + topPx, drag.sectorWidthPx, heightPx)
            drag.highlightGraphic.stroke({ width: 2, color: WARDROBE_SHELF_HIGHLIGHT_COLOR, alignment: 1 })
        }

        // Именная подпись (уточнение пользователя: "верни реактивность для
        // элементов обозначения расстояний и наименований") — двигается
        // вместе с полкой; в режиме 'floor' в неё встроено ЗНАЧЕНИЕ
        // расстояния до пола (см. SceneBuilder.createWardrobeSector), его
        // тоже обновляем на каждый move. .position.x НЕ трогаем — не
        // меняется в течение Y-драга (по центру той же ширины сектора).
        if (drag.nameLabel) {
            drag.nameLabel.position.y = WARDROBE_CANVAS_PADDING_PX + topPx + heightPx / 2
            if (drag.dimensionMode === 'floor') {
                drag.nameLabel.text = `${drag.baseName} — ${Math.round(shelf.positionY)} мм`
            }
        }

        // Размерные линии зазора (режим 'gap', уточнение пользователя: "в
        // режиме между наполнениями не изменяется") — убираем те, что были
        // добавлены НА ПРЕДЫДУЩЕМ move, и создаём заново под ТЕКУЩИХ соседей
        // перетаскиваемой полки (не индексы, а актуальная сортировка по
        // positionY — соседи могли смениться, если полка "перепрыгнула"
        // через другую). Только 1-2 линии за кадр (сосед снизу/сверху), не
        // вся секция — см. подробный комментарий у поля wardrobeShelfDrag.
        if (drag.dimensionMode === 'gap') {
            // ПЕРВЫЙ move этого драга (не onWardrobeShelfDragStart — см. её
            // комментарий, "при клике... пропадают значения") — убираем
            // ИСХОДНЫЕ (из последнего renderGrid()) линии, касающиеся именно
            // этой полки, ОДИН раз; дальше в этом же move ниже они уже
            // пересоздаются под актуальных соседей.
            if (!drag.gapLinesInitialized) {
                drag.gapLinesInitialized = true
                const existingLines = ctx.wardrobeGapLinesMap[drag.secIndex] ?? []
                for (let i = existingLines.length - 1; i >= 0; i--) {
                    const line = existingLines[i]
                    if (line.lowerId !== drag.shelfId && line.upperId !== drag.shelfId) continue
                    if (line.container?.removeFromParent) line.container.removeFromParent()
                    existingLines.splice(i, 1)
                }
            }

            drag.gapDimensionContainers.forEach((c) => { if (c.removeFromParent) c.removeFromParent() })
            drag.gapDimensionContainers = []

            const sortedShelves = [...section.wardrobeShelves].sort((a, b) => a.positionY - b.positionY)
            const draggedIndex = sortedShelves.findIndex((s) => s.id === drag.shelfId)

            if (draggedIndex > 0) {
                const c = createWardrobeGapDimension(
                    ctx, sortedShelves[draggedIndex - 1], shelf, depthMm, module.productID,
                    drag.sectorHeightPx, drag.absX, drag.absY, drag.sectorWidthPx,
                )
                if (c) { ctx.lablesContainer.addChild(c); drag.gapDimensionContainers.push(c) }
            }
            if (draggedIndex !== -1 && draggedIndex < sortedShelves.length - 1) {
                const c = createWardrobeGapDimension(
                    ctx, shelf, sortedShelves[draggedIndex + 1], depthMm, module.productID,
                    drag.sectorHeightPx, drag.absX, drag.absY, drag.sectorWidthPx,
                )
                if (c) { ctx.lablesContainer.addChild(c); drag.gapDimensionContainers.push(c) }
            }
        }
    }

    onWardrobeShelfDragEnd = () => {
        const ctx = this.ctx

        this.cancelScheduledWardrobeRender()
        ctx.wardrobeDragActive = false
        if (ctx.UMconstructor?.value) ctx.UMconstructor.value.UM_STORE.wardrobeDragActive = false

        this.wardrobeShelfDrag.isDragging = false
        this.wardrobeShelfDrag.secIndex = null
        this.wardrobeShelfDrag.shelfId = null
        this.wardrobeShelfDrag.graphic = null
        this.wardrobeShelfDrag.highlightGraphic = null
        this.wardrobeShelfDrag.nameLabel = null
        this.wardrobeShelfDrag.gapDimensionContainers = []
        this.wardrobeShelfDrag.gapLinesInitialized = false
        ctx.cursorCheck = false

        ctx.app.stage.off("pointermove", this.onWardrobeShelfDragMove)
        ctx.app.stage.off("pointerup", this.onWardrobeShelfDragEnd)
        ctx.app.stage.off("pointerupoutside", this.onWardrobeShelfDragEnd)

        ctx.resetModule()
    }

    handleGlobalPointerMove = (event) => {
        const ctx = this.ctx
        // ctx.app сам по себе undefined до появления Object.assign(ctx, {app, ...})
        // внутри init() (см. Render2D.vue) — этот листенер, в отличие от остальных
        // мест, читающих ctx.app, висит на document с момента onMounted и может
        // сработать до завершения async-инициализации PIXI.
        if (!ctx.appReady || !ctx.app.renderer || !ctx.cursorCheck) return;

        const canvasRect = ctx.canvasContainer.value.getBoundingClientRect();

        const mouseX = event.clientX - canvasRect.left;
        const mouseY = event.clientY - canvasRect.top;

        if (
            mouseX < 0 ||
            mouseY < 0 ||
            mouseX > ctx.app.renderer.width ||
            mouseY > ctx.app.renderer.height
        ) {
            // console.log("Курсор вне холста (глобальная проверка)");
            this.onDragEnd();
        }
    }
}
