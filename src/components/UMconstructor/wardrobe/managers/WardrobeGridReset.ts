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
//   - отступ профиля от пола нормализован: ненулевой только у навесного
//     "стена-стена" и не выводит верхний торец за габарит модуля;
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
    getWardrobeProfilePositionY,
    getWardrobeSectionBounds,
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

            // Отступ профиля от пола — только у навесного "стена-стена" и
            // только в габарите модуля (getWardrobeProfilePositionY). Здесь,
            // ПОСЛЕ пересчёта grid.height: от неё зависит верхняя граница
            // отступа. Нормализация на КАЖДОМ reset(), т.к. отступ может
            // просрочиться не только от драга — профиль укоротили, сменили
            // крепление на напольное, уменьшили высоту модуля.
            grid.wardrobeProfiles.forEach((profile) => {
                profile.positionY = getWardrobeProfilePositionY(grid, profile)
            })
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

        // Наполнение приводится в соответствие с вертикальными границами
        // своей секции (WardrobeSystem.getWardrobeSectionBounds): сначала
        // сдвигается вниз под опустившийся потолок, потом вверх от пола и
        // соседей, и только то, чему места не нашлось вовсе, удаляется —
        // физически оно висело бы в воздухе (см. скриншот в чате).
        // Проверяется на КАЖДОМ reset() (не только сразу после правки высоты
        // профиля) — тот же принцип, что и у синхронизации section.height
        // выше: это инвариант, а не разовый побочный эффект.
        let removedShelvesCount = 0
        grid.sections.forEach((section, secIndex) => {
            if (!section.wardrobeFilling?.length) return

            const bounds = getWardrobeSectionBounds(grid, secIndex)
            // Полки крепятся к центру профиля — их длина считается от
            // ТЕКУЩЕЙ grid.depth (не от потолка getWardrobeProfileMaxDepth,
            // который не реагирует на правку самого поля "Глубина" — баг,
            // найден пользователем), см. WardrobeSystem.getWardrobeShelfDepth.
            const depthMm = getWardrobeShelfDepth(grid)

            // Порядок элементов по высоте фиксируется ОДИН раз, до обоих
            // проходов: внутри них позиции меняются, и пересортировка
            // посередине перемешала бы соседей.
            const sortedShelves = [...section.wardrobeFilling].sort((a, b) => a.positionY - b.positionY)

            // ПРОХОД ВНИЗ (сверху вниз). Потолок секции мог ОПУСТИТЬСЯ:
            // навесной профиль опустили по Y, профиль укоротили в панели,
            // уменьшили высоту модуля. Элемент, который больше не влезает под
            // новый потолок (или под опустившегося соседа СВЕРХУ), сдвигается
            // вниз ровно настолько, чтобы влезть: раньше он просто удалялся,
            // хотя место под ним освобождалось той же правкой — баг, найден
            // пользователем на драге профиля вниз. Кто и так влезает, не
            // трогается: его положение мог выбрать пользователь.
            //
            // Нижние границы (пол секции, сосед СНИЗУ) здесь НЕ проверяются
            // намеренно: сосед снизу в этом проходе ещё не сдвинут, и кламп по
            // его СТАРОМУ положению оставил бы элемент выше потолка, то есть
            // под удаление, хотя после сдвига соседа место появляется.
            // Нижние границы восстанавливает проход вверх ниже — он же и
            // выявляет элементы, которым места действительно нет: они
            // возвращаются выше потолка и удаляются фильтром.
            for (let i = sortedShelves.length - 1; i >= 0; i--) {
                const shelf = sortedShelves[i]
                const aboveShelf = sortedShelves[i + 1]
                const shelfHeight = getWardrobeShelfPixiHeight(shelf, depthMm, grid.productID)

                // aboveShelf в этом проходе уже сдвинут (идём сверху вниз),
                // поэтому граница считается по его НОВОМУ положению. Порядок
                // аргументов зазора значим: shelf снизу, aboveShelf сверху.
                const upperBound = aboveShelf
                    ? aboveShelf.positionY
                    - getWardrobeShelfMinGap(shelf, aboveShelf, depthMm, grid.productID)
                    - shelfHeight
                    : bounds.ceiling - getWardrobeItemCeilingGap(shelf) - shelfHeight

                if (shelf.positionY > upperBound) {
                    // Вниз округляем ВНИЗ (проход вверх — вверх): границы
                    // дробные от тригонометрии наклонной полки, округление
                    // наружу не даёт выскочить из разрешённого диапазона.
                    shelf.positionY = Math.floor(upperBound)
                }
            }

            // ПРОХОД ВВЕРХ (снизу вверх). Полка, прилегающая к соседу СНИЗУ
            // (в т.ч. к наклонной — её высота зависит от depthMm,
            // тригонометрия), должна сохранять минимальный зазор ОТ ЭТОГО
            // соседа даже после изменения геометрии (глубина модуля и т.п.) —
            // баг, найден пользователем: при изменении глубины модуля полка,
            // прилегающая к наклонной полке, не сдвигалась к новому
            // разрешённому положению и оставалась на старом positionY
            // (нарушая либо занижая зазор). Этот проход двигает ТОЛЬКО ВВЕРХ:
            // "утянуть" элемент вниз может лишь проход выше, и только когда он
            // иначе не влезает, — запас свободного места под элементом сам по
            // себе не повод его трогать (это может быть намеренный выбор
            // пользователя при перетаскивании, не нарушение). "Пол"
            // считается неявным нижним соседом первой полки — та же
            // getWardrobeShelfFloorGap, что уже используют add/drag, а сам
            // пол берётся из bounds.floor: у секции с поднятым навесным
            // профилем ("стена-стена") он выше пола комнаты.
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
                    : bounds.floor + getWardrobeShelfFloorGap(shelf, depthMm, grid.productID)

                if (shelf.positionY < lowerBound) {
                    shelf.positionY = Math.ceil(lowerBound)
                }

                prevShelf = shelf
            })

            const kept = section.wardrobeFilling.filter((shelf) => {
                const shelfHeight = getWardrobeShelfPixiHeight(shelf, depthMm, grid.productID)
                return shelf.positionY + shelfHeight <= bounds.ceiling - getWardrobeItemCeilingGap(shelf) + 0.01
            })

            removedShelvesCount += section.wardrobeFilling.length - kept.length
            section.wardrobeFilling = kept
        })

        if (removedShelvesCount > 0) {
            // Причина теперь не только высота профиля: потолок секции
            // опускает и отступ навесного профиля от пола, и высота модуля —
            // формулировка нейтральная к источнику правки.
            this.scope.callAlert("warning", removedShelvesCount === 1
                ? "Полка удалена — не помещается в границы секции!"
                : `Удалено полок: ${removedShelvesCount} — не помещаются в границы секции!`)
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
