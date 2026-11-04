// Подгонка существующего наполнения под новые габариты модуля. Зовётся из
// UMconstructorClass.reset() только после правки габарита (markResized), чтобы
// остальные пересчёты сетки шли прежним путём.
// Что чиним: position.y наполнения отсчитывается от потолка модуля, а высота
// растёт от дна — без переноса наполнение уезжает вместе с потолком и вылезает
// из своей области, а стек внешних фасадов (ExternalFasadesManager.
// calcDrawersFasadesPositons кладёт его снизу вверх) собирается уже по
// разъехавшимся телам ящиков и наслаивается сам на себя.
//@ts-nocheck

import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import {
    FillingObject,
    GridModule,
    GridSection,
} from "@/components/UMconstructor/types/UMtypes.ts";
import {
    FILLINGS_RESTRICTION_EXCEPTIONS,
    UM_ACCESSORY_GROUPS,
    UM_DRAWERS_IDS,
    UM_PARAMS,
} from "@/components/UMconstructor/utils/Const.ts";

// Адрес сегмента сетки: индексы уровня, на котором лежит наполнение (нужны deleteFilling).
type TSegmentRef = {
    segment: any
    section: GridSection
    secIndex: number
    cellIndex: number | null
    rowIndex: number | null
    extraIndex: number | null
}

// Занятая по высоте полоса в системе отступов от дна области.
type TRange = {
    from: number
    to: number
}

// Ящик с фасадом в стеке секции: y — позиция фасада от дна модуля,
// startY — она же до проходов раскладки (попытка начинается с неё заново).
type TDrawerStackItem = {
    fasade: any
    ref: TSegmentRef
    body: any
    y: number
    startY: number
}

// Глубина наполнения в модуле с дверями-купе меньше на зазор под створки
// (та же величина, что в FillingsCore.createFillingDataToCheck).
const SLIDING_DOORS_DEPTH_GAP = 100

// Наполнение во всю глубину гардеробной короче корпуса (как в FillingsManager.addFilling).
const WARDROBE_FILLING_DEPTH_GAP = 100

// Наполнение считается прижатым к потолку области, если зазор сверху не больше
// этого (2D-слой округляет отступы до мм): такое при смене высоты держим у
// потолка, остальное — на прежнем отступе от дна.
const TOP_PINNED_GAP = 2

export default class ResizeRefitManager {
    scope: UMconstructorClass
    private resized = false

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    // Зовётся из точек правки габарита (updateTotalHeight/Width/Depth,
    // applyHorizont, syncSize тумбочки) до reset().
    markResized(): void {
        this.resized = true
    }

    // Флаг одноразовый: reset() рекурсивен, подгонка нужна один раз на правку.
    consumeResized(): boolean {
        const resized = this.resized
        this.resized = false

        return resized
    }

    refit(grid: GridModule): void {
        if (!grid?.sections?.length) {
            return
        }

        this.refitDepth(grid)
        this.dropUnfitFillings(grid)
        this.anchorFillingsToBottom(grid)
        this.restackOuterDrawers(grid)
        this.refitAccessories(grid)
    }

    // --- Обход сетки ---

    // Сегменты с наполнением собираем заранее: deleteFilling подменяет массивы fillings.
    private segments(grid: GridModule): TSegmentRef[] {
        const result: TSegmentRef[] = []

        const push = (segment: any, section: GridSection, secIndex: number, cellIndex: number | null, rowIndex: number | null, extraIndex: number | null) => {
            if (segment?.fillings?.length) {
                result.push({ segment, section, secIndex, cellIndex, rowIndex, extraIndex })
            }
        }

        grid.sections?.forEach((section, secIndex) => {
            push(section, section, secIndex, null, null, null)

            section.cells?.forEach((cell, cellIndex) => {
                push(cell, section, secIndex, cellIndex, null, null)

                cell.cellsRows?.forEach((row, rowIndex) => {
                    push(row, section, secIndex, cellIndex, rowIndex, null)

                    row.extras?.forEach((extra, extraIndex) => {
                        push(extra, section, secIndex, cellIndex, rowIndex, extraIndex)
                    })
                })
            })
        })

        return result
    }

