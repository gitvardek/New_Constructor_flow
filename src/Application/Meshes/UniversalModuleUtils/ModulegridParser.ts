// @ts-nocheck

// Преобразует плоскую 2D-сетку (GridModule: sections/cells/cellsRows/extras)
// в внутреннюю форму PROPS.CONFIG.SECTIONS, которую дальше потребляет
// FillingMeshBuilder/AdjacencyCalculator. Работает только с PROPS.CONFIG и
// самими данными сетки — про корпус/стенки/CSG ничего не знает, поэтому
// продукто-агностичен (переиспользуем будущими типами товара, у которых
// секции есть, а стенок нет).

import * as THREE from 'three'
import * as THREETypes from "@/types/types"
import { WITH_TSARGA, MODULE_TSARGA_OPTIONS } from '@/components/UMconstructor/utils/Const';
import { createTsargaData } from '@/components/UMconstructor/utils/Tsarga';

export class ModulegridParser {
    private builder: any

    constructor(builder: any) {
        this.builder = builder
    }

    parseModulegrid(product_data: THREETypes.TObject, PROPS: Object) {

        this.validateGridWalls(product_data, PROPS.CONFIG)

        const OLD_SECTIONS = PROPS.CONFIG.SECTIONS
        const OLD_FASADES = PROPS.CONFIG.FASADE_POSITIONS
        PROPS.CONFIG.FASADE_POSITIONS = []
        PROPS.CONFIG.FASADE_PROPS = []
        PROPS.CONFIG.SECTIONS = {}

        if (PROPS.CONFIG.LOOPS)
            PROPS.CONFIG.LOOPS = {}

        const full_horizont_height = PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] + PROPS.CONFIG.EXPRESSIONS['#HORIZONT#']

        if (product_data.profilesConfig) {
            PROPS.CONFIG['PROFILECOLOR'] = product_data.profilesConfig.COLOR

            if (product_data.profilesConfig.sideProfile)
                PROPS.CONFIG['SIDEPROFILE'] = product_data.profilesConfig.sideProfile
            else
                delete PROPS.CONFIG['SIDEPROFILE']
        }

        const isSlidingDoors = product_data.fasades ? 100 : 0
        const hasModuleTsarga = WITH_TSARGA.includes(product_data.productID) &&
            PROPS.CONFIG.OPTIONS?.some(opt => MODULE_TSARGA_OPTIONS.includes(+opt.id) && opt.active)

        product_data.sections.forEach((section, secIndex) => {

            let sectionSize = new THREE.Vector3(section.width, section.height,
                product_data.depth - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"])
            const prevSection = PROPS.CONFIG.SECTIONS[secIndex] || false;
            const nextSection = product_data.sections[secIndex + 1] || false;

            PROPS.CONFIG.SECTIONS[secIndex + 1] = {
                fillings: [],
                size: sectionSize,
                position: new THREE.Vector3((prevSection ? prevSection.position.x + prevSection.size.x / 2 : 0) + (prevSection ? PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] : product_data.leftWallThickness) + sectionSize.x / 2,
                    PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"] + PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"],
                    (PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] + sectionSize.z) / 2)
            }

            const curSection = PROPS.CONFIG.SECTIONS[secIndex + 1]

            if (nextSection)
                curSection.fillings.push({  //Добавляем разделитель секций, как товар наполнения
                    position: new THREE.Vector3(curSection.position.x + curSection.size.x / 2 + PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] / 2,
                        curSection.position.y - full_horizont_height, curSection.position.z - (isSlidingDoors / 2 || 0)),
                    size: new THREE.Vector3(PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"], curSection.size.y, product_data.depth - isSlidingDoors), // curSection.size.z
                    product: 5820274,
                    material: PROPS.CONFIG.MODULE_COLOR,
                    id: curSection.fillings.length + 1,
                    type: 'section_partition',
                })

            let cells = [...section.cells].reverse()

            // Возвращает объект царги верхней границы ячейки, в т.ч. когда царга на уровне rows/extras
            const getCellTopTsarga = (cell) => {
                if (!cell) return undefined;
                if (cell.tsarga) return cell.tsarga;
                if (cell.cellsRows?.length) {
                    let foundTsarga;
                    cell.cellsRows.some(row => {
                        if (row.extras?.length) {
                            // sort ascending by y → sorted[0] = верхний extra (наименьший y = ближайший к крышке)
                            const sorted = [...row.extras].sort((a, b) => a.position.y - b.position.y);
                            foundTsarga = sorted[0]?.tsarga;
                        } else {
                            foundTsarga = row.tsarga;
                        }
                        return !!foundTsarga;
                    });
                    return foundTsarga || undefined;
                }
                return undefined;
            }

