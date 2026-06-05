//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { ErrorItem, ErrorsMessage, ErrorsType, LoopsmokAPI, LOOPSIDE } from "@/types/constructor2d/interfaсes.ts";
import * as THREE from "three";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import { UM_PARAMS } from "@/components/UMconstructor/utils/Const.ts";


type TSizze = {
    width: number,
    height: number
}

type T2DLoopParams = {
    vertical: TSizze,
    horizontal: TSizze
}

export default class LoopsManager {
    scope: UMconstructorClass
    private readonly loopConfig: T2DLoopParams = {
        vertical: {
            width: 38,
            height: 82
        },
        horizontal: {
            width: 73,
            height: 38
        },
        offsetX: 14,
        offsetY: 14,
    }

    constructor(scope: UMconstructorClass) {
        this.scope = scope

    }

    calcLoops(secIndex: number, grid: GridModule = this.scope.UM_STORE.getUMGrid()) {
        const { CONFIG, SECTIONS } = this.scope.UM_STORE.getUMData();

        if (!CONFIG.LOOPS)
            return

        const curSection = grid.sections[secIndex]
        // console.log(curSection, 'curSection')
        const FASADES = curSection.fasades || []

        if (grid.noLoops) {
            delete curSection.loops
            delete curSection.loopsSides
            FASADES.forEach((door, doorKey) => {
                door.forEach((fasade, key) => {
                    fasade.loopsSide = LOOPSIDE['none']
                })
            })
            return;
        }

        // Условие отрисовки петель если 1 секция одна дверь

        if (grid.sections.length === 1 && FASADES.length === 1) {
            FASADES[0].forEach((fasade) => {
                fasade.loopsSide = LOOPSIDE['left']
            })
            if (curSection.loopsSides) {
                curSection.loopsSides[0] = LOOPSIDE['left']
            }
        }

        curSection.loops = []

        FASADES.forEach((door, doorKey) => {
            const additional_fasades = []

            door.forEach((fasade, key) => {
                additional_fasades.push(fasade)
            })

            let loopsPos = this.calcLoopPositions(additional_fasades, curSection)

            if (loopsPos.length)
                curSection.loops.push(loopsPos)
        })

        if (!Object.keys(curSection.loops).length) {
            delete curSection.loops
            FASADES.forEach((door, doorKey) => {
                door.forEach((fasade, key) => {
                    fasade.loopsSide = LOOPSIDE['none']
                })
            })
        }
        else if (grid) {
            this.checkLoopsCollision(secIndex, grid)
        }
    }