    // Сегмент, в котором лежит тело ящика с фасадом (координаты хранит сам фасад).
    private segmentOfFasade(fasade: any, grid: GridModule): TSegmentRef | null {
        const section = grid.sections?.[fasade?.sec]

        if (!section) {
            return null
        }

        const cellIndex = fasade.cell ?? null
        const rowIndex = fasade.row ?? null
        const extraIndex = fasade.extra ?? null

        const cell = cellIndex !== null ? section.cells?.[cellIndex] : null
        const row = rowIndex !== null ? cell?.cellsRows?.[rowIndex] : null
        const extra = extraIndex !== null ? row?.extras?.[extraIndex] : null
        const segment = extra || row || cell || section

        if (!segment) {
            return null
        }

        return { segment, section, secIndex: fasade.sec, cellIndex, rowIndex, extraIndex }
    }

    private drop(ref: TSegmentRef, index: number, grid: GridModule): void {
        this.scope.FILLINGS.deleteFilling(ref.secIndex, index, ref.cellIndex, ref.rowIndex, ref.extraIndex, grid, false)
    }

    // Царга и исключения по размеру живут по своим правилам, профили и
    // вертикальные разделители растягиваются по области в reset().
    private isRefitExempt(filling: FillingObject): boolean {
        return filling.type === 'tsarga'
            || filling.isProfile
            || filling.isVerticalItem
            || FILLINGS_RESTRICTION_EXCEPTIONS.includes(+filling.product)
    }

    // --- Глубина ---

    // Глубина наполнения не может превысить корпус: ящикам подбираем допустимую
    // из каталога, остальным держим глубину корпуса, не влезающее снимаем.
    private refitDepth(grid: GridModule): void {
        const maxDepth = grid.depth - (grid.fasades?.length ? SLIDING_DOORS_DEPTH_GAP : 0)
        const moduleProduct = this.scope.APP.CATALOG.PRODUCTS[grid.productID]
        const messages = new Set<string>()

        this.segments(grid).forEach((ref) => {
            const { segment } = ref

            for (let index = segment.fillings.length - 1; index >= 0; index--) {
                const filling = segment.fillings[index]

                if (!filling || filling.isProfile) {
                    continue
                }

                const product = this.scope.APP.CATALOG.PRODUCTS[filling.product]

                if (UM_DRAWERS_IDS.UNIVERSAL.includes(filling.productGroupID)) {
                    // Универсальный ящик берёт глубину из списка SIZE_EDIT_DEPTH
                    const { depth } = this.scope.FILLINGS.drawers.getUniversalDrawerSizes(product, grid)

                    if (depth === undefined) {
                        messages.add(`«${filling.name}» снят: глубина модуля ${grid.depth} мм мала для ящика`)
                        this.drop(ref, index, grid)
                    } else {
                        this.setFillingDepth(filling, depth)
                    }

                    continue
                }

                if (product?.SIZE_EDIT_DEPTH_MAX) {
                    // Наполнение во всю глубину корпуса — та же формула, что при установке (addFilling)
                    this.setFillingDepth(filling, grid.depth - (moduleProduct?.moduleType?.CODE === "wardrobe" ? WARDROBE_FILLING_DEPTH_GAP : 0))
                    continue
                }

                const actualDepth = Number(product?.ACTUAL_DEPT ?? filling.size?.z ?? 0)

                if (actualDepth > maxDepth) {
                    messages.add(`«${filling.name}» снято: нужна глубина ${actualDepth} мм, доступно ${maxDepth} мм`)
                    this.drop(ref, index, grid)
                }
            }
        })

        messages.forEach((message) => this.scope.callAlert("warning", message))
    }

    private setFillingDepth(filling: FillingObject, depth: number): void {
        filling.depth = depth

        if (filling.size) {
            filling.size.z = depth
        }
    }

    // --- Высота области ---

