// ==== Гардеробная система (WARDROBE) ====
// Перетаскивание мышью в гардеробной сцене: внутренние профили (двигают
// границу между двумя секциями) и полки/штанги внутри секции (только по Y).
// Вынесено из DividerDragEngine.ts, где лежало рядом с box-UM драгом
// разделителей: общего кода не было — box-UM ctx.dragState сделан под
// cells/rows/extras и слишком на них завязан, чтобы переиспользовать для
// плоских секций гардеробной, поэтому состояние здесь своё
// (wardrobeDrag/wardrobeShelfDrag).
//
// Общее состояние — тот же RenderContext, что у остальных движков 2D-сцены.
// Хендлеры *DragStart/Click навешивает на PIXI-объекты WardrobeSceneBuilder
// через ctx.onWardrobe* — мост проставляется в Render2D.vue.
//
// onWardrobeProfileDragStart/Click/onWardrobeShelfDragStart объявлены обычными
// `function` и присвоены полям в конструкторе: PIXI зовёт их как
// profile.on("pointerdown", ...), и внутри this === сам PIXI-объект (оттуда
// берутся profileId/profileIndex/secIndex/shelfId). ctx получают через
// замыкание engine, а не через this. Остальные — стрелочные поля класса, их
// можно передавать в app.stage.on/off без потери контекста.
//@ts-nocheck

import RenderContext from "@/components/UMconstructor/utils/render2d/RenderContext.ts";
import { WARDROBE_SECTION_WIDTH_MIN, WARDROBE_SECTION_WIDTH_MAX, WARDROBE_CANVAS_PADDING_PX } from "@/Application/F-wardrobeData.ts";
import {
    getWardrobeSectionInstallableHeight,
    getWardrobeShelfDepth,
    getWardrobeShelfPixiHeight,
    resolveWardrobeShelfDragPositionY,
} from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import {
    createWardrobeGapDimension,
    WARDROBE_SHELF_HIGHLIGHT_COLOR,
    drawWardrobeItem,
    getWardrobeItemName,
    getWardrobeItemSpanPx,
} from "./WardrobeSceneBuilder.ts";

export default class WardrobeDragEngine {
    ctx: RenderContext
    onWardrobeProfileDragStart: (event: any) => void
    onWardrobeProfileClick: (event: any) => void
    onWardrobeShelfDragStart: (event: any) => void

    // Состояние драга профиля, изолировано от box-UM ctx.dragState (тот
    // сделан под cells/rows/extras и слишком сильно на них завязан, чтобы
    // безопасно переиспользовать для плоских секций гардеробной).
    private wardrobeDrag: {
        isDragging: boolean
        profileIndex: number | null
        startX: number
        leftStartWidth: number
        rightStartWidth: number
    } = { isDragging: false, profileIndex: null, startX: 0, leftStartWidth: 0, rightStartWidth: 0 }

    // Драг полки внутри секции, только по вертикали. Границы НЕ фиксируются
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
    // перестраивает сцену — секции/профили/полки/подписи/размерные линии, и
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

    // Вызывается на dragEnd — ctx.resetModule() сам делает полный
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


        // Драг профиля между двумя секциями (изменяет их ширину навстречу
        // друг другу). this внутри === profile (PIXI Graphics) — тот же
        // паттерн, что у box-UM DividerDragEngine.onVerticalDragStart (обычная
        // function, не стрелочная, доступ к ctx через замыкание engine.ctx).
        // Крайние профили (0 и sections.length) не тянутся — им навешан
        // ДРУГОЙ обработчик, onWardrobeProfileClick ниже (только выбор, без
        // драга — см. WardrobeSceneBuilder.createWardrobeProfile), сюда не попадают.
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
            // позицию сразу двух секций и всех полок в них — инкрементально
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


        // Клик по КРАЙНЕМУ профилю (draggable=false в
        // WardrobeSceneBuilder.createWardrobeProfile) — только выбор: ширину секций
        // они не двигают, но настраиваются в "Настройка профилей"
        // (высота/крепление/цвет). renderGrid() не нужен —
        // SelectionHighlighter.selectWardrobeProfile переключает .visible на
        // уже отрисованных объектах.
        this.onWardrobeProfileClick = function (event) {
            const ctx = engine.ctx
            ctx.selectWardrobeProfile(this.profileId)
        }


