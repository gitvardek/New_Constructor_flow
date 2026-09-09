// @ts-nocheck

// Преобразует плоскую 2D-сетку (GridModule: sections/cells/cellsRows/extras)
// в внутреннюю форму PROPS.CONFIG.SECTIONS, которую дальше потребляет
// FillingMeshBuilder/AdjacencyCalculator. Работает только с PROPS.CONFIG и
// самими данными сетки — про корпус/стенки/CSG ничего не знает, поэтому
// продукто-агностичен (переиспользуем будущими типами товара, у которых
// секции есть, а стенок нет).

import * as THREE from 'three'
import * as THREETypes from "@/types/types"
import { WITH_TSARGA } from '@/components/UMconstructor/utils/Const';

export class ModulegridParser {
    private builder: any

    constructor(builder: any) {
        this.builder = builder
    }

    parseModulegrid(product_data: THREETypes.TObject, PROPS: Object) {
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
        const hasMetalTsarga = WITH_TSARGA.includes(product_data.productID) &&
            PROPS.CONFIG.OPTIONS?.some(opt => +opt.id === 7250589 && opt.active)

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
                    curSection.fillings.push({  //Добавляем полку, как товар наполнения
                        position: new THREE.Vector3(cell.position.x, cell.position.y - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] - full_horizont_height,
                            curSection.position.z - (isSlidingDoors / 2 || 0)),
                        size: new THREE.Vector3(cell.width, PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"], product_data.depth - isSlidingDoors), // curSection.size.z
                        product: 5975548,
                        id: curSection.fillings.length + 1,
                        material: PROPS.CONFIG.MODULE_COLOR,
                        type: 'shelf',
                        ...(cellTsarga ? { tsarga: cellTsarga } : {})
                    })
                    // if (cellTsarga) {
                    //     curSection.fillings.push(cellTsarga)
                    // }
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
                            curSection.fillings.push({  //Добавляем полку, как товар наполнения
                                position: new THREE.Vector3(extra.position.x, extra.position.y - PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"] - full_horizont_height,
                                    curSection.position.z - (isSlidingDoors / 2 || 0)),
                                size: new THREE.Vector3(row.width, PROPS.CONFIG.EXPRESSIONS["#MATERIAL_THICKNESS#"], product_data.depth - isSlidingDoors), // curSection.size.z
                                product: 5975548,
                                id: curSection.fillings.length + 1,
                                material: PROPS.CONFIG.MODULE_COLOR,
                                type: 'shelf',
                                ...(extraTsarga ? { tsarga: extraTsarga } : {})
                            })
                            // if (extraTsarga) {
                            //     curSection.fillings.push(extraTsarga)
                            // }
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

            if (!hasMetalTsarga) {
                if (cells.length > 0) {
                    const topCellTsarga = getCellTopTsarga(cells[cells.length - 1]);
                    if (topCellTsarga) {
                        curSection.fillings.push(topCellTsarga);
                    }
                } else if (section.width >= this.builder.UM_PARAMS.MIN_TSARGA_WIDTH && section.width <= this.builder.UM_PARAMS.MAX_TSARGA_WIDTH) {
                    curSection.fillings.push({
                        PRODUCT_ID: 4586184,
                        ID: 4586184,
                        MATERIAL_ID: 15826,
                        WIDTH: section.width,
                        POSITION: curSection.position.x,
                        type: 'tsarga'
                    });
                }
            }

            section.fillings?.forEach((filling) => {
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
}