    // Область стала мала — наполнение в ней не держится: ниже минимума под
    // наполнение снимаем всё, иначе только то, что не влезает по высоте.
    // Ширину чистит FillingsCore.cleanupOversizedFillings там же, в reset().
    private dropUnfitFillings(grid: GridModule): void {
        const { MIN_SECTION_TO_FILLINGS_HEIGHT } = UM_PARAMS
        const messages = new Set<string>()

        this.segments(grid).forEach((ref) => {
            const { segment } = ref
            const tooLow = segment.height <= MIN_SECTION_TO_FILLINGS_HEIGHT

            for (let index = segment.fillings.length - 1; index >= 0; index--) {
                const filling = segment.fillings[index]

                if (!filling || this.isRefitExempt(filling)) {
                    continue
                }

                if (tooLow) {
                    messages.add(`«${filling.name}» снято: высота области ${segment.height} мм меньше ${MIN_SECTION_TO_FILLINGS_HEIGHT} мм`)
                    this.drop(ref, index, grid)
                    continue
                }

                if (filling.height > segment.height) {
                    messages.add(`«${filling.name}» снято: не помещается по высоте в область ${segment.height} мм`)
                    this.drop(ref, index, grid)
                }
            }
        })

        messages.forEach((message) => this.scope.callAlert("warning", message))
    }

    // --- Позиции наполнения ---

    // Возвращаем наполнение на прежний отступ от дна области: именно он
    // сохраняется при смене габарита, а position.y (от потолка) — нет.
    // Прижатое к потолку области держим у потолка — оно должно идти за высотой,
    // а не оставаться на прежней отметке от дна.
    private anchorFillingsToBottom(grid: GridModule): void {
        const core = this.scope.FILLINGS.core

        this.segments(grid).forEach(({ segment }) => {
            segment.fillings.forEach((filling: FillingObject) => {
                if (!filling?.position || filling.isVerticalItem || filling.isProfile) {
                    return
                }

                // Встраиваемые ящики переставляются вместе со своим внешним
                if (UM_DRAWERS_IDS.INNER.includes(filling.productGroupID)) {
                    return
                }

                const bottom = core.getAbsolutePositionY(filling, segment, grid)
                const min = core.calcMinMaxPositionY("min", filling, segment, grid)
                const max = core.calcMinMaxPositionY("max", filling, segment, grid)

                // max — отступ от дна, при котором наполнение стоит вплотную к потолку
                const pinnedToTop = filling.distances?.top !== undefined && filling.distances.top <= TOP_PINNED_GAP
                const target = pinnedToTop ? max : bottom

                const prevY = filling.position.y
                core.setAbsolutePositionY(filling, segment, Math.min(Math.max(target, min), max), grid)
                const delta = prevY - filling.position.y

                if (delta !== 0 && UM_DRAWERS_IDS.OUTER.includes(filling.productGroupID)) {
                    this.scope.FILLINGS.drawers.moveLinkedInnerDrawers(segment, filling, delta)
                }
            })
        })
    }

    // --- Стек внешних ящиков ---

