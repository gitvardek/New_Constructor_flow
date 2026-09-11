//@ts-nocheck


import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { UM_PARAMS, WITH_TSARGA } from "@/components/UMconstructor/utils/Const.ts";
import * as THREE from "three";
import {
    GridModule,
    GridSection, TSelectedCell
} from "@/components/UMconstructor/types/UMtypes.ts";
import {
    WARDROBE_SECTION_WIDTH_MIN,
    WARDROBE_SECTION_WIDTH_MAX,
    WARDROBE_SECTIONS_QUANTITY_MIN,
    WARDROBE_SECTIONS_QUANTITY_MAX,
    WARDROBE_PROFILE_WIDTH,
} from "@/Application/F-wardrobeData.ts";
import { getWardrobeProfileProducts, getWardrobeProfileFastenings, getWardrobeProfileMaterials } from "@/components/UMconstructor/utils/WardrobeSystem.ts";


export default class SectionsManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    selectCell(sec: number | null = 0, cell: number | null = null, row: number | null = null, extra: number | null = null) {
        this.scope.selectCell("module", <TSelectedCell>{ sec, cell, row, extra });
    };

    // ==== Гардеробная система (WARDROBE)  ====
    // Полностью отдельно от addSection/deleteSection ниже: нет cells/loops/
    // hiTechProfiles/царги, а ширина секции НЕ делится с учётом
    // moduleThickness — профиль добавляется ПОВЕРХ ширины секций, а не
    // "съедает" её изнутри, как стенка box-UM. Число секций ограничено
    // WARDROBE_SECTIONS_QUANTITY_MIN/MAX (каталог
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
                wardrobeShelves: [],
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
            this.selectCell(0, null)
        }
    }

    // Точный ввод ширины секции числом (WardrobeSectionsView.vue через
    // UMconstructorClass.updateWardrobeSectorWidth, там же debounce). Тот же
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

    addSection({ grid = this.scope.UM_STORE.getUMGrid(), secIndex = 0, count = 1, reset = false }: {
        grid: GridModule,
        secIndex: number,
        count: number,
        reset: boolean,
    }) {

        const section = grid.sections[secIndex];
        const halfWidth = Math.floor((section.width - grid.moduleThickness * count) / (count + 1));
        const { MIN_SECTION_WIDTH } = this.scope.CONST

        if (halfWidth < MIN_SECTION_WIDTH) {
            this.scope.callAlert("warning", `Размер секций будет слишком мал! Пожалуйста, выберите меньшее количество секций!`)
            return;
        }

        const deltaLastSection = section.width - halfWidth * (count + 1) - grid.moduleThickness * count;

        // Обновляем ширину текущей колонки
        section.position.x = section.position.x - (section.width / 2 - halfWidth / 2)
        section.width = halfWidth;

        if (section.fillings?.length) {
            this.scope.FILLINGS.clearFillings({ grid, secIndex });
        }

        section.cells.forEach((cell, cellIndex) => {
            cell.width = halfWidth;
            cell.position.x = section.position.x
            cell.cellsRows = []
            if (cell.fillings?.length) {
                this.scope.FILLINGS.clearFillings({ grid, secIndex, cellIndex });
            }
        });

        // Создаем новую колонку с такими же параметрами
        for (let i = 0; i < count; i++) {
            const newColumn: GridSection = {
                ...section,
                number: section.number + 1 + i,
                width: halfWidth,
                cells: [],
                fasades: [],
                fillings: [],
                position: new THREE.Vector2(section.position.x + (section.width / 2 + grid.moduleThickness + halfWidth / 2) * (i + 1), section.position.y),
            }

            delete newColumn.hiTechProfiles

            if (section.loops) {
                newColumn.loops = []
                newColumn.loopsSides = {}
            }

            if (i === count - 1) {
                newColumn.width += deltaLastSection;
            }

            grid.sections.splice(secIndex + 1 + i, 0, newColumn);
        }

        if (grid.isRestrictedModule && section?.fasades?.length > 1) {
            let lastDoor = section.fasades.pop()
            lastDoor.id = 1;
            grid.sections[secIndex + 1].fasades.push(lastDoor);
        }

        if (!grid.isSlidingDoors && section?.fasades?.length > 0) {
            for (let i = 0; i < count; i++) {
                const newSecIndex = secIndex + 1 + i;
                if (!grid.sections[newSecIndex].fasades?.length) {
                    this.scope.FASADES.addDoor(newSecIndex, grid, false);
                }
            }
        }

        // Пересчёт царги для изменённых секций
        for (let i = 0; i <= count; i++) {
            this.scope.SHELVES.recalcSectionTsarga(grid.sections[secIndex + i]);
        }

        // Пересчёт петель для всех секций — смена топологии меняет соседство
        for (let i = 0; i < grid.sections.length; i++) {
            this.scope.LOOPS.calcLoops(i, grid);
        }

        if (reset) { this.scope.reset(grid) }

        this.selectCell(0, null)
        this.scope.debounce("postResetSelect", () => this.selectCell(0, null), 150)

    };

    updateSectionWidth({
        grid = this.scope.UM_STORE.getUMGrid(),
        secIndex,
        value
    }:
        {
            grid: GridModule,
            secIndex: number,
            value: number,
        }) {

        this.scope.debounce("updateSectionWidth", () => {

            const newValue = value;
            let adjustedValue;
            const { MIN_SECTION_WIDTH } = this.scope.CONST
            const MAX_SECTION_WIDTH = WITH_TSARGA.includes(grid.productID)
                ? this.scope.CONST.MAX_SECTION_WIDTH_TSARGA
                : this.scope.CONST.MAX_SECTION_WIDTH;

            // Обновляем выбранную секцию для визуального отображения
            this.selectCell(secIndex, null);

            if (!isNaN(newValue) && this.scope.RENDER_REF) {
                adjustedValue = this.scope.RENDER_REF.adjustSizeFromExternal({
                    dimension: "width",
                    value: newValue,
                    sec: secIndex,
                });
            }
            // Обновляем значение в module для синхронизации
            let section = grid.sections[secIndex]

            if (adjustedValue) {
                if (adjustedValue > MAX_SECTION_WIDTH) {
                    this.scope.callAlert("warning", `Ширина секции превышает допустимый предел! Уменьшите ширину секции!`)
                    return;
                }

                let next = grid.sections[secIndex + 1]
                let prev = grid.sections[secIndex - 1]

                let nextSection = next || prev

                let delta1 = section.width - adjustedValue
                let newNeighbourWidth = nextSection.width + delta1
                if (newNeighbourWidth < MIN_SECTION_WIDTH) {
                    this.scope.callAlert("warning", `Ширина соседней секции станет меньше допустимого минимума! Уменьшите ширину секции!`)
                    return;
                }
                if (newNeighbourWidth > MAX_SECTION_WIDTH) {
                    this.scope.callAlert("warning", `Ширина соседней секции превысит допустимый предел! Увеличьте ширину секции!`)
                    return;
                }

                let deltaPos1 = next ? -delta1 / 2 : delta1 / 2
                section.width = adjustedValue;
                section.position.x += deltaPos1

                section.cells.forEach((cell) => {
                    cell.width = adjustedValue;
                    cell.position.x = section.position.x

                    if (cell.cellsRows?.length) {
                        let divideDelta = Math.floor(-delta1 / cell.cellsRows.length)
                        let divideDeltaPos1 = next ? divideDelta / 2 : -divideDelta / 2
                        let extraSize = (cell.cellsRows.length - 1) * grid.moduleThickness

                        cell.cellsRows.forEach(item => {
                            if (item.width + divideDelta >= MIN_SECTION_WIDTH) {
                                item.width += divideDelta
                                item.position.x += divideDeltaPos1

                                item.extras?.forEach(extra => {
                                    extra.width = item.width
                                    extra.position.x = item.position.x

                                    if (extra.fillings?.length) {
                                        extra.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.x += divideDeltaPos1;
                                            } else {
                                                filling.width = extra.width;
                                                filling.size.x = filling.width;
                                                filling.position.x = item.position.x - item.width / 2;
                                            }
                                        })
                                    }
                                })

                                if (item.fillings?.length) {
                                    item.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += divideDeltaPos1;
                                        } else {
                                            filling.width = item.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = item.position.x - item.width / 2;
                                        }
                                    })
                                }
                            } else {
                                item.width = MIN_SECTION_WIDTH
                            }

                            extraSize += item.width
                        })

                        let lastRow = next ? cell.cellsRows[cell.cellsRows.length - 1] : cell.cellsRows[0]
                        if (lastRow.width + (adjustedValue - extraSize) >= MIN_SECTION_WIDTH) {
                            lastRow.width += (adjustedValue - extraSize)
                            lastRow.position.x += (adjustedValue - extraSize) / 2

                            lastRow.fillings?.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.x += (adjustedValue - extraSize) / 2;
                                } else {
                                    filling.width = lastRow.width;
                                    filling.size.x = filling.width;
                                    filling.position.x = lastRow.position.x - lastRow.width / 2;
                                }
                            })

                            lastRow.extras?.forEach(extra => {
                                extra.width = lastRow.width
                                extra.position.x = lastRow.position.x

                                extra.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (adjustedValue - extraSize) / 2;
                                    } else {
                                        filling.width = extra.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = extra.position.x - extra.width / 2;
                                    }
                                })
                            })
                        } else {
                            lastRow = cell.cellsRows.find((item) => {
                                return item.width + (adjustedValue - extraSize) >= MIN_SECTION_WIDTH
                            })

                            if (lastRow) {
                                lastRow.width += (adjustedValue - extraSize)
                                lastRow.position.x += (adjustedValue - extraSize) / 2

                                lastRow.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (adjustedValue - extraSize) / 2;
                                    } else {
                                        filling.width = lastRow.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = lastRow.position.x - lastRow.width / 2;
                                    }
                                })

                                lastRow.extras?.forEach(extra => {
                                    extra.width = lastRow.width
                                    extra.position.x = lastRow.position.x

                                    extra.fillings?.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += (adjustedValue - extraSize) / 2;
                                        } else {
                                            filling.width = extra.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = extra.position.x - extra.width / 2;
                                        }
                                    })
                                })
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
                        })
                    }
                })

                if (section.fillings?.length) {
                    section.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.x += deltaPos1;
                        } else {
                            filling.width = section.width;
                            filling.size.x = filling.width;
                            filling.position.x = section.position.x - section.width / 2;
                        }
                    })
                }

                let newRightWidth = nextSection.width - (-delta1)
                let delta2 = nextSection.width - newRightWidth

                nextSection.width = newRightWidth;
                nextSection.position.x += deltaPos1;

                nextSection.cells.forEach((cell) => {
                    cell.width = nextSection.width;
                    cell.position.x = nextSection.position.x;

                    if (cell.cellsRows?.length) {
                        let divideDelta = Math.floor(-delta2 / cell.cellsRows.length)
                        let divideDeltaPos = next ? -divideDelta / 2 : divideDelta / 2
                        let extraSize = (cell.cellsRows.length - 1) * grid.moduleThickness

                        cell.cellsRows.forEach(item => {
                            if (item.width + divideDelta >= MIN_SECTION_WIDTH) {
                                item.width += divideDelta
                                item.position.x += divideDeltaPos

                                item.extras?.forEach(extra => {
                                    extra.width = item.width
                                    extra.position.x = item.position.x

                                    if (extra.fillings?.length) {
                                        extra.fillings.forEach((filling) => {
                                            if (filling.isVerticalItem) {
                                                filling.position.x += divideDeltaPos;
                                            } else {
                                                filling.width = extra.width;
                                                filling.size.x = filling.width;
                                                filling.position.x = extra.position.x - extra.width / 2;
                                            }
                                        })
                                    }

                                })

                                if (item.fillings?.length) {
                                    item.fillings.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += divideDeltaPos;
                                        } else {
                                            filling.width = item.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = item.position.x - item.width / 2;
                                        }
                                    })
                                }
                            } else {
                                item.width = MIN_SECTION_WIDTH
                            }


                            extraSize += item.width

                        })

                        let lastRow = next ? cell.cellsRows[0] : cell.cellsRows[cell.cellsRows.length - 1]
                        if (lastRow.width + (newRightWidth - extraSize) >= MIN_SECTION_WIDTH) {
                            lastRow.width += (newRightWidth - extraSize)
                            lastRow.position.x += (newRightWidth - extraSize) / 2

                            lastRow.fillings?.forEach((filling) => {
                                if (filling.isVerticalItem) {
                                    filling.position.x += (newRightWidth - extraSize) / 2;
                                } else {
                                    filling.width = lastRow.width;
                                    filling.size.x = filling.width;
                                    filling.position.x = lastRow.position.x - lastRow.width / 2;
                                }
                            })

                            lastRow.extras?.forEach(extra => {
                                extra.width = lastRow.width
                                extra.position.x = lastRow.position.x

                                extra.fillings?.forEach((filling) => {
                                    if (filling.isVerticalItem) {
                                        filling.position.x += (newRightWidth - extraSize) / 2;
                                    } else {
                                        filling.width = extra.width;
                                        filling.size.x = filling.width;
                                        filling.position.x = extra.position.x - extra.width / 2;
                                    }
                                })
                            })
                        } else {
                            lastRow = cell.cellsRows.find((item) => {
                                return item.width + (newRightWidth - extraSize) >= MIN_SECTION_WIDTH
                            })

                            if (lastRow) {
                                lastRow.width += (newRightWidth - extraSize)
                                lastRow.position.x += (newRightWidth - extraSize) / 2
                                lastRow.extras?.forEach(extra => {
                                    extra.width = lastRow.width
                                    extra.position.x = lastRow.position.x

                                    lastRow.fillings?.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += (newRightWidth - extraSize) / 2;
                                        } else {
                                            filling.width = lastRow.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = lastRow.position.x - lastRow.width / 2;
                                        }
                                    })

                                    extra.fillings?.forEach((filling) => {
                                        if (filling.isVerticalItem) {
                                            filling.position.x += (newRightWidth - extraSize) / 2;
                                        } else {
                                            filling.width = extra.width;
                                            filling.size.x = filling.width;
                                            filling.position.x = extra.position.x - extra.width / 2;
                                        }
                                    })
                                })
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
                        })
                    }
                })


                if (nextSection.fillings?.length) {
                    nextSection.fillings.forEach((filling) => {
                        if (filling.isVerticalItem) {
                            filling.position.x += deltaPos1;
                        } else {
                            filling.width = nextSection.width;
                            filling.size.x = filling.width;
                            filling.position.x = nextSection.position.x - nextSection.width / 2;
                        }
                    })
                }

                this.scope.SHELVES.recalcSectionTsarga(section);
                if (nextSection) {
                    this.scope.SHELVES.recalcSectionTsarga(nextSection);
                }
                this.scope.reset(grid)
            }
        }, 1000)

    };

    deleteSection(grid: GridModule = this.scope.UM_STORE.getUMGrid(), secIndex: number, reset: boolean = false) {
        const MAX_SECTION_WIDTH = WITH_TSARGA.includes(grid.productID)
            ? this.scope.CONST.MAX_SECTION_WIDTH_TSARGA
            : this.scope.CONST.MAX_SECTION_WIDTH;
        const current = grid.sections[secIndex];
        const next = grid.sections[secIndex + 1];
        const prev = grid.sections[secIndex - 1];

        const combinedWidth = next
            ? current.width + next.width + grid.moduleThickness
            : current.width + prev.width + grid.moduleThickness;

        if (combinedWidth > MAX_SECTION_WIDTH) {
            this.scope.callAlert("warning", `Суммарная ширина новой секции превысит допустимый предел! Уменьшите ширину секций!`)
            return;
        }

        if (next) {
            next.position.x = current.position.x - current.width / 2 + combinedWidth / 2
            next.width = combinedWidth;
            next.cells?.forEach((elem) => {
                elem.position.x = next.position.x
                elem.width = combinedWidth;
                if (elem.cellsRows)
                    delete elem.cellsRows
            });
        } else {
            prev.position.x = prev.position.x - prev.width / 2 + combinedWidth / 2
            prev.width = combinedWidth;
            prev.cells?.forEach((elem) => {
                elem.position.x = prev.position.x
                elem.width = combinedWidth;
                if (elem.cellsRows)
                    delete elem.cellsRows
            });
        }

        this.scope.LOOPS.calcLoops(next ? secIndex + 1 : secIndex - 1, grid);

        if (grid.sections.length > 1) {
            grid.sections.splice(secIndex, 1);
            this.scope.FILLINGS.updateSecAfterDelete(grid, secIndex);
        }

        //Проверка: петли не должны стоять с обеих сторон одной перегородки.
        this.scope.LOOPS.resolvePartitionLoopsConflicts(grid);

        // Пересчёт петель для всех секций — смена топологии меняет соседство
        for (let i = 0; i < grid.sections.length; i++) {
            this.scope.LOOPS.calcLoops(i, grid);
        }

        // Пересчёт царги для объединённой секции
        this.scope.SHELVES.recalcSectionTsarga(next || prev);

        if (reset) {
            this.scope.reset(grid)
        }
        this.selectCell(0, null)
        this.scope.debounce("postResetSelect", () => this.selectCell(0, null), 150)
    };

    autoSelectDeepest = (grid: GridModule = this.scope.UM_STORE.getUMGrid()) => {

        const sec = 0;
        const section = grid.sections[sec];

        let cell: number | null = null;
        let row: number | null = null;
        let extra: number | null = null;

        if (section.cells?.length) {
            cell = 0;
            if (section.cells[0].cellsRows?.length) {
                row = 0;
                if (section.cells[0].cellsRows[0].extras?.length) {
                    extra = 0;
                }
            }
        }

        this.selectCell(sec, cell, row, extra, null)
    };
}
