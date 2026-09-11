// Общий контекст PIXI-движков 2D-редактора (SceneBuilder,
// SelectionHighlighter, ExternalSizeAdjuster, DividerDragEngine): PIXI
// Application и контейнеры, массивы объектов сцены, конверсия мм↔px,
// реактивное состояние/пропсы Render2D.vue, колбэки в менеджеры и соседние
// движки. Создаётся один раз в Render2D.vue::init() и передаётся в конструктор
// каждого движка — тот же паттерн инъекции, что в PixiMethods.ts.
//
// setModuleGrid — тонкая обёртка, оставшаяся в Render2D.vue (мутирует
// currentModule.value); движки читают её через ctx.
//
// План рефакторинга: C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md, Фаза 2.
//@ts-nocheck

export default class RenderContext {
    // PIXI Application и контейнеры
    app
    sectionsContainer
    lablesContainer
    dementionContainer
    fillingsContainer
    fasadesContainer
    loopsContainer
    handlesContainer
    shapeAdjuster

    // Флаг готовности приложения (устанавливается в Render2D.vue::init())
    appReady = false

    // Массивы отслеживаемых сценических объектов — общие ссылки, мутируются
    // на месте (push/length=0) всеми движками
    sections = []
    sectionLables = []
    deviders = []
    dementions = []
    fillings = []
    fillingsMap = []
    // Карта "полка/штанга -> highlightGraphics" для выделения по клику
    // (canvas <-> WardrobeFillingsView.vue), см.
    // SceneBuilder.createWardrobeSector/SelectionHighlighter.selectCell. Тот
    // же приём, что fillingsMap у box-UM; отдельный массив, т.к. полки не
    // используют тяжёлый Shape (у них своя drag-система).
    wardrobeShelvesMap = []
    // Карта "секция -> [{lowerId, upperId, container}]" для размерных линий
    // зазора (режим 'gap'). Ключ — ПАРА id соседних полок, а не индекс:
    // соседство по positionY меняется, когда полка "перепрыгивает" другую за
    // один драг. Нужна DividerDragEngine.onWardrobeShelfDragMove, чтобы
    // пересоздавать только линии у перетаскиваемой полки, а не всю секцию.
    wardrobeGapLinesMap = {}
    // Карта "профиль -> highlightGraphics" (canvas <-> WardrobeProfilesView.vue)
    // — как wardrobeShelvesMap, но выбор хранится в
    // UM_STORE.selectedWardrobeProfileId, а не в generic setSelected/
    // getSelected: профиль не привязан к секции и типу TSelectedCell.
    wardrobeProfilesMap = []
    // true во время активного драга ПОЛКИ (драг профиля флаг не ставит).
    // Полка во время драга не зовёт renderGrid() вовсе (прямая манипуляция
    // PIXI-объектами, см. DividerDragEngine.wardrobeShelfDrag), так что флаг
    // страхует лишь редкий случай, когда renderGrid() вызовет кто-то извне:
    // тогда SceneBuilder.createWardrobeSector пропустит Text-объекты для всех
    // полок секции. Полный рендер возвращается на dragEnd (resetModule()).
    wardrobeDragActive = false
    fasades = []
    loops = []
    handles = []

    // Живая конверсия мм↔px (ViewportUnits, инжектируется также в Shape/ShapeAdjuster/Section)
    getPixelWidth
    getPixelHeight
    getMmWidth
    getMmHeight

    // Реактивное состояние/пропсы Render2D.vue
    mode
    currentModule
    selectedCell
    selectedFasade
    selectedFilling
    hasTsargaProduct
    hasMetalTsarga
    effectiveMaxSectionWidth
    pixelRatioWidth
    pixelRatioHeight
    props
    APP
    UMconstructor
    canvasContainer

    // Состояние драга разделителей (DividerDragEngine) — dragState реактивен
    // (reactive()), lastDragEvent — ref, cursorCheck — обычное мутируемое поле
    dragState
    lastDragEvent
    cursorCheck = false

    // Колбэки в UMconstructorClass-менеджеры (тонкие обёртки, живут в Render2D.vue)
    calcDrawersFasades
    checkLoopsCollision
    resetModule
    setModuleGrid

    // Колбэки в соседние движки
    renderGrid
    selectCell
    // Выбор профиля (canvas <-> WardrobeProfilesView.vue) — см.
    // SelectionHighlighter.selectWardrobeProfile/RenderContext.wardrobeProfilesMap.
    selectWardrobeProfile
    checkSectorsCollision
    onVerticalDragStart
    onHorizontalDragStart
    // Гардеробная система (временно, черновик) — драг профиля между двумя
    // секциями, изолирован от dragState/onVerticalDragStart выше.
    onWardrobeProfileDragStart
    // Клик по КРАЙНЕМУ (не тянущемуся мышью) профилю — только выбор, без
    // драга (см. SceneBuilder.createWardrobeProfile/DividerDragEngine.
    // onWardrobeProfileClick).
    onWardrobeProfileClick
    // Драг полки внутри секции по вертикали — своё изолированное состояние
    // (wardrobeShelfDrag), см. DividerDragEngine.
    onWardrobeShelfDragStart

    constructor(fields: Record<string, any>) {
        Object.assign(this, fields)
    }
}
