//@ts-nocheck

// ==== Гардеробная система (WARDROBE) ====
// Пересчёт гардеробной сетки — аналог box-UM пересчёта в
// UMconstructorClass.reset(), но полностью отдельный: у гардеробной сетки нет
// cells/rows/царги, а у товара нет FASADE_POSITION, из-за чего box-UM путь
// (в частности FASADES.updateFasades) на ней падал.
//
// Инварианты, которые здесь удерживаются на КАЖДОМ вызове (а не разово после
// соответствующей правки):
//   - grid.height = высота самого высокого профиля (профили настраиваются
//     независимо, поле "Высота" пишет в них, а не в grid.height);
//   - grid.depth не выше максимума, разрешённого текущими креплениями;
//   - section.height = grid.height у всех секций;
//   - зазоры полок не нарушены, не помещающиеся под потолок секции удалены;
//   - сумма ширин секций + профилей = grid.width, секции внутри
//     [WARDROBE_SECTION_WIDTH_MIN, MAX] (иначе авто-разбиение/слияние);
//   - конфиг УМ каждой тумбочки есть и совпадает с габаритами её секции
//     (cabinet/session/syncCabinetConfig.ts).
// Точка входа — scope.WARDROBE.reset().
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import {
    getWardrobeProfileMaxDepth,
    getWardrobeSectionInstallableHeight,
    getWardrobeShelfDepth,
    getWardrobeShelfPixiHeight,
    getWardrobeShelfMinGap,
    getWardrobeShelfFloorGap,
} from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { getWardrobeItemCeilingGap, isWardrobeCabinet } from "@/components/UMconstructor/cabinet/CabinetSystem.ts";
import { isCabinetConfigStale } from "@/components/UMconstructor/cabinet/cabinetLimits.ts";
import { syncCabinetConfig } from "@/components/UMconstructor/cabinet/session/syncCabinetConfig.ts";
import {
    WARDROBE_SECTION_WIDTH_MIN,
    WARDROBE_SECTION_WIDTH_MAX,
    WARDROBE_PROFILE_WIDTH,
} from "@/Application/F-wardrobeData.ts";