            cells?.forEach((cell, cellIndex) => {
                if (cellIndex > 0) {
                    const cellTsarga = getCellTopTsarga(cells[cellIndex - 1]);
                    const isGlassShelf = !!cell.glassShelf
                    const shelfThickness = isGlassShelf
                        ? this.builder.GLASS_SHELF_THICKNESS
                        : PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"]

                    curSection.fillings.push({  //Добавляем полку, как товар наполнения
                        position: new THREE.Vector3(cell.position.x, cell.position.y - shelfThickness - full_horizont_height,
                            curSection.position.z - (isSlidingDoors / 2 || 0)),
                        size: new THREE.Vector3(cell.width, shelfThickness, product_data.depth - isSlidingDoors), // curSection.size.z
                        product: isGlassShelf ? this.builder.SHELF_PRODUCTS.glass : this.builder.SHELF_PRODUCTS.ldsp,
                        id: curSection.fillings.length + 1,
                        type: isGlassShelf ? 'glass_shelf' : 'shelf',
                        ...(isGlassShelf ? {} : { material: PROPS.CONFIG.MODULE_COLOR }),
                        ...(cellTsarga ? { tsarga: cellTsarga } : {})
                    })
                }

                cell.cellsRows?.forEach((row, rowIndex) => {
                    if (rowIndex > 0)
                        curSection.fillings.push({  //Добавляем верт. полку, как товар наполнения
                            position: new THREE.Vector3(row.position.x - row.width / 2 - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] / 2,
                                row.position.y - full_horizont_height,
                                curSection.position.z - (isSlidingDoors / 2 || 0)),
                            size: new THREE.Vector3(PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"], cell.height, product_data.depth - isSlidingDoors), // curSection.size.z
                            product: 5820266,
                            id: curSection.fillings.length + 1,
                            material: PROPS.CONFIG.MODULE_COLOR,
                            type: 'vertical_shelf',
                        })

                    row.extras?.slice().sort((a, b) => a.position.y - b.position.y).forEach((extra, extraIndex, sortedExtras) => {
                        if (extraIndex > 0) {
                            const extraTsarga = sortedExtras[extraIndex - 1]?.tsarga;
                            const isGlassShelf = !!extra.glassShelf
                            const shelfThickness = isGlassShelf
                                ? this.builder.GLASS_SHELF_THICKNESS
                                : PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"]

                            curSection.fillings.push({  //Добавляем полку, как товар наполнения
                                position: new THREE.Vector3(extra.position.x, extra.position.y - shelfThickness - full_horizont_height,
                                    curSection.position.z - (isSlidingDoors / 2 || 0)),
                                size: new THREE.Vector3(row.width, shelfThickness, product_data.depth - isSlidingDoors), // curSection.size.z
                                product: isGlassShelf ? this.builder.SHELF_PRODUCTS.glass : this.builder.SHELF_PRODUCTS.ldsp,
                                id: curSection.fillings.length + 1,
                                type: isGlassShelf ? 'glass_shelf' : 'shelf',
                                ...(isGlassShelf ? {} : { material: PROPS.CONFIG.MODULE_COLOR }),
                                ...(extraTsarga ? { tsarga: extraTsarga } : {})
                            })
                        }


                        extra.fillings?.forEach((filling) => {
                            let z_pos = filling.type !== "any" ? product_data.depth - filling.size.z / 2 - (isSlidingDoors || 0) : curSection.position.z - (isSlidingDoors || 0)

                            let fillingPos = new THREE.Vector3(
                                filling.isVerticalItem ? extra.position.x - extra.width / 2 + filling.distances.left + filling.width / 2 : extra.position.x,
                                extra.position.y + filling.distances.bottom - full_horizont_height,
                                z_pos
                            )

                            let newFilling = {
                                ...filling,
                                position: fillingPos,
                                id: curSection.fillings.length + 1,
                            }

                            if (!filling.isProfile && !["glass_shelf", 'any'].includes(filling.type))
                                newFilling.material = PROPS.CONFIG.MODULE_COLOR

                            curSection.fillings.push(newFilling)
                        })
                    })

                    row.fillings?.forEach((filling) => {
                        let z_pos = filling.type !== "any" ? product_data.depth - filling.size.z / 2 - (isSlidingDoors || 0) : curSection.position.z - (isSlidingDoors || 0)

                        let fillingPos = new THREE.Vector3(
                            filling.isVerticalItem ? row.position.x - row.width / 2 + filling.distances.left + filling.width / 2 : row.position.x,
                            row.position.y + filling.distances.bottom - full_horizont_height,
                            z_pos
                        )

                        let newFilling = {
                            ...filling,
                            position: fillingPos,
                            id: curSection.fillings.length + 1,
                        }

                        if (!filling.isProfile && !["glass_shelf", 'any'].includes(filling.type))
                            newFilling.material = PROPS.CONFIG.MODULE_COLOR

                        curSection.fillings.push(newFilling)
                    })
                })

                cell.fillings?.forEach((filling) => {
                    let z_pos = filling.type !== "any" ? product_data.depth - filling.size.z / 2 - (isSlidingDoors || 0) : curSection.position.z - (isSlidingDoors || 0)

                    let fillingPos = new THREE.Vector3(
                        filling.isVerticalItem ? cell.position.x - cell.width / 2 + filling.distances.left + filling.width / 2 : cell.position.x,
                        cell.position.y + filling.distances.bottom - full_horizont_height,
                        z_pos
                    )

                    let newFilling = {
                        ...filling,
                        position: fillingPos,
                        id: curSection.fillings.length + 1,
                    }

                    if (!filling.isProfile && !["glass_shelf", 'any'].includes(filling.type))
                        newFilling.material = PROPS.CONFIG.MODULE_COLOR

                    curSection.fillings.push(newFilling)
                })
            })

