//@ts-nocheck

// ==== Гардеробная система (WARDROBE) ====
// Секторы гардеробной. Вынесено из SectionsManager.ts, где жило рядом с
// box-UM addSection/deleteSection/updateSectionWidth: общего кода не было
// вовсе (нет cells/loops/hiTechProfiles/царги), поэтому разъехались по
// разным классам. Точка входа — scope.WARDROBE.sections.
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import * as THREE from "three";
import { GridModule, GridSection } from "@/components/UMconstructor/types/UMtypes.ts";
import {
    WARDROBE_SECTION_WIDTH_MIN,
    WARDROBE_SECTION_WIDTH_MAX,
    WARDROBE_SECTIONS_QUANTITY_MIN,
    WARDROBE_SECTIONS_QUANTITY_MAX,
    WARDROBE_PROFILE_WIDTH,
} from "@/Application/F-wardrobeData.ts";
import { getWardrobeProfileProducts, getWardrobeProfileFastenings, getWardrobeProfileMaterials } from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";

export default class WardrobeSectionsManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    // Ширина секции НЕ делится с учётом moduleThickness — профиль добавляется
    // ПОВЕРХ ширины секций, а не "съедает" её изнутри, как стенка box-UM.
    // Число секций ограничено WARDROBE_SECTIONS_QUANTITY_MIN/MAX (каталог
    // _WARDROBE_SYSTEM[productID].product.sections.quantity).
    //
    // count/reset — контракт как у addSection: count — на сколько
    // ДОПОЛНИТЕЛЬНЫХ секций разбить (UMconstructorClass.reset() зовёт для
    // авто-разбиения, когда ввод "Ширины" толкает секцию шире
    // WARDROBE_SECTION_WIDTH_MAX); reset=false по умолчанию, чтобы reset() не
    // рекурсировал сам в себя — интерактивные вызовы передают reset=true.
    addWardrobeSector(grid: GridModule, secIndex: number = 0, count: number = 1, reset: boolean = false) {
        const maxAddable = WARDROBE_SECTIONS_QUANTITY_MAX - grid.sections.length
        if (maxAddable <= 0) {
            this.scope.callAlert("warning", `Максимальное количество секторов: ${WARDROBE_SECTIONS_QUANTITY_MAX}`)
            return
        }
        count = Math.min(count, maxAddable)

        const section = grid.sections[secIndex]

        // count новых секций = count новых профилей-границ (см. ниже) — это
        // съедает count*WARDROBE_PROFILE_WIDTH бюджета ширины (UMconstructorClass.
        // reset(): profileOverhead зависит от числа секций). Вычитаем эту
        // ширину ДО деления на партии, а не оставляем reset()'у "докидывать"/
        // "отгрызать" её потом — иначе вся эта дельта уходила бы ОДНИМ куском в
        // ПОСЛЕДНЮЮ из новых частей (reset() дельту всегда кладёт в последнюю
        // секцию), и после разбиения секции отличались бы ровно на
        // WARDROBE_PROFILE_WIDTH (баг, показанный пользователем — 300 и 275мм
        // вместо примерно равных). Так разница — не больше пары мм, обычный
        // остаток от целочисленного деления.
        const availableWidth = section.width - count * WARDROBE_PROFILE_WIDTH
        const partWidth = Math.floor(availableWidth / (count + 1))

        if (partWidth < WARDROBE_SECTION_WIDTH_MIN) {
            this.scope.callAlert("warning", "Сектор слишком узкий, чтобы разделить его на несколько")
            return
        }

        const deltaLastPart = availableWidth - partWidth * (count + 1)
        section.width = partWidth

        for (let i = 0; i < count; i++) {
            const newSection: GridSection = {
                number: section.number + 1 + i,
                width: partWidth + (i === count - 1 ? deltaLastPart : 0),
                height: section.height,
                type: "section",
                cells: [],
                position: new THREE.Vector2(0, 0),
                // Пусто по умолчанию — см. createWardrobeGrid.ts.
                wardrobeFilling: [],
            }

            grid.sections.splice(secIndex + 1 + i, 0, newSection)

            // Профилей всегда на 1 больше, чем секций — добавляем один на
            // новой границе. height — как у уже существующих (grid.height,
            // максимум по всем профилям) — иначе добавление секции могло бы
            // неожиданно понизить высоту всего модуля (см. reset()).
            // profileProductId/fasteningId — первые доступные из каталога,
            // тот же принцип, что у createDefaultWardrobeProfiles.
            const newProfileProductId = getWardrobeProfileProducts(grid.productID)[0]?.id
            grid.wardrobeProfiles?.splice(secIndex + 1 + i, 0, {
                id: (grid.wardrobeProfiles?.length || 0) + 1,
                profileProductId: newProfileProductId,
                fasteningId: getWardrobeProfileFastenings(grid.productID)[0]?.id,
                colorId: newProfileProductId
                    ? getWardrobeProfileMaterials(grid.productID, newProfileProductId)[0]?.ID
                    : undefined,
                height: grid.height,
            })
        }

        if (reset) this.scope.reset(grid)
    }

    deleteWardrobeSector(grid: GridModule, secIndex: number, reset: boolean = false) {
        if (grid.sections.length <= WARDROBE_SECTIONS_QUANTITY_MIN) {
            this.scope.callAlert("warning", `Минимальное количество секторов: ${WARDROBE_SECTIONS_QUANTITY_MIN}`)
            return
        }

        const current = grid.sections[secIndex]
        const next = grid.sections[secIndex + 1]
        const prev = grid.sections[secIndex - 1]

        // Слияние убирает 1 профиль-границу — освобождает WARDROBE_PROFILE_WIDTH
        // бюджета ширины (симметрично addWardrobeSector выше). Добавляем эту
        // ширину сразу в объединённую секцию, а не оставляем reset()'у потом
        // "докидывать" её отдельной дельтой в ПОСЛЕДНЮЮ секцию ГРИДА (тот же
        // класс бага — непредсказуемый скачок секции, не имеющей отношения
        // к самому слиянию).
        const combinedWidth = (next
            ? current.width + next.width
            : current.width + prev.width) + WARDROBE_PROFILE_WIDTH

        if (combinedWidth > WARDROBE_SECTION_WIDTH_MAX) {
            this.scope.callAlert("warning", "Суммарная ширина соседнего сектора превысит допустимый предел")
            return
        }

        if (next) next.width = combinedWidth
        else prev.width = combinedWidth

        grid.sections.splice(secIndex, 1)
        grid.wardrobeProfiles?.splice(secIndex, 1)

        if (reset) {
            this.scope.reset(grid)
            this.scope.SECTIONS.selectCell(0, null)
        }
    }

    // Точный ввод ширины секции числом (WardrobeSectionsView.vue через
    // WardrobeModule.updateSectorWidth, там же debounce). Тот же
    // принцип "меняем границу с соседом", что у box-UM
    // addSection.updateSectionWidth выше и у драга профиля мышью: двигается
    // ГРАНИЦА между этой и соседней секцией, поэтому суммарная ширина (и
    // grid.width) от правки одного поля не меняется. Сосед — следующая секция
    // (двигаем её правую границу), у ПОСЛЕДНЕЙ — предыдущая (левую).
    //
    // Дельта КЛАМПится к ближайшему допустимому значению, а не отклоняется с
    // alert'ом, как в box-UM: MainInput сверяет ввод только со своими
    // статичными :min/:max и считает, скажем, 900 валидным, хотя реальный
    // диапазон зависит от ширины соседа (minDelta/maxDelta ниже). При отказе
    // section.width не менялся -> не менялся :modelValue -> не срабатывал
    // watch(props.modelValue) в MainInput, и поле зависало на введённом числе.
    updateWardrobeSectorWidth(grid: GridModule, secIndex: number, value: number, reset: boolean = true) {
        const sections = grid.sections
        const section = sections[secIndex]
        const neighborIndex = secIndex < sections.length - 1 ? secIndex + 1 : secIndex - 1
        const neighbor = sections[neighborIndex]
        if (!section || !neighbor || Number.isNaN(value)) return

        const startWidth = section.width
        const neighborStartWidth = neighbor.width
        const requestedDelta = value - startWidth

        const minDelta = Math.max(
            WARDROBE_SECTION_WIDTH_MIN - startWidth,
            neighborStartWidth - WARDROBE_SECTION_WIDTH_MAX,
        )
        const maxDelta = Math.min(
            WARDROBE_SECTION_WIDTH_MAX - startWidth,
            neighborStartWidth - WARDROBE_SECTION_WIDTH_MIN,
        )
        const clampedDelta = Math.max(minDelta, Math.min(maxDelta, requestedDelta))

        if (clampedDelta !== requestedDelta) {
            this.scope.callAlert("warning", `Ширина сектора ограничена соседним сектором — установлено ${Math.round(startWidth + clampedDelta)} мм`)
        }

        section.width = startWidth + clampedDelta
        neighbor.width = neighborStartWidth - clampedDelta

        if (reset) this.scope.reset(grid)
    }

}