export default class WardrobeGridReset {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    // Вызывается из UMconstructorClass.reset() ПОСЛЕ UM_STORE.setLoad(true) —
    // снимает флаг сам, в debounce'е рендера (как и box-UM ветка).
    reset(grid: GridModule) {
        // Высота МОДУЛЯ = высота самого высокого профиля: профили
        // настраиваются независимо (ProfilesManager.
        // updateWardrobeProfileHeight), и "Стена" обычно короче "Потолка".
        // Поле "Высота" в ModuleSizeView.vue grid.height напрямую НЕ
        // пишет: updateTotalHeight() зовёт applyModuleHeightToProfiles, а
        // высота модуля пересчитывается здесь уже как следствие.
        //
        // Про высоту знает не только grid.height: PIXI-канвас
        // масштабируется по отдельному TOTAL_HEIGHT/UM_STORE.totalHeight,
        // который меняет ТОЛЬКО явный RENDER_REF.updateTotalSize. Без него
        // канвас остался бы на старом масштабе — профили обрезались или
        // снизу оставалось пустое место.
        if (grid.wardrobeProfiles?.length) {
            const maxProfileHeight = Math.max(...grid.wardrobeProfiles.map((p) => p.height || 0))
            if (maxProfileHeight !== grid.height) {
                grid.height = maxProfileHeight
                this.scope.UM_STORE.totalHeight = maxProfileHeight
                this.scope.RENDER_REF.updateTotalSize(maxProfileHeight, "height")
            }

            // Максимальная ГЛУБИНА тоже динамическая, зависит от реально
            // назначенных креплений. getWardrobeProfileMaxDepth — тот же
            // потолок, что показан как :max поля "Глубина", и нужен ТОЛЬКО
            // здесь, для клампа grid.depth: геометрия и коллизии полок
            // считаются от ТЕКУЩЕЙ grid.depth (getWardrobeShelfDepth) —
            // когда они брали этот потолок, высота наклонной полки не
            // реагировала на правку "Глубины".
            //
            // Кламп на КАЖДОМ reset(), не только на старте: grid.depth
            // берётся из каталожного SIZE.depth и может превышать максимум
            // сразу, а смена крепления уменьшает его уже после создания.
            // updateTotalSize для depth не зовём (в отличие от height) —
            // глубина не отрисовываемая ось фронтального 2D-вида, она
            // влияет только на тригонометрию наклонных полок.
            const maxDepth = getWardrobeProfileMaxDepth(grid)
            if (maxDepth != null && grid.depth > maxDepth) {
                grid.depth = this.scope.UM_STORE.totalDepth = maxDepth
                this.scope.callAlert("warning", `Глубина модуля уменьшена до ${maxDepth}мм — не позволяют текущие крепления профилей`)
            }
        }

        // Секции не стоят друг над другом (один ряд) — height каждой
        // секции всегда должен равняться grid.height. В отличие от
        // width (который делится/распределяется между секциями),
        // height просто копируется — но раньше НЕ копировался вовсе:
        // GridSection.height выставлялся один раз при создании (createWardrobeGrid/
        // addWardrobeSector) и не обновлялся при изменении "Высота" в
        // левой панели (updateTotalHeight трогает только grid.height).
        // Из-за этого section.height оставался ЗАСТАРЕВШИМ (меньше
        // фактической высоты, на которую уже отрисован канвас) — что
        // ломало и WardrobeFillingsView.vue (:max для "Положение по Y"
        // считался от старой высоты), и коллизии полок (ShelvesManager.
        // addWardrobeShelf упирался в неверный, заниженный потолок и
        // сообщал "нет места", хотя видимого места было много).
        grid.sections.forEach((s) => { s.height = grid.height })

        // Полка, которая больше не помещается под "монтажную" высоту
        // своей секции (минимум из двух ограничивающих её профилей,
        // см. WardrobeSystem.getWardrobeSectionInstallableHeight) — после
        // того, как пользователь укоротил один из профилей в "Настройка
        // профилей" — физически висит в воздухе (см. скриншот в чате) и
        // удаляется. Проверяется на КАЖДОМ reset() (не только сразу после
        // правки высоты профиля) — тот же принцип, что и у синхронизации
        // section.height выше: это инвариант, а не разовый побочный эффект.
        let removedShelvesCount = 0
        grid.sections.forEach((section, secIndex) => {
            if (!section.wardrobeFilling?.length) return

            const installableHeight = getWardrobeSectionInstallableHeight(grid, secIndex)
            // Полки крепятся к центру профиля — их длина считается от
            // ТЕКУЩЕЙ grid.depth (не от потолка getWardrobeProfileMaxDepth,
            // который не реагирует на правку самого поля "Глубина" — баг,
            // найден пользователем), см. WardrobeSystem.getWardrobeShelfDepth.
            const depthMm = getWardrobeShelfDepth(grid)

            // Полка, прилегающая к соседу СНИЗУ (в т.ч. к наклонной —
            // её высота зависит от depthMm, тригонометрия), должна
            // сохранять минимальный зазор ОТ ЭТОГО соседа даже после
            // изменения геометрии (глубина модуля и т.п.) — баг, найден
            // пользователем: при изменении глубины модуля полка,
            // прилегающая к наклонной полке, не сдвигалась к новому
            // разрешённому положению и оставалась на старом positionY
            // (нарушая либо занижая зазор). Сдвигаем ТОЛЬКО ВВЕРХ —
            // устраняем нарушение зазора, но никогда не "утягиваем"
            // полку вниз, если у неё и так больше свободного места, чем
            // требуется по формуле (это может быть намеренный выбор
            // пользователя при перетаскивании, не нарушение). "Пол"
            // считается неявным нижним соседом первой полки — та же
            // getWardrobeShelfFloorGap, что уже используют add/drag.
            const sortedShelves = [...section.wardrobeFilling].sort((a, b) => a.positionY - b.positionY)
            let prevShelf: typeof sortedShelves[number] | null = null
            sortedShelves.forEach((shelf) => {
                // prevShelf ниже (СНИЗУ), shelf выше (СВЕРХУ) по
                // сортировке — порядок аргументов getWardrobeShelfMinGap
                // теперь значим (below, above), см. её doc-комментарий;
                // здесь порядок уже корректный, менять не нужно.
                const lowerBound = prevShelf
                    ? prevShelf.positionY
                    + getWardrobeShelfPixiHeight(prevShelf, depthMm, grid.productID)
                    + getWardrobeShelfMinGap(prevShelf, shelf, depthMm, grid.productID)
                    : getWardrobeShelfFloorGap(shelf, depthMm, grid.productID)

                if (shelf.positionY < lowerBound) {
                    shelf.positionY = Math.ceil(lowerBound)
                }

                prevShelf = shelf
            })

            const kept = section.wardrobeFilling.filter((shelf) => {
                const shelfHeight = getWardrobeShelfPixiHeight(shelf, depthMm, grid.productID)
                return shelf.positionY + shelfHeight <= installableHeight - getWardrobeItemCeilingGap(shelf) + 0.01
            })

            removedShelvesCount += section.wardrobeFilling.length - kept.length
            section.wardrobeFilling = kept
        })

        if (removedShelvesCount > 0) {
            this.scope.callAlert("warning", removedShelvesCount === 1
                ? "Полка удалена — не помещается под новую высоту профиля!"
                : `Удалено полок: ${removedShelvesCount} — не помещаются под новую высоту профиля!`)
        }

        // grid.width — это ПОЛНАЯ физическая ширина модуля (то же число, что
        // "Мин/Макс" в поле "Ширина" ModuleSizeView.vue — каталожный лимит на
        // готовое изделие), а не сумма ширин секций: профили стоят СНАРУЖИ
        // секций (addWardrobeSector, createWardrobeGrid.ts), на N секций
        // приходится N+1 профилей, и их ширина вычитается из бюджета.
        //
        // Новый бюджет раскладывается по секциям ПРОПОРЦИОНАЛЬНО текущим
        // ширинам. Раньше вся дельта уходила в ПОСЛЕДНЮЮ секцию, и на большом
        // уменьшении "Ширины" та проваливалась глубоко в минус: слияние ниже
        // складывало минус с соседом, получало секцию в десятки мм, а на
        // следующем шаге упиралось в WARDROBE_SECTION_WIDTH_MAX и вставало —
        // в гриде оставалась секция уже WARDROBE_SECTION_WIDTH_MIN (баг,
        // найден пользователем: 2700 -> 1000 при трёх секциях давало
        // [862, 63] вместо трёх равных).
        const distributeSectionsWidth = () => {
            const sections = grid.sections
            const targetSectionsWidth = grid.width - (sections.length + 1) * WARDROBE_PROFILE_WIDTH
            const sectionsWidthSum = sections.reduce((sum, s) => sum + s.width, 0)
            // Дробные ширины (сохранённые до округления драга профиля) тоже
            // раскладываем заново — ниже всё округляется до целых мм.
            const allInteger = sections.every((s) => Number.isInteger(s.width))
            if (targetSectionsWidth === sectionsWidthSum && allInteger) return

            sections.forEach((section) => {
                const raw = sectionsWidthSum > 0
                    ? section.width * targetSectionsWidth / sectionsWidthSum
                    : targetSectionsWidth / sections.length
                section.width = Math.round(Math.min(
                    WARDROBE_SECTION_WIDTH_MAX,
                    Math.max(WARDROBE_SECTION_WIDTH_MIN, raw),
                ))
            })

            // Остаток от округления и клампа разносим по секциям, у которых
            // остался запас до предела. Иначе он целиком падал бы в одну
            // секцию и выталкивал её за MIN/MAX — то есть порождал разбиение
            // или слияние там, где бюджет на текущее число секций сходится
            // (на обратном ходе 1000 -> 2700 лишний 1мм округления заставлял
            // добавить четвёртую секцию).
            let rest = targetSectionsWidth - sections.reduce((sum, s) => sum + s.width, 0)
            for (const section of sections) {
                if (rest === 0) break
                const room = rest > 0
                    ? WARDROBE_SECTION_WIDTH_MAX - section.width
                    : WARDROBE_SECTION_WIDTH_MIN - section.width
                const step = rest > 0 ? Math.min(rest, room) : Math.max(rest, room)
                section.width += step
                rest -= step
            }

            // Разнести не удалось — бюджет недостижим при текущем числе
            // секций. Отдаём остаток последней и оставляем циклу ниже
            // привести число секций в соответствие.
            if (rest !== 0) sections[sections.length - 1].width += rest
        }

        distributeSectionsWidth()

        // Пропорция держит секции в [MIN, MAX], пока бюджет это позволяет;
        // когда нет (ширину задрали выше N*MAX или опустили ниже N*MIN) —
        // меняем само число секций. Проверять одну секцию мало: остаток от
        // деления в addWardrobeSector (deltaLastPart) уходит в последнюю из
        // НОВЫХ частей и может снова выйти за MAX. Поэтому цикл: находим
        // ЛЮБУЮ секцию вне [MIN, MAX], разбиваем/сливаем, заново раскладываем
        // бюджет (число профилей изменилось) и проверяем снова.
        for (let guard = 0; guard < 20; guard++) {
            const beforeCount = grid.sections.length

            const oversizedIndex = grid.sections.findIndex((s) => s.width > WARDROBE_SECTION_WIDTH_MAX)
            if (oversizedIndex !== -1) {
                const countToAdd = Math.floor(grid.sections[oversizedIndex].width / WARDROBE_SECTION_WIDTH_MAX)
                this.scope.WARDROBE.sections.addWardrobeSector(grid, oversizedIndex, countToAdd)
                // Не изменилось — addWardrobeSector отказал сам (лимит секций,
                // узкий остаток; у него свои alert'ы), выходим, чтобы не
                // зациклиться и не заспамить предупреждениями.
                if (grid.sections.length === beforeCount) break
                distributeSectionsWidth()
                continue
            }

            const undersizedIndex = grid.sections.length > 1
                ? grid.sections.findIndex((s) => s.width < WARDROBE_SECTION_WIDTH_MIN)
                : -1
            if (undersizedIndex !== -1) {
                const section = grid.sections[undersizedIndex]
                const neighborIndex = undersizedIndex < grid.sections.length - 1
                    ? undersizedIndex + 1
                    : undersizedIndex - 1
                const neighbor = grid.sections[neighborIndex]

                // Слить можно, только если объединённая секция уложится в MAX
                // (тот же отказ внутри deleteWardrobeSector). Если не уложится
                // — сливать и не надо: у соседа заведомо есть лишнее, двигаем
                // ГРАНИЦУ между ними, добирая узкой секции до MIN. Это же
                // чинит уже сохранённые гриды, попавшие в такое состояние
                // старой раскладкой.
                if (section.width + neighbor.width + WARDROBE_PROFILE_WIDTH > WARDROBE_SECTION_WIDTH_MAX) {
                    const spare = neighbor.width - WARDROBE_SECTION_WIDTH_MIN
                    if (spare <= 0) break
                    const move = Math.min(WARDROBE_SECTION_WIDTH_MIN - section.width, spare)
                    section.width += move
                    neighbor.width -= move
                    continue
                }

                this.scope.WARDROBE.sections.deleteWardrobeSector(grid, undersizedIndex)
                if (grid.sections.length === beforeCount) break
                distributeSectionsWidth()
                continue
            }

            break
        }

        // Конфиг УМ тумбочек — под итоговые габариты секций (новые получают стартовый).
        grid.sections.forEach((section, secIndex) => {
            section.wardrobeFilling?.forEach((item) => {
                if (isWardrobeCabinet(item) && isCabinetConfigStale(grid, secIndex, item)) {
                    syncCabinetConfig(this.scope, grid, secIndex, item.id)
                }
            })
        })

        this.scope.UM_STORE.setUMGrid(grid)
        this.scope.debounce("renderGrid", () => {
            this.scope.RENDER_REF.renderGrid(grid)
            this.scope.UM_STORE.setLoad(false)
        }, 100)
        return grid
    }
}