            if (!hasModuleTsarga) {
                if (cells.length > 0) {
                    const topCellTsarga = getCellTopTsarga(cells[cells.length - 1]);
                    if (topCellTsarga) {
                        curSection.fillings.push(topCellTsarga);
                    }
                } else if (section.width >= this.builder.UM_PARAMS.MIN_TSARGA_WIDTH && section.width <= this.builder.UM_PARAMS.MAX_TSARGA_WIDTH) {
                    curSection.fillings.push(
                        createTsargaData(section.width, curSection.position.x)
                    );
                }
            }

            // Проверка на фантомное содержание (остаточные/некорректные/битые данные)

            const ownFillings = section.cells?.length ? [] : (section.fillings ?? [])

            ownFillings.forEach((filling) => {
                // distances рассчитывает 2D-слой при отрисовке. Без них разместить элемент
                // нельзя, поэтому пропускаем запись, а не роняем сборку всего модуля

                if (!filling.distances) return

                let z_pos = filling.type !== "any" ? product_data.depth - filling.size.z / 2 - (isSlidingDoors || 0) : curSection.position.z - (isSlidingDoors || 0)

                let fillingPos = new THREE.Vector3(
                    filling.isVerticalItem ? curSection.position.x - curSection.size.x / 2 + filling.distances.left + filling.width / 2 : curSection.position.x,
                    curSection.position.y + filling.distances.bottom - full_horizont_height,
                    z_pos
                )

                let newFilling = {
                    ...filling,
                    position: fillingPos,
                    id: curSection.fillings.length + 1,
                }

                if (!filling.isProfile && !["glass_shelf", 'any'].includes(filling.type))
                    newFilling.material = PROPS.CONFIG.MODULE_COLOR

                curSection.fillings.push(newFilling)
            })

            let allFasades = []
            section.fasades?.forEach((door, doorID) => {
                let tmp = []
                door.forEach((fasade, fasadeID) => {
                    fasade.section = secIndex + 1
                    fasade.door = doorID + 1
                    tmp.push(fasade)
                })
                allFasades.push(...tmp)
            })

            if (section.fasadesDrawers)
                allFasades.push(...section.fasadesDrawers)

            allFasades.sort((a, b) => a.id - b.id)

            allFasades.forEach((fasade, fasadeID) => {
                if (!fasade.error) {
                    let tmp = {
                        ...OLD_FASADES[0],
                        FASADE_WIDTH: fasade.width,
                        FASADE_HEIGHT: fasade.height,
                        POSITION_X: fasade.position.x,
                        POSITION_Y: fasade.position.y,  //(PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"]) + 2,
                        POSITION_Z: PROPS.CONFIG.SIZE.depth + 2,
                        FASADE_NUMBER: PROPS.CONFIG.FASADE_POSITIONS.length,
                        SECTION: fasade.section || fasade.sec || 1,
                        DOOR: fasade.door || fasade.cellIndex || null,
                        SEGMENT: fasade.id || fasade.key || null,
                    }
                    if (fasade.item)
                        tmp.drawer = fasade.item

                    PROPS.CONFIG.FASADE_POSITIONS.push(tmp)
                    PROPS.CONFIG.FASADE_PROPS.push(fasade.material)
                }
            })