    // Фасады внешних ящиков делят дверь секции и раскладываются снизу вверх с
    // зазором FASADES_MIN_GAP. После смены габаритов пересобираем стек в том же
    // порядке и двумя проходами, двигая каждый ящик минимально: снизу вверх —
    // от налезших соседей и профилей, сверху вниз — из-под потолка двери. Что не
    // поместилось даже так — снимаем сверху.
    private restackOuterDrawers(grid: GridModule): void {
        const gap = UM_PARAMS.FASADES_MIN_GAP
        const floor = grid.horizont + 2
        const ceiling = floor + this.doorHeight(grid)

        grid.sections.forEach((section, secIndex) => {
            if (!section.fasadesDrawers?.length) {
                return
            }

            const stack = this.drawerStack(section, grid)
            const obstacles = this.hiTechRanges(section, grid)
            const removed: TDrawerStackItem[] = []

            while (stack.length) {
                // Проходы двигают y, поэтому попытка начинается с исходных позиций
                stack.forEach((item) => { item.y = item.startY })

                this.packUp(stack, floor, gap, obstacles)
                this.packDown(stack, ceiling, gap)

                if (stack[0].y >= floor) {
                    break
                }

                // Опускать уже некуда — снимаем верхний ящик и пробуем снова
                removed.push(stack.pop())
            }

            stack.forEach((item) => this.moveDrawerFasadeTo(item, grid))
            removed.forEach((item) => this.dropDrawerOfFasade(item, grid))

            this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)
        })
    }

    // Высота двери секции — тот же бюджет, по которому раскладывает стек
    // ExternalFasadesManager.calcDrawersFasadesPositons. Брать grid.height нельзя:
    // дверь ниже корпуса, и ящик, влезший в корпус, в дверь мог не влезть.
    private doorHeight(grid: GridModule): number {
        const product = this.scope.APP.CATALOG.PRODUCTS[grid.productID]
        const position = this.scope.FASADES.getFasadePosition(product?.FASADE_POSITION?.[0], grid)

        return position?.FASADE_HEIGHT || grid.height - grid.horizont - 4
    }

    // Проход снизу вверх: поднимаем только то, на что налез нижний сосед или
    // профиль хай-тек. Заданные пользователем расстояния между ящиками
    // сохраняются — позиции тел ("Позиция" в панели) при подгонке эталон.
    private packUp(stack: TDrawerStackItem[], floor: number, gap: number, obstacles: TRange[]): void {
        let cursor = floor

        stack.forEach((item) => {
            item.y = this.liftOverObstacles(Math.max(item.y, cursor), item.fasade.height, obstacles, gap)
            cursor = item.y + item.fasade.height + gap
        })
    }

    // Стек ящиков секции снизу вверх. Позиции считаем от тел: их уже переставил
    // anchorFillingsToBottom, а в fasadesDrawers лежат позиции от прежней высоты.
    private drawerStack(section: GridSection, grid: GridModule): TDrawerStackItem[] {
        return (section.fasadesDrawers ?? [])
            .filter((fasade) => fasade?.position)
            .map((fasade) => {
                const ref = this.segmentOfFasade(fasade, grid)
                const body = ref?.segment?.fillings?.[fasade.item - 1]
                const y = this.fasadeBottomOfBody(fasade, body, grid)

                return { fasade, ref, body, y, startY: y }
            })
            .filter((item) => item.body?.position)
            .sort((a, b) => a.y - b.y)
    }

    // Позиция фасада от дна модуля по телу ящика — формула из calcDrawersFasades.
    private fasadeBottomOfBody(fasade: any, body: any, grid: GridModule): number {
        if (!body?.position) {
            return fasade.position.y
        }

        return grid.height - (body.position.y + body.height + (fasade.manufacturerOffset || 0))
    }

    // Проход сверху вниз: каждый ящик опускается под потолок и под нижнюю
    // границу верхнего соседа, но только если туда вылез.
    private packDown(stack: TDrawerStackItem[], ceiling: number, gap: number): void {
        let limit = ceiling

        for (let index = stack.length - 1; index >= 0; index--) {
            const item = stack[index]

            if (item.y + item.fasade.height > limit) {
                item.y = limit - item.fasade.height
            }

            limit = item.y - gap
        }
    }

    // Профили хай-тек делят дверь с ящиками, поэтому в раскладке стека участвуют
    // как занятые полосы. Перевод позиции в систему от дна — как в
    // ExternalFasadesManager.calcDrawersFasadesPositons.
    private hiTechRanges(section: GridSection, grid: GridModule): TRange[] {
        return (section.hiTechProfiles ?? [])
            .filter((profile) => profile?.position)
            .map((profile) => {
                const from = grid.height - (profile.position.y + profile.height + (profile.isProfile?.manufacturerOffset || 0))
                const height = profile.isProfile?.isBottomHiTechProfile
                    ? 0
                    : profile.isProfile?.offsetFasades || profile.height

                return { from, to: from + height }
            })
            .filter((range) => range.to > range.from)
            .sort((a, b) => a.from - b.from)
    }

    // Поднимает позицию над занятыми полосами, они отсортированы снизу вверх.
    private liftOverObstacles(y: number, height: number, obstacles: TRange[], gap: number): number {
        let result = y

        obstacles.forEach((range) => {
            if (result < range.to && result + height > range.from) {
                result = range.to + gap
            }
        })

        return result
    }

    // Тело ящика — источник истины для фасада (см. liftStackAboveBottom):
    // position.y тела отсчитывается от потолка, позиция фасада — от дна модуля.
    private moveDrawerFasadeTo(item: TDrawerStackItem, grid: GridModule): void {
        const { fasade, ref, body, y } = item
        const delta = body.position.y - (grid.height - y - body.height - (fasade.manufacturerOffset || 0))

        // Фасад пишем всегда, даже если тело осталось на месте: его уже сдвинул
        // anchorFillingsToBottom, а в fasadesDrawers лежит позиция от прежней высоты
        fasade.position.y = y

        if (!delta) {
            return
        }

        body.position.y -= delta

        if (body.distances) {
            body.distances.top -= delta
            body.distances.bottom += delta
        }

        fasade.position.y = y
        this.scope.FILLINGS.drawers.moveLinkedInnerDrawers(ref.segment, body, delta)
    }

    private dropDrawerOfFasade(item: TDrawerStackItem, grid: GridModule): void {
        // item читаем в момент удаления: deleteFilling перенумеровывает его у оставшихся
        const index = (item.fasade.item ?? 0) - 1

        if (!item.ref?.segment?.fillings?.[index]) {
            return
        }

        this.scope.callAlert("warning", `«${item.body.name}» снят: стек ящиков не помещается в высоту ${grid.height} мм`)
        this.drop(item.ref, index, grid)
    }

    // --- Аксессуары (штанги) ---

    // Штанга делит область с ящиками и их фасадами: после смены габаритов ищем
    // ей ближайшую свободную позицию по высоте, свободной нет — снимаем.
    private refitAccessories(grid: GridModule): void {
        const core = this.scope.FILLINGS.core

        this.segments(grid).forEach((ref) => {
            const { segment } = ref

            for (let index = segment.fillings.length - 1; index >= 0; index--) {
                const filling = segment.fillings[index]

                if (!UM_ACCESSORY_GROUPS.includes(+filling?.productGroupID)) {
                    continue
                }

                const bottom = core.getAbsolutePositionY(filling, segment, grid)
                const free = this.findFreeBottom(bottom, filling, segment, ref, grid)

                if (free === null) {
                    this.scope.callAlert("warning", `«${filling.name}» снята: нет свободного места после изменения габаритов`)
                    this.drop(ref, index, grid)
                    continue
                }

                if (free !== bottom) {
                    core.setAbsolutePositionY(filling, segment, free, grid)
                    this.scope.callAlert("info", `«${filling.name}» сдвинута на ${free} мм от дна области`)
                }
            }
        })
    }

    // Полосы, занятые остальным наполнением области и фасадами внешних ящиков,
    // в системе отступов от дна области.
    private occupiedRanges(self: FillingObject, segment: any, ref: TSegmentRef, grid: GridModule): TRange[] {
        const core = this.scope.FILLINGS.core
        const ranges: TRange[] = []

        segment.fillings.forEach((filling: FillingObject) => {
            if (filling === self || !filling?.position || filling.isVerticalItem) {
                return
            }

            const from = core.getAbsolutePositionY(filling, segment, grid)
            ranges.push({ from, to: from + filling.height })
        })

        // Фасад внешнего ящика выше тела и выходит за пол области, поэтому
        // переводим его позицию (от дна модуля) в отступ от дна области
        const shift = segment.position.y - (grid.noBottom ? grid.moduleThickness : 0)

        ref.section.fasadesDrawers?.forEach((fasade: any) => {
            if (!fasade?.position) {
                return
            }

            const from = fasade.position.y - shift
            ranges.push({ from, to: from + fasade.height })
        })

        return ranges.sort((a, b) => a.from - b.from)
    }

    // Ближайшая свободная позиция по высоте: сначала текущая, затем границы
    // занятых полос — вверх и вниз от неё, выбираем ближайшую к текущей.
    private findFreeBottom(
        preferred: number,
        filling: FillingObject,
        segment: any,
        ref: TSegmentRef,
        grid: GridModule,
    ): number | null {
        const ranges = this.occupiedRanges(filling, segment, ref, grid)
        const limit = segment.height - filling.height

        const fits = (value: number) => value >= 0
            && value <= limit
            && !ranges.some((range) => value < range.to && value + filling.height > range.from)

        if (fits(preferred)) {
            return preferred
        }

        const candidates = [0, limit]
            .concat(ranges.map((range) => Math.round(range.to)))
            .concat(ranges.map((range) => Math.round(range.from - filling.height)))
            .filter((value) => fits(value))
            .sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred))

        return candidates.length ? candidates[0] : null
    }
}