    calcLoopPositions(fasades, section) {

        const { horizontal, vertical } = this.loopConfig

        let allLoops = []

        const defaultPos = 102
        const lowSizePos1 = 74
        const lowSizePos2 = 93

        const allSides = fasades.map(fasade => { return fasade.loopsSide })

        fasades.forEach((fasade, key) => {

            const { width, height } = fasade

            const fasadeHeight = height;
            const quarterPos = fasadeHeight / 4
            const oneThirdPos = fasadeHeight / 3
            const secondPos = fasadeHeight / 2

            const hasTop = LOOPSIDE[fasade.loopsSide]?.includes("top")
            const notTopID = allSides.find(el => el !== LOOPSIDE['top'])
            const notTopLoop = LOOPSIDE[notTopID]
            const defaultLoop = LOOPSIDE['left']

            const top = width >= 350 && fasadeHeight <= 450 && LOOPSIDE[fasade.loopsSide]?.includes("top")

            const left = LOOPSIDE[fasade.loopsSide]?.includes("left") || hasTop && !top && notTopLoop && notTopLoop?.includes("left")
            const right = LOOPSIDE[fasade.loopsSide]?.includes("right") || hasTop && !top && notTopLoop && notTopLoop?.includes("right")

            const isDefault = hasTop && !top && !notTopLoop

            if (left || right) {
                fasade.material.MECHANISM = null
            }

            if (hasTop && !top) {
                fasade.loopsSide = notTopID
                fasade.material.MECHANISM = null
            }
            if (isDefault) {
                fasade.loopsSide = defaultLoop
                fasade.material.MECHANISM = null

            }
            const fasadeLoops = {
                side: fasade.loopsSide,
                coords: [],
                errors: [],
                height: top ? horizontal.height : vertical.height,
                width: top ? horizontal.width : vertical.width,
                type: 'loop',
                positionX: (() => {
                    if (isDefault) {
                        return section.position.x - section.width / 2
                    }
                    if (left) {
                        return section.position.x - section.width / 2
                    }
                    if (right) {
                        return section.position.x + section.width / 2 - 38
                    }
                    if (top) {
                        return section.position.x - section.width / 2

                    }
                })(),
                positionX2: top ? section.position.x + fasade.width / 2 - (horizontal.width) : null,
                positionY: top ? fasade.position.y + height - horizontal.height * 0.5 - this.loopConfig.offsetY : fasade.position.y

            }

            const { positionY, positionX, positionX2 } = fasadeLoops

            //исключения по размерам

            if (!top) {
                if (fasadeHeight === 2036) {
                    //Отступ 658 от краев фасада
                    fasadeLoops.coords = []
                    fasadeLoops.coords.push(+(positionY + defaultPos).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + 658).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + fasadeHeight - 658).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + fasadeHeight - defaultPos).toFixed(1))
                } else if (fasadeHeight === 536) {
                    //Отступ 93 от краев фасада
                    fasadeLoops.coords = []
                    fasadeLoops.coords.push(+(positionY + lowSizePos2).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + fasadeHeight - lowSizePos2).toFixed(1))
                }//
                else if (fasadeHeight >= 2064) {
                    fasadeLoops.coords.push(+(positionY + defaultPos).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + quarterPos).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + quarterPos * 2).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + quarterPos * 3).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + fasadeHeight - defaultPos).toFixed(1))
                } else if (fasadeHeight < 2064 && fasadeHeight > 1500) {
                    fasadeLoops.coords.push(+(positionY + defaultPos).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + oneThirdPos).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + oneThirdPos * 2).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + fasadeHeight - defaultPos).toFixed(1))
                } else if (fasadeHeight <= 1500 && fasadeHeight > 1000) {
                    fasadeLoops.coords.push(+(positionY + defaultPos).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + secondPos).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + fasadeHeight - defaultPos).toFixed(1))
                } else if (fasadeHeight <= 1000 && fasadeHeight > 400) {
                    fasadeLoops.coords.push(+(positionY + defaultPos).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + fasadeHeight - defaultPos).toFixed(1))
                } else if (400 >= fasadeHeight && fasadeHeight >= 360) {
                    fasadeLoops.coords.push(+(positionY + lowSizePos1).toFixed(1))
                    fasadeLoops.coords.push(+(positionY + fasadeHeight - lowSizePos1).toFixed(1))
                }
            }
            else {
                fasadeLoops.coords = []
                fasadeLoops.coords.push([+positionY.toFixed(1), +positionX.toFixed(1)])
                fasadeLoops.coords.push([+positionY.toFixed(1), +positionX2.toFixed(1)])
            }

            if (fasade.loopsSide)

                // fasadeLoops.coords = fasadeLoops.coords.map((item) => parseInt(item))
                allLoops.push(fasadeLoops)
        })

        console.log(allLoops, 'allLoops')

        return allLoops
    }

    checkLoopsCollision(secIndex: number, grid: GridModule = this.scope.UM_STORE.getUMGrid()) {
        const CONFIG = this.scope.UM_STORE.getUMData()?.CONFIG;

        if (!CONFIG.LOOPS)
            return

        const currentSection = grid.sections[secIndex];
        const moduleThickness = grid.moduleThickness
        const loops = currentSection.loops

        if (!loops)
            return

        const errorItem = <ErrorItem>{
            type: ErrorsType['loops'],
            message: ErrorsMessage['loops'],
            sections: {}
        }

        let loopsSectors = {}
        Object.entries(loops).forEach(([doorKey, doorLoops]) => {
            loopsSectors[doorKey] = {}
            doorLoops.forEach((_loops, fasadeKey) => {
                loopsSectors[doorKey][fasadeKey] = []
                _loops.coords.forEach((coord, key) => {
                    loopsSectors[doorKey][fasadeKey].push({
                        id: key,
                        minY: coord - _loops.height / 2,
                        maxY: coord + _loops.height / 2,
                        minX: _loops.positionX,
                        maxX: _loops.positionX + _loops.width,
                    })
                })
            })
        })

        const checkLoop = (_loops, cell) => {
            let result = []
            _loops.forEach(loop => {
                if (
                    ((loop.minY < (cell.position.y - moduleThickness) && loop.maxY > (cell.position.y - moduleThickness)) ||
                        (loop.minY < cell.position.y && loop.maxY > cell.position.y))
                    &&
                    ((loop.minX <= (cell.position.x - cell.width / 2) && loop.maxX >= (cell.position.x - cell.width / 2)) ||
                        (loop.minX <= (cell.position.x + cell.width / 2) && loop.maxX >= (cell.position.x + cell.width / 2)))
                ) {
                    result.push(loop.id)
                }
                else if (cell.fillings?.length) {
                    cell.fillings.forEach((filling) => {
                        let filling_pos = new THREE.Vector2(filling.position.x, grid.height - filling.position.y - filling.height)
                        if (
                            (
                                (loop.minY < (filling_pos.y + filling.height) && loop.maxY > (filling_pos.y + filling.height)) ||
                                (loop.minY < filling_pos.y && loop.maxY > filling_pos.y) ||
                                (loop.minY > filling_pos.y && loop.maxY < (filling_pos.y + filling.height))
                            )
                            &&
                            ((loop.minX <= (filling_pos.x + filling.width) && loop.maxX >= (filling_pos.x + filling.width)) ||
                                (loop.minX <= (filling_pos.x) && loop.maxX >= (filling_pos.x)))
                        ) {
                            result.push(loop.id)
                        }
                    })
                }

            })

            return result;
        }

        if (currentSection.cells?.length) {
            Object.entries(loopsSectors).forEach(([doorKey, fasades]) => {
                Object.entries(fasades).forEach(([fasadeKey, _loops]) => {
                    loops[doorKey][fasadeKey].errors = []

                    currentSection.cells.forEach((cell, cellKey) => {

                        let check = checkLoop(_loops, cell)
                        check.forEach((id) => {
                            if (!loops[doorKey]?.[fasadeKey]?.errors.includes(id))
                                loops[doorKey][fasadeKey].errors.push(id)
                        })

                        cell.cellsRows?.forEach((cellRow) => {

                            if (cellRow.extras?.length) {
                                cellRow.extras.forEach((extraRow) => {
                                    let check = checkLoop(_loops, extraRow)
                                    check.forEach((id) => {
                                        if (!loops[doorKey]?.[fasadeKey]?.errors.includes(id))
                                            loops[doorKey][fasadeKey].errors.push(id)
                                    })
                                })
                            }

                        })

                    })

                    if (loops[doorKey][fasadeKey].errors.length) {
                        if (!errorItem.sections[secIndex])
                            errorItem.sections[secIndex] = []

                        errorItem.sections[secIndex].push(loops[doorKey][fasadeKey].errors)
                    }
                })
            })
        }
        else {
            Object.entries(loopsSectors).forEach(([doorKey, fasades]) => {
                Object.entries(fasades).forEach(([fasadeKey, _loops]) => {
                    loops[doorKey][fasadeKey].errors = []

                    let check = checkLoop(_loops, currentSection)
                    check.forEach((id) => {
                        if (!loops[doorKey]?.[fasadeKey]?.errors.includes(id))
                            loops[doorKey][fasadeKey].errors.push(id)
                    })

                    if (loops[doorKey][fasadeKey].errors.length) {
                        if (!errorItem.sections[secIndex])
                            errorItem.sections[secIndex] = []

                        errorItem.sections[secIndex].push(loops[doorKey][fasadeKey].errors)
                    }

                })
            })
        }

        if (Object.entries(errorItem.sections).length) {
            if (!grid.errors)
                grid.errors = {}

            if (!grid.errors[ErrorsType['loops']])
                grid.errors[ErrorsType['loops']] = <ErrorItem>{
                    type: ErrorsType['loops'],
                    message: ErrorsMessage['loops'],
                    sections: {}
                }

            grid.errors[ErrorsType['loops']].sections = Object.assign(grid.errors[ErrorsType['loops']].sections, errorItem.sections)
        }
        else if (grid.errors?.[ErrorsType['loops']]?.sections?.[secIndex]?.length) {
            delete grid.errors[ErrorsType['loops']].sections[secIndex]
        }

        if (grid.errors?.[ErrorsType['loops']] && !Object.entries(grid.errors[ErrorsType['loops']].sections).length)
            delete grid.errors?.[ErrorsType['loops']]

        return loops;
    }

    getLoopsideList(secIndex: number, doorIndex: number, grid: GridModule, segment: number) {


        const { row } = this.scope.UM_STORE.getSelected("fasades")

        // const rightLoopsList = [LOOPSIDE["right"], LOOPSIDE["right_on_partition"], 14981055] 
        // const leftLoopsList = [LOOPSIDE["left"], LOOPSIDE["left_on_partition"], 14981055]

        const rightLoopsList = [LOOPSIDE["right"], LOOPSIDE["right_on_partition"]] /** ДЛЯ МАСТЕРА  */
        const leftLoopsList = [LOOPSIDE["left"], LOOPSIDE["left_on_partition"]] /** ДЛЯ МАСТЕРА  */


        const currSection = grid.sections[secIndex];
        const sectionLeft = grid.sections[secIndex - 1] || false;
        const sectionRight = grid.sections[secIndex + 1] || false;
        const isDoors = currSection.fasades?.length > 1


        const productInfo = this.scope.APP.CATALOG.PRODUCTS[grid.productID];

        const loopsData = this.scope.APP.LOOPSIDE
        // const MokLoop = [...productInfo.LOOPSIDE, 14981055] /** ДЛЯ МАСТЕРА  */
        const MokLoop = [...productInfo.LOOPSIDE]

        const topPossibles = () => {

            return false /** ДЛЯ МАСТЕРА  */

            if (isDoors) return false;
            if (currSection.fasades.length === 0) return false;
            if (row !== currSection.fasades[0].length - 1) return false;
            if (currSection.fasades[0].length === 1) {
                if (currSection.fasades[0][0].height > 450) return false;
            }

            const canAddTopPosition = (section: Section | null, loopsList: string[]) => {
                if (!section) return true;
                if (section.fasades.length === 0) return true;

                const fasades = section.fasades[0] as any[];
                const { loopsSide } = fasades[fasades.length - 1];

                return section.fasades.length < 2 && !loopsList.includes(loopsSide);
            };

            return (
                !isDoors &&
                canAddTopPosition(sectionLeft, rightLoopsList) &&
                canAddTopPosition(sectionRight, leftLoopsList)
            );
        };

        const sidePossibles = (side, list) => {

            const canAddPosition = (section: Section | null, loopsList: string[]) => {
                if (!section) return true;
                if (section.fasades.length === 0) return true;
                const fasades = section.fasades[0] as any[];
                const { loopsSide } = fasades[fasades.length - 1];
                const loops = [...new Set(fasades.map(el => el.loopsSide))]
                const hasCommon = loopsList.some(item => loops.includes(item));


                // return section.fasades.length < 2 && !loopsList.includes(loopsSide);
                return section.fasades.length < 2 && !hasCommon;
            }

            return !isDoors && canAddPosition(side, list)
        }


        const topIsPossible = topPossibles()


        let list = [];
        let tmp = {};

        if (grid.isRestrictedModule) {
            tmp[LOOPSIDE["left"]] = loopsData[LOOPSIDE["left"]];
            tmp[LOOPSIDE["right"]] = loopsData[LOOPSIDE["right"]];
            // tmp[LOOPSIDE["top"]] = loopsData[LOOPSIDE["top"]];  /** ДЛЯ МАСТЕРА  */
        }
        else {
            // productInfo.LOOPSIDE.forEach((type) => {
            MokLoop.forEach((type) => {
                if (loopsData[type] != undefined) {
                    tmp[type] = loopsData[type];
                }
            });
        }

        const currSectionLoops = currSection.loopsSides ?? 13864508;


        /** ДЛЯ МАСТЕРА  */
        // if (topIsPossible) {



        //     const fasadeHeight = segment ? currSection.fasades[0][segment - 1]?.height : false

        //     if (typeof fasadeHeight === 'number' && fasadeHeight > 450 || segment != currSection.fasades[0]?.length) {
        //         delete tmp[LOOPSIDE["top"]];
        //     }

        //     if (sectionLeft) {

        //         const isLeftDoors = sectionLeft.fasades?.length > 1
        //         delete tmp[LOOPSIDE["left"]];
        //         if (!isLeftDoors) {
        //             tmp[LOOPSIDE["left_on_partition"]] = loopsData[LOOPSIDE["left_on_partition"]];
        //         } else {
        //             delete tmp[LOOPSIDE["top"]];
        //         }
        //     }

        //     if (sectionRight) {

        //         const isRightDoors = sectionRight.fasades?.length > 1
        //         delete tmp[LOOPSIDE["right"]];
        //         if (!isRightDoors) {
        //             tmp[LOOPSIDE["right_on_partition"]] = loopsData[LOOPSIDE["right_on_partition"]];

        //         } else {
        //             delete tmp[LOOPSIDE["top"]];
        //         }

        //     }

        // }

        // else if (isDoors) {
        //     // else {
        //     delete tmp[LOOPSIDE["top"]];
        //     switch (doorIndex) {
        //         case 0:
        //             if (grid.sections[secIndex].fasades[1]) {
        //                 delete tmp[LOOPSIDE["right"]];
        //             }

        //             if (sectionLeft) {


        //                 const sectionLeftLoops = sectionLeft.loopsSides || {};

        //                 if (!grid.isRestrictedModule) {
        //                     if (
        //                         sectionLeftLoops[1] ||
        //                         rightLoopsList.includes(
        //                             sectionLeftLoops[0]
        //                         )
        //                     ) {
        //                         delete tmp[LOOPSIDE["left_on_partition"]];
        //                     }
        //                     else {
        //                         tmp[LOOPSIDE["left_on_partition"]] =
        //                             loopsData[LOOPSIDE["left_on_partition"]];
        //                     }
        //                 }

        //                 delete tmp[LOOPSIDE["left"]];
        //             }

        //             if (sectionRight) {


        //                 const sectionRightLoops = sectionRight.loopsSides || {};

        //                 if (!grid.isRestrictedModule) {
        //                     if (
        //                         sectionRightLoops[1] ||
        //                         leftLoopsList.includes(
        //                             sectionRightLoops[0]
        //                         )
        //                     ) {
        //                         delete tmp[LOOPSIDE["right_on_partition"]];
        //                     } else {
        //                         tmp[LOOPSIDE["right_on_partition"]] =
        //                             loopsData[LOOPSIDE["right_on_partition"]];
        //                     }
        //                 }

        //                 delete tmp[LOOPSIDE["right"]];
        //             }

        //             break;
        //         case 1:
        //             if (sectionLeft) {


        //                 const sectionLeftLoops = sectionLeft.loopsSides || {};

        //                 if (!grid.isRestrictedModule) {
        //                     if (
        //                         sectionLeftLoops[1] ||
        //                         rightLoopsList.includes(
        //                             sectionLeftLoops[0]
        //                         )
        //                     ) {
        //                         delete tmp[LOOPSIDE["left_on_partition"]];
        //                     } else {
        //                         tmp[LOOPSIDE["left_on_partition"]] =
        //                             loopsData[LOOPSIDE["left_on_partition"]];
        //                     }
        //                 }

        //                 delete tmp[LOOPSIDE["left"]];
        //             }

        //             if (sectionRight) {


        //                 const sectionRightLoops = sectionRight.loopsSides || {};

        //                 if (!grid.isRestrictedModule) {
        //                     if (
        //                         sectionRightLoops[1] ||
        //                         leftLoopsList.includes(
        //                             sectionRightLoops[0]
        //                         )
        //                     ) {
        //                         delete tmp[LOOPSIDE["right_on_partition"]];
        //                     } else {
        //                         tmp[LOOPSIDE["right_on_partition"]] =
        //                             loopsData[LOOPSIDE["right_on_partition"]];
        //                     }
        //                 }

        //                 delete tmp[LOOPSIDE["right"]];
        //             }

        //             //delete tmp[LOOPSIDE["left"]]
        //             delete tmp[currSectionLoops[0]];

        //             break;
        //     }
        // }

        // else {
        //     delete tmp[LOOPSIDE["top"]];
        //     if (sectionLeft) {

        //         delete tmp[LOOPSIDE["left"]];
        //         const isLeftDoors = sectionLeft.fasades?.length > 1
        //         const leftPossible = sidePossibles(sectionLeft, rightLoopsList)
        //         if (leftPossible) {
        //             tmp[LOOPSIDE["left_on_partition"]] = loopsData[LOOPSIDE["left_on_partition"]];
        //         }
        //     }
        //     if (sectionRight) {

        //         delete tmp[LOOPSIDE["right"]];
        //         const isRightDoors = sectionRight.fasades?.length > 1
        //         const rightPossible = sidePossibles(sectionRight, leftLoopsList)
        //         if (rightPossible) {
        //             tmp[LOOPSIDE["right_on_partition"]] = loopsData[LOOPSIDE["right_on_partition"]];
        //         }
        //     }


        // }

        switch (doorIndex) {
            case 0:
                if (grid.sections[secIndex].fasades[1]) {
                    delete tmp[LOOPSIDE["right"]];
                }

                if (sectionLeft) {


                    const sectionLeftLoops = sectionLeft.loopsSides || {};

                    if (!grid.isRestrictedModule) {
                        if (
                            sectionLeftLoops[1] ||
                            rightLoopsList.includes(
                                sectionLeftLoops[0]
                            )
                        ) {
                            delete tmp[LOOPSIDE["left_on_partition"]];
                        }
                        else {
                            tmp[LOOPSIDE["left_on_partition"]] =
                                loopsData[LOOPSIDE["left_on_partition"]];
                        }
                    }

                    delete tmp[LOOPSIDE["left"]];
                }

                if (sectionRight) {


                    const sectionRightLoops = sectionRight.loopsSides || {};

                    if (!grid.isRestrictedModule) {
                        if (
                            sectionRightLoops[1] ||
                            leftLoopsList.includes(
                                sectionRightLoops[0]
                            )
                        ) {
                            delete tmp[LOOPSIDE["right_on_partition"]];
                        } else {
                            tmp[LOOPSIDE["right_on_partition"]] =
                                loopsData[LOOPSIDE["right_on_partition"]];
                        }
                    }

                    delete tmp[LOOPSIDE["right"]];
                }

                break;
            case 1:
                if (sectionLeft) {


                    const sectionLeftLoops = sectionLeft.loopsSides || {};

                    if (!grid.isRestrictedModule) {
                        if (
                            sectionLeftLoops[1] ||
                            rightLoopsList.includes(
                                sectionLeftLoops[0]
                            )
                        ) {
                            delete tmp[LOOPSIDE["left_on_partition"]];
                        } else {
                            tmp[LOOPSIDE["left_on_partition"]] =
                                loopsData[LOOPSIDE["left_on_partition"]];
                        }
                    }

                    delete tmp[LOOPSIDE["left"]];
                }

                if (sectionRight) {


                    const sectionRightLoops = sectionRight.loopsSides || {};

                    if (!grid.isRestrictedModule) {
                        if (
                            sectionRightLoops[1] ||
                            leftLoopsList.includes(
                                sectionRightLoops[0]
                            )
                        ) {
                            delete tmp[LOOPSIDE["right_on_partition"]];
                        } else {
                            tmp[LOOPSIDE["right_on_partition"]] =
                                loopsData[LOOPSIDE["right_on_partition"]];
                        }
                    }

                    delete tmp[LOOPSIDE["right"]];
                }

                //delete tmp[LOOPSIDE["left"]]
                delete tmp[currSectionLoops[0]];

                break;
        }

        if (grid.productID === UM_PARAMS.RASPASHNOY_ID) {
            delete tmp[LOOPSIDE["left_on_partition"]];
            delete tmp[LOOPSIDE["right_on_partition"]];
        }

        list = Object.values(tmp);

        return list;
    };
}