            if (section.loops && PROPS.CONFIG.LOOPS)
                PROPS.CONFIG.LOOPS[secIndex + 1] = section.loops
            else {
                delete section.loops
                delete section.loopsSides
            }

        })

        if (product_data.fasades) {
            let allFasades = []
            product_data.fasades?.forEach((door, doorID) => {
                allFasades.push(...door)
            })

            allFasades.forEach((fasade, fasadeID) => {
                if (!fasade.error) {
                    PROPS.CONFIG.FASADE_POSITIONS.push({
                        ...OLD_FASADES[0],
                        FASADE_WIDTH: fasade.width,
                        FASADE_HEIGHT: fasade.height,
                        POSITION_X: fasade.position.x,
                        POSITION_Y: fasade.position.y,  //(PROPS.CONFIG.EXPRESSIONS["#HORIZONT#"]) + 2,
                        POSITION_Z: fasade.position.z,
                        FASADE_NUMBER: PROPS.CONFIG.FASADE_POSITIONS.length,
                    })
                    PROPS.CONFIG.FASADE_PROPS.push(fasade.material)
                }
            })
        }
    }

    // Проверка сетки на соответствие входящим параметрам материала корпус/стенки

    private validateGridWalls(grid: GridModule, CONFIG: THREETypes.TConfig): boolean {
        if (!grid?.sections?.length) {
            return false
        }

        console.log(this.builder, 'this.builder.')

        const moduleThickness = grid.moduleThickness
        const leftWidth = this.builder._FASADE[CONFIG.LEFTSIDECOLOR?.COLOR]?.DEPTH || moduleThickness
        const rightWidth = this.builder._FASADE[CONFIG.RIGHTSIDECOLOR?.COLOR]?.DEPTH || moduleThickness
        const oldLeft = grid.leftWallThickness ?? moduleThickness
        const oldRight = grid.rightWallThickness ?? moduleThickness

        if (leftWidth === oldLeft && rightWidth === oldRight) {
            return false
        }

        // Формула та же, что в reset(): сумма секций против доступной ширины,
        const sectionsTotalWidth = grid.width - leftWidth - rightWidth
            - (grid.sections.length - 1) * grid.moduleThickness

        let sectionsWidthSum = 0
        grid.sections.forEach((section) => {
            sectionsWidthSum += section.width
        })

        const deltaWidth = sectionsTotalWidth - sectionsWidthSum
        const lastSection = grid.sections[grid.sections.length - 1]
        const newLastWidth = lastSection.width + deltaWidth
        const maxSectionWidth = WITH_TSARGA.includes(grid.productID)
            ? this.builder.UM_PARAMS.MAX_SECTION_WIDTH_TSARGA
            : this.builder.UM_PARAMS.MAX_SECTION_WIDTH

        const needRebuild = newLastWidth < this.builder.UM_PARAMS.MIN_SECTION_WIDTH
            || newLastWidth > maxSectionWidth
            || (deltaWidth !== 0 && (!!grid.profilesConfig
                || lastSection.cells?.some((cell) => cell.cellsRows?.length)))

        if (needRebuild) {
            console.warn("Сетка модуля не соответствует материалам боковых стенок, "
                + "поправить автоматически нельзя — нужен пересчёт в 2D-конструкторе", grid)
            return false
        }

        grid.leftWallThickness = leftWidth
        grid.rightWallThickness = rightWidth

        const shiftX = leftWidth - oldLeft
        if (shiftX !== 0) {
            grid.sections.forEach((section) => {
                this.shiftGridBranchX(section, shiftX)
            })
        }

        if (deltaWidth !== 0) {
            lastSection.width = newLastWidth
            lastSection.position.x += deltaWidth / 2

            lastSection.cells?.forEach((cell) => {
                cell.width = lastSection.width
                cell.position.x = lastSection.position.x
                this.resizeGridFillingsX(cell)
            })

            this.resizeGridFillingsX(lastSection)
        }

        return true
    }

    // Сдвигает по X всю ветку сетки: саму область, её ячейки, ряды, уровни и наполнение 

    private shiftGridBranchX(node: THREETypes.TObject, shiftX: number) {
        if (!node) {
            return
        }

        if (node.position) {
            node.position.x += shiftX
        }

        node.fillings?.forEach((filling) => {
            if (filling.position) {
                filling.position.x += shiftX
            }
        })

        const children = [...(node.cells ?? []), ...(node.cellsRows ?? []), ...(node.extras ?? [])]
        children.forEach((child) => {
            this.shiftGridBranchX(child, shiftX)
        })
    }

    // Подгоняет наполнение под новую ширину родителя

    private resizeGridFillingsX(parent: THREETypes.TObject) {
        parent.fillings?.forEach((filling) => {
            // Вертикальные элементы тянутся по высоте, профили — по ширине модуля:
            // от ширины родителя они не зависят
            if (filling.isVerticalItem || filling.isProfile) {
                return
            }

            filling.width = parent.width
            filling.size.x = parent.width
            filling.position.x = parent.position.x - parent.width / 2
        })
    }
}