        // Драг полки внутри секции (только по вертикали). this внутри ===
        // graphic полки (PIXI Graphics), как и у onWardrobeProfileDragStart
        // выше — тот же паттерн (обычная function, доступ к ctx через
        // замыкание engine.ctx). secIndex/shelfId записаны прямо на graphic
        // при отрисовке (см. WardrobeSceneBuilder.createWardrobeShelf).
        this.onWardrobeShelfDragStart = function (event) {
            const ctx = engine.ctx
            const module = ctx.props.module
            const secIndex = this.secIndex
            const shelfId = this.shelfId

            const section = module.sections[secIndex]
            const shelf = section?.wardrobeFilling?.find((s) => s.id === shelfId)
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

            // Контур выделения (WardrobeSceneBuilder.createWardrobeSector,
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
            const shelfIndex = section.wardrobeFilling.findIndex((s) => s.id === shelfId)
            engine.wardrobeShelfDrag.baseName = getWardrobeItemName(shelf, shelfIndex)
            engine.wardrobeShelfDrag.dimensionMode = ctx.UMconstructor?.value?.UM_STORE.wardrobeShelfDimensionMode ?? 'floor'

            // Режим 'gap' — размерные линии зазора живьём, см. комментарий у
            // поля wardrobeShelfDrag. absX/absY — та же формула, что в
            // renderWardrobeGrid/createWardrobeSector (section.xOffset —
            // позиция секции в модуле, WARDROBE_CANVAS_PADDING_PX — отступ
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

        // Целые мм: из px получается дробь, а ширины секций — размеры изделия.
        const deltaXmm = Math.round(ctx.getMmWidth(event.data.global.x - startX))

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
    // Живое перетаскивание полки по вертикали внутри своей секции.
    // Коллизии с соседними полками/штангами и границы пола/потолка секции
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
        const shelf = section?.wardrobeFilling?.find((s) => s.id === drag.shelfId)
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
            section.wardrobeFilling, drag.shelfId, depthMm, ceilingHeight, rawY, module.productID,
        )

        // Прямая перерисовка ТОЛЬКО graphic перетаскиваемой полки (+ её
        // именной подписи ниже) — НЕ renderGrid() (см. подробный комментарий
        // у поля wardrobeShelfDrag). Формула topPx/heightPx идентична
        // WardrobeSceneBuilder.createWardrobeShelf (та же полка) — единственная
        // разница: перерисовка уже СУЩЕСТВУЮЩИХ объектов (.clear()+заново
        // для Graphics, прямое присвоение .position/.text для Text), а не
        // создание новых. Всё остальное на сцене (соседние полки/профили/
        // подписи секций и профилей) не трогается вовсе.
        const shelfHeightMm = getWardrobeShelfPixiHeight(shelf, depthMm, module.productID)
        const heightPx = Math.max(ctx.getPixelHeight(shelfHeightMm), 2)
        const bottomPx = drag.sectorHeightPx - ctx.getPixelHeight(Math.max(shelf.positionY, 0))
        const topPx = bottomPx - heightPx

        if (drag.graphic) {
            drag.graphic.clear()
            drawWardrobeItem(drag.graphic, ctx, shelf, drag.sectorWidthPx, topPx, heightPx)
        }

        // Контур выделения (уточнение пользователя: "пропало выделение
        // полки на канвасе при драге") — АБСОЛЮТНЫЕ координаты (в отличие от
        // graphic полки выше, лежит в ctx.sectionLables/lablesContainer, не
        // внутри sector — своей позиции/трансформации не наследует).
        if (drag.highlightGraphic) {
            const span = getWardrobeItemSpanPx(ctx, shelf, drag.sectorWidthPx)
            drag.highlightGraphic.clear()
            drag.highlightGraphic.rect(drag.absX + span.x, drag.absY + topPx, span.width, heightPx)
            drag.highlightGraphic.stroke({ width: 2, color: WARDROBE_SHELF_HIGHLIGHT_COLOR, alignment: 1 })
        }

        // Именная подпись (уточнение пользователя: "верни реактивность для
        // элементов обозначения расстояний и наименований") — двигается
        // вместе с полкой; в режиме 'floor' в неё встроено ЗНАЧЕНИЕ
        // расстояния до пола (см. WardrobeSceneBuilder.createWardrobeSector), его
        // тоже обновляем на каждый move. .position.x НЕ трогаем — не
        // меняется в течение Y-драга (по центру той же ширины секции).
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

            const sortedShelves = [...section.wardrobeFilling].sort((a, b) => a.positionY - b.positionY)
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
}
