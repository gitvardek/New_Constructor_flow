//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import ExternalFasadesManager from "@/components/UMconstructor/ts/modules/ExternalFasadesManager.ts";
import { FasadeObject, GridModule, LOOPSIDE, TSelectedCell } from "./../../types/UMtypes.ts";
import { TFasadeProp } from "@/types/types.ts";
import * as THREE from "three";
import { TFasadeTrueSizes, TTotalProps } from "@/types/types.ts";
import { useConversationActions } from "@/components/right-menu/actions/useConversationActions.ts";


export default class FasadesManager {
    scope: UMconstructorClass
    EXTERNAL_FASADES: ExternalFasadesManager
    FASADES_CONVERSATION: ReturnType<typeof useConversationActions> = useConversationActions();

    constructor(scope: UMconstructorClass) {
        this.scope = scope;
        this.EXTERNAL_FASADES = new ExternalFasadesManager(this);
    }

    createFacadeData(fasadeIndex?: number, _productId?: number) {
        const productId = _productId || this.scope.MODEL_STATE.getCurrentModel.userData.PROPS.PRODUCT;
        const { FACADE } = this.scope.MODEL_STATE._PRODUCTS[productId];
        this.scope.MODEL_STATE.createCurrentModelFasadesData({
            data: FACADE,
            fasadeNdx: fasadeIndex,
            productId,
        });
    };

    selectCell(sec: number | null = 0, cell: number | null = null, row: number | null = null) {
        this.scope.selectCell("fasades", <TSelectedCell>{ sec, cell, row });
    };

    getFasadePosition(
        _position: number,
        _grid: GridModule = this.scope.UM_STORE.getUMGrid(),
        productData: TTotalProps = this.scope.UM_STORE.getUMData(),
    ) {

        const PROPS = productData;
        const grid = _grid;
        let fasadePosition = this.scope.APP.FASADE_POSITION[_position];

        if (!fasadePosition)
            return {}

        fasadePosition = this.scope.BUILDER.getExec(
            this.scope.BUILDER.expressionsReplace(fasadePosition,
                Object.assign(PROPS.CONFIG.EXPRESSIONS,
                    {
                        "#X#": this.scope.UM_STORE.totalWidth,
                        "#Y#": this.scope.UM_STORE.totalHeight - (grid.isRestrictedModule ? 0 : grid.horizont),
                        "#Z#": this.scope.UM_STORE.totalDepth,
                    }))
        )

        return fasadePosition
    }

    getFasadePositionMinMax(fasade: FasadeObject) {
        const fasadeColor = this.scope.APP.FASADE[fasade.material.COLOR]
        const fasadePosition = this.getFasadePosition(fasade.material.POSITION)
        const { MIN_FASADE_HEIGHT, MAX_FASADE_WIDTH, MIN_FASADE_WIDTH, MIN_SLIDE_DOOR_WIDTH, MAX_SLIDE_DOOR_WIDTH } = this.scope.CONST
        const grid = this.scope.UM_STORE.getUMGrid()

        return {
            minY: MIN_FASADE_HEIGHT,
            maxY: fasadeColor.MAX_HEIGHT || fasadePosition.FASADE_HEIGHT,
            maxX: grid.isSlidingDoors ? MAX_SLIDE_DOOR_WIDTH : fasadeColor.MAX_WIDTH || MAX_FASADE_WIDTH,
            minX: grid.isSlidingDoors ? MIN_SLIDE_DOOR_WIDTH : MIN_FASADE_WIDTH,
        }
    }

    updateFasades(
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
        PROPS: TTotalProps = this.scope.UM_STORE.getUMData()
    ) {
        const { PRODUCT } = PROPS

        let productInfo = this.scope.APP.CATALOG.PRODUCTS[PRODUCT];
        let fasadePosition = this.getFasadePosition(productInfo.FASADE_POSITION[0]);

        const correctFasadeHeight = fasadePosition.FASADE_HEIGHT;
        const leftWidth = grid.leftWallThickness || grid.moduleThickness;
        const rightWidth = grid.rightWallThickness || grid.moduleThickness;

        if (!grid.isSlidingDoors)
            for (let secIndex = 0; secIndex < grid.sections.length; secIndex++) {
                const section = grid.sections[secIndex];

                let deltaWidth, deltaHeight
                if (section.fasades?.[0]) {
                    const countDoors = section.fasades.length;

                    const correctSectionFasadeWidth =
                        grid.sections.length > 1 ?
                            secIndex > 0 && secIndex < grid.sections.length - 1 ? section.width + grid.moduleThickness - 4 :
                                section.width + ((secIndex == 0 ? leftWidth : rightWidth) - 2) + (grid.moduleThickness / 2 - 2) :
                            grid.width - 4;

                    const correctSectionFasadeWidthDoor = Math.floor(correctSectionFasadeWidth / countDoors - ((countDoors - 1) * 2));

                    const sumDoorsWidth = Math.floor(section.fasades.reduce(
                        (accumulator, item, index) => accumulator + (item?.[0]?.width || 0) + (index > 0 ? 4 : 0),
                        0) / countDoors - ((countDoors - 1) * 2)) || correctSectionFasadeWidthDoor;
                    let sumDoorsHeight = section.fasades[0].reduce(
                        (accumulator, item, index) => accumulator + item.height + (index > 0 ? 4 : 0),
                        0);

                    if (section?.fasadesDrawers?.length > 0) {
                        let drawersFasadesHeight = section.fasadesDrawers.reduce(
                            (accumulator, item, index) => accumulator + item.height + 4,
                            0);
                        sumDoorsHeight += drawersFasadesHeight;
                    }

                    deltaWidth = correctSectionFasadeWidthDoor - sumDoorsWidth;
                    deltaHeight = correctFasadeHeight - sumDoorsHeight;

                    if (deltaWidth !== 0) {
                        section.fasades.forEach((door, doorIndex) => {
                            door.forEach((segment) => {

                                let fasadeMinMax = this.getFasadePositionMinMax(segment)
                                Object.entries(fasadeMinMax).forEach(([key, value]) => {
                                    segment[key] = value;
                                })

                                segment.width += deltaWidth;

                                if (secIndex !== 0) {
                                    segment.position.x = section.position.x - section.width / 2 - grid.moduleThickness / 2 + 2 + ((segment.width + 4) * doorIndex);
                                } else if (doorIndex > 0) {
                                    segment.position.x += deltaWidth;
                                }

                                const checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
                                    segment.material.COLOR,
                                    <TFasadeTrueSizes>{ FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height }
                                );

                                if (!checkConversation || segment.width < segment.minX || segment.height < segment.minY)
                                    segment.error = true
                                else
                                    delete segment.error;
                            })
                        })
                    }

                    if (deltaHeight !== 0) {
                        let needReset = false;
                        for (let doorIndex = 0; doorIndex < section.fasades.length; doorIndex++) {
                            let door = section.fasades[doorIndex];

                            door.forEach((segment) => {
                                let fasadeMinMax = this.getFasadePositionMinMax(segment)
                                Object.entries(fasadeMinMax).forEach(([key, value]) => {
                                    segment[key] = value;
                                })
                            })

                            let lastSegment = door[door.length - 1];
                            if (lastSegment && !lastSegment.manufacturerOffset) {

                                if (lastSegment.height + deltaHeight <= 0) {
                                    this.removeFasadeSegment(secIndex, doorIndex, door.length - 1, grid, false)
                                    needReset = true;
                                }
                                else {
                                    lastSegment.height += deltaHeight;

                                    const checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
                                        lastSegment.material.COLOR,
                                        <TFasadeTrueSizes>{ FASADE_WIDTH: lastSegment.width, FASADE_HEIGHT: lastSegment.height }
                                    );

                                    if (!checkConversation || lastSegment.height < lastSegment.minY || lastSegment.width < lastSegment.minX)
                                        lastSegment.error = true
                                    else
                                        delete lastSegment.error;
                                }
                            }
                        }

                        if (needReset) {
                            this.scope.reset(grid)
                            return false;
                        }
                    }

                }

                if ((deltaWidth !== 0 || deltaHeight !== 0) && (section.fasadesDrawers?.length || section.hiTechProfiles?.length)) {
                    this.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)
                }

                this.scope.LOOPS.calcLoops(secIndex, grid)
            }
        else {
            grid.fasades.forEach((door, doorIndex) => {
                let tmp_fasadePosition = this.calcSlideDoor(door[0].material.POSITION, doorIndex + 1)

                const sumDoorsHeight = door.reduce(
                    (accumulator, item) => accumulator + item.height,
                    0);
                const deltaHeight = tmp_fasadePosition.FASADE_HEIGHT - sumDoorsHeight;

                door[door.length - 1].height += deltaHeight;
                if (door[door.length - 1].height < door[door.length - 1].minY) {
                    door[0].height = tmp_fasadePosition.FASADE_HEIGHT
                    door = [door[0]]
                    return;
                } else
                    door.forEach((segment) => {
                        let fasadeMinMax = this.getFasadePositionMinMax(segment)
                        Object.entries(fasadeMinMax).forEach(([key, value]) => {
                            segment[key] = value;
                        })

                        segment.width = tmp_fasadePosition.FASADE_WIDTH
                        segment.position.x = tmp_fasadePosition.POSITION_X
                        segment.position.z = tmp_fasadePosition.POSITION_Z

                        const checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
                            segment.material.COLOR,
                            <TFasadeTrueSizes>{ FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height }
                        );

                        if (!checkConversation || segment.width < segment.minX || segment.height < segment.minY)
                            segment.error = true
                        else
                            delete segment.error;
                    })
            })
        }

        return grid
    };

    calcSlideDoor(
        fasadePositionID: number,
        doorNumber: number,
        callback = false,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
        PROPS: TTotalProps = this.scope.UM_STORE.getUMData()
    ) {

        const fasadeThickness = grid?.moduleThickness || 18

        const doorsCount = grid?.fasades?.length || 2
        const doorsPortalWidth = this.scope.UM_STORE.totalWidth - fasadeThickness * 2
        const horizont = grid?.horizont || 78

        let fasadePosition = Object.assign({}, this.scope.APP.FASADE_POSITION[fasadePositionID]);

        let fasade_width
        switch (doorsCount) {
            case 4:
                fasade_width = (doorsPortalWidth + 25 * 2) / 4
                break;
            default:
                fasade_width = (doorsPortalWidth + 25 * (doorsCount - 1)) / doorsCount
                break;
        }
        fasade_width = Math.ceil(fasade_width)

        fasadePosition = this.scope.BUILDER.getExec(
            this.scope.BUILDER.expressionsReplace(
                fasadePosition,
                Object.assign(PROPS.CONFIG.EXPRESSIONS,
                    {
                        "#X#": fasade_width,
                        "#Y#": this.scope.UM_STORE.totalHeight - horizont,
                        "#Z#": this.scope.UM_STORE.totalDepth,
                        "#FASADE_THICKNESS#": fasadeThickness || 0,
                    })
            )
        );

        //Вычитаем размеры направляющих в дверях-купе
        fasadePosition.FASADE_HEIGHT -= fasadeThickness * 2
        fasadePosition.DOORS_OVERFLOW = Math.abs(doorsPortalWidth - fasadePosition.FASADE_WIDTH * doorsCount) / (doorsCount - 1)

        fasadePosition.POSITION_Y = 11

        fasadePosition.POSITION_Y += horizont + fasadeThickness
        fasadePosition.POSITION_X += fasadeThickness

        if (doorNumber > 1) {
            switch (doorsCount) {
                case 4:
                    switch (doorNumber) {
                        case 4:
                            fasadePosition.POSITION_X -= 50
                            break;
                        default:
                            fasadePosition.POSITION_X -= 25
                            break;
                    }
                    break;
                default:
                    fasadePosition.POSITION_X -= 25 * (doorNumber - 1)
                    break;
            }
        }

        if (doorNumber && fasadePosition.FASADE_NUMBER != doorNumber) {
            fasadePosition.FASADE_NUMBER = doorNumber
        }

        if (doorNumber > 1) {
            fasadePosition.POSITION_X += fasadePosition.FASADE_WIDTH * (doorNumber - 1)
        }

        if (callback)
            callback(fasadePosition)
        else
            return fasadePosition
    }

    calcSumHeightDoorSegmentes(
        secIndex: number,
        doorNumber: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid()
    ) {
        const section = grid.sections[secIndex];
        let fasades = section.fasades ? section.fasades[doorNumber] : false;
        let sumHeight = 0

        if (!fasades)
            return sumHeight;

        sumHeight = fasades?.reduce(
            (accumulator, item, index) => accumulator + item.height,
            sumHeight);

        if (section.fasadesDrawers?.length)
            sumHeight = section.fasadesDrawers?.reduce(
                (accumulator, item, index) => accumulator + item.height,
                sumHeight);

        return sumHeight;
    }

    addSlideDoor(
        doorIndex: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        const fasades = grid.fasades;

        let newDoor;
        switch (doorIndex) {
            case 4:
                fasades[doorIndex - 2].forEach(
                    (item) => (item.material.POSITION = fasades[1][0].material.POSITION)
                );
                newDoor = fasades[0][0];
                break;
            default:
                if (doorIndex % 2 === 0) newDoor = fasades[1][0];
                else newDoor = fasades[0][0];
                break;
        }

        let newFasade = <FasadeObject>{
            ...newDoor,
            id: doorIndex,
            material: <TFasadeProp>{ ...newDoor.material, HANDLES: { ...newDoor.material.HANDLES } },
        };

        fasades.push([newFasade]);

        const callback = (fasadePosition) => {
            newFasade.width = fasadePosition.FASADE_WIDTH;
            newFasade.height = fasadePosition.FASADE_HEIGHT;
            newFasade.position = new THREE.Vector3(
                fasadePosition.POSITION_X,
                fasadePosition.POSITION_Y,
                fasadePosition.POSITION_Z
            );

            let checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
                newFasade.material.COLOR,
                <TFasadeTrueSizes>{ FASADE_WIDTH: newFasade.width, FASADE_HEIGHT: newFasade.height }
            );
            if (!checkConversation || newFasade.width < newFasade.minX || newFasade.height < newFasade.minY)
                newFasade.error = true;
            else delete newFasade.error;

            //Пересчитываем параметры старых дверей
            fasades.forEach((door, index) => {
                if (index + 1 !== doorIndex) {
                    this.calcSlideDoor(
                        door[0].material.POSITION,
                        index + 1,
                        (tmp_fasadePosition) => {
                            door.forEach((segment, segmentIndex) => {
                                segment.width = tmp_fasadePosition.FASADE_WIDTH;
                                segment.position.x = tmp_fasadePosition.POSITION_X;
                                segment.position.z = tmp_fasadePosition.POSITION_Z;

                                checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
                                    segment.material.COLOR,
                                    <TFasadeTrueSizes>{ FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height }
                                );
                                if (!checkConversation || segment.width < segment.minX || segment.height < segment.minY)
                                    segment.error = true;
                                else delete segment.error;
                            });
                        }
                    );
                }
            });

            // Обновляем рендер
            this.scope.reset();
        };

        this.calcSlideDoor(newDoor.material.POSITION, doorIndex, callback, grid);
    };

    deleteSlideDoor(
        doorIndex: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid()
    ) {
        const fasades = grid.fasades;

        if (doorIndex === 4)
            fasades[doorIndex - 2].forEach(
                (item) => (item.material.POSITION = fasades[0][0].material.POSITION)
            );

        fasades.pop();

        //Пересчитываем параметры старых дверей
        fasades.forEach((door, index) => {
            this.calcSlideDoor(
                door[0].material.POSITION,
                index + 1,
                (tmp_fasadePosition) => {
                    door.forEach((segment: FasadeObject, segmentIndex: number) => {
                        segment.width = tmp_fasadePosition.FASADE_WIDTH;
                        segment.position.x = tmp_fasadePosition.POSITION_X;
                        segment.position.z = tmp_fasadePosition.POSITION_Z;

                        let checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
                            segment.material.COLOR,
                            <TFasadeTrueSizes>{ FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height }
                        );

                        if (!checkConversation || segment.width < segment.minX || segment.height < segment.minY)
                            segment.error = true;
                        else delete segment.error;
                    });
                },
                grid
            );
        });

        this.selectCell(null, 0)
        this.scope.reset();
    };

    addDoor(
        secIndex: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid()
    ) {
        const section = grid.sections[secIndex];
        const leftWidth = grid.leftWallThickness || grid.moduleThickness;
        const rightWidth = grid.rightWallThickness || grid.moduleThickness;

        const width = section.fasades[0]?.[0] ? Math.floor(section.fasades[0][0].width / 2 - 2) :
            grid.sections.length === 1 ? grid.width - 4 :
                (secIndex > 0 && secIndex < grid.sections.length - 1) ? section.width + grid.moduleThickness - 4 :
                    section.width + ((secIndex == 0 ? leftWidth : rightWidth) - 2) + (grid.moduleThickness / 2 - 2);

        let firstFasade, newDoorPosition;
        if (section.fasades[0]?.length) {
            section.fasades[0].map((item) => {
                item.width = width;
            });

            firstFasade = section.fasades[0][0];
            newDoorPosition = new THREE.Vector2(
                firstFasade.position.x + width + 4,
                firstFasade.position.y
            );
        } else {
            const PROPS = this.scope.UM_STORE.getUMData();

            const FASADE_PROPS = PROPS.CONFIG.FASADE_PROPS[0];
            const FASADE = this.getFasadePosition(FASADE_PROPS.POSITION);

            let startX = secIndex > 0 ? section.position.x - section.width / 2 - grid.moduleThickness / 2 + 2 : FASADE.POSITION_X;

            newDoorPosition = new THREE.Vector2(startX, grid.isRestrictedModule ? FASADE.POSITION_Y : grid.horizont + 2);
            firstFasade = <FasadeObject>{
                id: 1,
                width,
                height: grid.height - grid.horizont - 4,
                position: newDoorPosition,
                type: "fasade",
                material: <TFasadeProp>{
                    ...FASADE_PROPS,
                    HANDLES: { ...FASADE_PROPS.HANDLES },
                },
            };
            let fasadeMinMax = this.getFasadePositionMinMax(firstFasade);
            firstFasade = Object.assign(firstFasade, fasadeMinMax);
        }

        let checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
            firstFasade.material.COLOR,
            <TFasadeTrueSizes>{ FASADE_WIDTH: firstFasade.width, FASADE_HEIGHT: firstFasade.height }
        );
        if (!checkConversation || width < firstFasade.minX)
            firstFasade.error = true;
        else delete firstFasade.error;

        // Создаем новую колонку с такими же параметрами
        const newDoor: FasadeObject = {
            ...firstFasade,
            position: newDoorPosition,
            material: { ...firstFasade.material, HANDLES: { ...firstFasade.material.HANDLES } },
        };

        let fasPos = this.getFasadePosition(newDoor.material.POSITION);
        newDoor.height = fasPos.FASADE_HEIGHT //grid.height - grid.horizont - 4; //TODO: костыль из-за прописанной в БД позиции фасада
        //newDoor.position.y = fasPos.POSITION_Y

        let loopsidesList = this.scope.LOOPS.getLoopsideList(secIndex, section.fasades.length, grid);
        let tmp_list = loopsidesList.filter(item => item.ID !== LOOPSIDE['none'] && item.ID !== LOOPSIDE['top'] )

        if (!grid.isRestrictedModule) {
            if (!tmp_list.length) {
                this.scope.callAlert("error", `Нельзя добавить дверь`)
                return;
            }
        }

        newDoor.loopsSide = tmp_list.pop().ID;

        if (!section.loopsSides)
            section.loopsSides = {}

        section.loopsSides[section.fasades.length] = newDoor.loopsSide;
        section.fasades.push([newDoor]);

        if (section.fasadesDrawers?.length || section.hiTechProfiles?.length) {
            this.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid)
        }

        if (!grid.isSlidingDoors) {
            this.scope.LOOPS.calcLoops(secIndex);
            if (!section.loops)
                newDoor.loopsSide = LOOPSIDE['none']
        }

        // Обновляем рендер
        this.scope.reset(grid)
    };

    splitFasade(
        secIndex: number,
        doorIndex: number = 0,
        segmentIndex: number = 0,
        grid: GridModule = this.scope.UM_STORE.getUMGrid()
    ) {

        console.log('PPPPP')

        this.selectCell(secIndex, doorIndex, segmentIndex)

        let fasades =
            secIndex === null
                ? grid.fasades
                : grid.sections[secIndex].fasades;
        let segment = fasades[doorIndex][segmentIndex];
        const halfHeight = Math.floor(
            (segment.height - (grid.isSlidingDoors ? 0 : 4)) / 2
        );
        // Обновляем высоту последней строки

        let checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
            segment.material.COLOR,
            <TFasadeTrueSizes>{ FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height }
        );
        if (!checkConversation || halfHeight < segment.minY || segment.width < segment.minX)
            segment.error = true;
        else delete segment.error;

        let delta =
            segment.height - halfHeight * 2 - (grid.isSlidingDoors ? 0 : 4);

        segment.height = halfHeight;

        // Добавляем новую строку в эту колонку
        let newFasade = <FasadeObject>{
            ...segment,
            position: grid.isSlidingDoors
                ? new THREE.Vector3(
                    segment.position.x,
                    segment.position.y + segment.height + delta,
                    segment.position.z
                )
                : new THREE.Vector2(
                    segment.position.x,
                    segment.position.y + 4 + segment.height + delta
                ),
            material: { ...segment.material, HANDLES: { ...segment.material.HANDLES } },
        };

        fasades[doorIndex].splice(segmentIndex + 1, 0, newFasade);
        segment.height += delta;

        for (let i = 0; i < fasades[doorIndex].length; i++) {
            if (i > segmentIndex) fasades[doorIndex][i].id += 1;
        }

        if (!grid.isSlidingDoors)
            this.scope.LOOPS.calcLoops(secIndex, grid);

        // Обновляем рендер
        this.scope.reset(grid);
    };

    deleteDoor(
        secIndex: number,
        doorIndex: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid()
    ) {
        const current = grid.sections[secIndex].fasades[doorIndex];
        let prev = grid.sections[secIndex].fasades[doorIndex - 1];
        let next = grid.sections[secIndex].fasades[doorIndex + 1];

        if (!next?.length) {
            next = false
        }
        if (!prev?.length) {
            prev = false
        }

        const combinedWidth = next
            ? current[0].width + next[0].width + 4
            : prev ? current[0].width + prev[0].width + 4 : 0;

        if (!combinedWidth) {
            grid.sections[secIndex].fasades = [];
            grid.sections[secIndex].loops = [];
            grid.sections[secIndex].loopsSides = {};
        }
        else {
            if (next) {
                current.forEach((segment, index) => {
                    segment.width = combinedWidth;

                    let checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
                        segment.material.COLOR,
                        <TFasadeTrueSizes>{ FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height }
                    );
                    if (!checkConversation || segment.width < segment.minX || segment.height < segment.minY)
                        segment.error = true;
                    else delete segment.error;
                });
            } else {
                prev.forEach((segment, index) => {
                    segment.width = combinedWidth;

                    let checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
                        segment.material.COLOR,
                        <TFasadeTrueSizes>{ FASADE_WIDTH: segment.width, FASADE_HEIGHT: segment.height }
                    );
                    if (!checkConversation || segment.width < segment.minX || segment.height < segment.minY)
                        segment.error = true;
                    else delete segment.error;
                });
            }

            if (next) {
                grid.sections[secIndex].fasades.splice(doorIndex + 1, 1);
                grid.sections[secIndex].loops.splice(doorIndex + 1, 1);
                delete grid.sections[secIndex].loopsSides[doorIndex + 1];
            } else {
                grid.sections[secIndex].fasades.splice(doorIndex, 1);
                grid.sections[secIndex].loops.splice(doorIndex, 1);
                delete grid.sections[secIndex].loopsSides[doorIndex];
            }
        }

        this.selectCell(0, 0)
        this.scope.reset(grid)
    };

    checkRemoveFasadeSegment(
        secIndex: number | null,
        doorIndex: number,
        segmentIndex: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        const fasades =
            secIndex === null ? grid.fasades : grid.sections[secIndex].fasades;
        const currentSection = fasades[doorIndex];
        const currentSegment = currentSection[segmentIndex];

        let next = currentSection[segmentIndex + 1];
        if (next) {
            let segmentsDistants = next.position.y - (currentSegment.position.y + currentSegment.height);
            if (segmentsDistants > 4)
                next = undefined;
        }

        let prev = currentSection[segmentIndex - 1];
        if (prev) {
            let segmentsDistants = currentSegment.position.y - (prev.position.y + prev.height);
            if (segmentsDistants > 4)
                prev = undefined;
        }

        return !!(next || prev);
    }

    removeFasadeSegment(
        secIndex: number,
        doorIndex: number,
        segmentIndex: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
        reset: boolean = true,
    ) {
        const fasades =
            secIndex === null ? grid.fasades : grid.sections[secIndex].fasades;
        const currentSection = fasades[doorIndex];
        const currentSegment = currentSection[segmentIndex];

        let next = currentSection[segmentIndex + 1];
        if (next) {
            let segmentsDistants = next.position.y - (currentSegment.position.y + currentSegment.height);
            if (segmentsDistants > 4)
                next = undefined;
        }

        let prev = currentSection[segmentIndex - 1];
        if (prev) {
            let segmentsDistants = currentSegment.position.y - (prev.position.y + prev.height);
            if (segmentsDistants > 4)
                prev = undefined;
        }

        const combinedHeight = next
            ? currentSegment.height +
            next.height +
            (grid.isSlidingDoors ? 0 : 4)
            : currentSegment.height +
            prev.height +
            (grid.isSlidingDoors ? 0 : 4);

        next ? (next.height = combinedHeight) : (prev.height = combinedHeight);

        let tmpSegment = next || prev;
        let checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
            tmpSegment.material.COLOR,
            <TFasadeTrueSizes>{ FASADE_WIDTH: tmpSegment.width, FASADE_HEIGHT: tmpSegment.height }
        );

        if (!checkConversation || tmpSegment.width < tmpSegment.minX || tmpSegment.height < tmpSegment.minY)
            tmpSegment.error = true;
        else delete tmpSegment.error;

        next
            ? (next.position.y = currentSegment.position.y)
            : (prev.position.y = prev.position.y);

        for (let i = 0; i < fasades[doorIndex].length; i++) {
            if (i > segmentIndex) fasades[doorIndex][i].id -= 1;
        }

        if (currentSection.length > 1) {
            currentSection.splice(segmentIndex, 1);
        }

        // Обновляем текущий сектор
        this.selectCell(secIndex, 0, 0)

        if (reset)
            this.scope.reset(grid)
    };

    updateFasadeHeight(
        value: number,
        secIndex: number,
        doorIndex: number,
        segmentIndex: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        this.scope.debounce("updateFasadeHeight", () => {
            const newValue = value;
            let adjustedValue;
            // Обновляем выбранную секцию для визуального отображения
            this.selectCell(secIndex, doorIndex, segmentIndex)

            if (!isNaN(newValue) && this.scope.RENDER_REF) {
                adjustedValue = this.scope.RENDER_REF.adjustSizeFromExternal({
                    dimension: "height",
                    value: newValue,
                    sec: secIndex,
                    cell: doorIndex,
                    row: segmentIndex,
                    type: "fasades",
                });
            }
            // Обновляем значение в module для синхронизации
            const clone = Object.assign({}, grid);
            if (adjustedValue) {
                let curCell = clone.sections[secIndex].fasades[doorIndex][segmentIndex];
                let prevCell =
                    clone.sections[secIndex].fasades[doorIndex][segmentIndex - 1];
                let nextCell =
                    clone.sections[secIndex].fasades[doorIndex][segmentIndex + 1];

                if (nextCell) {
                    let segmentsDistants = nextCell.position.y - (curCell.position.y + curCell.height);
                    if (segmentsDistants > 4)
                        nextCell = undefined;
                }

                if (prevCell) {
                    let segmentsDistants = curCell.position.y - (prevCell.position.y + prevCell.height);
                    if (segmentsDistants > 4)
                        prevCell = undefined;
                }

                let delta = curCell.height - adjustedValue;

                curCell.height = adjustedValue;

                let checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
                    curCell.material.COLOR,
                    <TFasadeTrueSizes>{ FASADE_WIDTH: curCell.width, FASADE_HEIGHT: curCell.height }
                );

                if (!checkConversation || curCell.width < curCell.minX || curCell.height < curCell.minY)
                    curCell.error = true;
                else delete curCell.error;

                if (prevCell) {
                    prevCell.height += delta;
                    curCell.position.y += delta;
                } else if (nextCell) {
                    nextCell.height += delta;
                    nextCell.position.y += -delta;
                }

                let tmpSegment = prevCell || nextCell || {};
                checkConversation = this.FASADES_CONVERSATION.checkFasadeConversations(
                    tmpSegment.material.COLOR,
                    <TFasadeTrueSizes>{ FASADE_WIDTH: tmpSegment.width, FASADE_HEIGHT: tmpSegment.height }
                );
                if (
                    !checkConversation ||
                    tmpSegment.width < tmpSegment.minX ||
                    tmpSegment.height < tmpSegment.minY
                )
                    tmpSegment.error = true;
                else delete tmpSegment.error;
            }
            grid = clone;
            this.scope.reset(grid);
        }, 1000)
    };

    changeLoopside(
        secIndex: number,
        fasade: FasadeObject,
        newSide: number | string,
        doorIndex: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {

        // console.log(secIndex, fasade, newSide, doorIndex, grid, 'QQWWWEERR')
        fasade.loopsSide = typeof newSide === "string" ? parseInt(newSide) : newSide;

        if (!grid.sections[secIndex].loopsSides) {
            grid.sections[secIndex].loopsSides = {}
        }

        // grid.sections[secIndex].loopsSides[doorIndex] = fasade.loopsSide;
        // grid.sections[secIndex].fasades[doorIndex].forEach(
        //     (item) => (item.loopsSide = fasade.loopsSide)
        // );

        if (grid.profilesConfig?.sideProfile)
        this.scope.PROFILES.changeProfileSide(LOOPSIDE[fasade.loopsSide]?.includes("left") ? "left" : "right", grid)

        this.scope.reset(grid);
    };

    checkAddDoor(
        secIndex: number,
        doorIndex: number,
        grid: GridModule = this.scope.UM_STORE.getUMGrid(),
    ) {
        if (grid.isRestrictedModule) {
            let moduleFasadesCount = 0;
            grid.sections.forEach(section => {
                moduleFasadesCount += section.fasades.length
            })

            return (grid.sections.length > 1 && grid.sections[secIndex].fasades.length < 1) || (grid.sections.length === 1 && grid.sections[secIndex].fasades.length < 2);
        }
        else {
            let loopsSidesList = this.scope.LOOPS.getLoopsideList(secIndex, doorIndex, grid);
            let tmp_list = loopsSidesList.filter(item => item.ID !== LOOPSIDE['none'])

            const currSection = grid.sections[secIndex];

            if (currSection.loopsSides?.[doorIndex])
                tmp_list = tmp_list.filter(
                    (item) => item.ID !== currSection.loopsSides[doorIndex]
                );

            return tmp_list.length > 0;
        }
    };



    /** ------------------ */
    // addDoor(
    //     secIndex: number,
    //     grid: GridModule = this.scope.UM_STORE.getUMGrid()
    // ) {
    //     const section = grid.sections[secIndex];

    //     // --- Вычисление ширины фасада ---
    //     const doorWidth = this.calcDoorWidth(secIndex, section, grid);

    //     // --- Получение или создание первого фасада ---
    //     let firstFasade: FasadeObject;
    //     let newDoorPosition: THREE.Vector2;

    //     if (section.fasades[0]?.length) {
    //         ({ firstFasade, newDoorPosition } = this.updateExistingFasades(section, doorWidth));
    //     } else {
    //         ({ firstFasade, newDoorPosition } = this.createFirstFasade(secIndex, doorWidth, grid));
    //     }

    //     // --- Валидация фасада ---
    //     this.validateFasade(firstFasade, doorWidth);

    //     // --- Создание нового объекта двери ---
    //     const newDoor = this.buildNewDoor(firstFasade, newDoorPosition, grid);

    //     // --- Определение стороны петель ---
    //     const loopSide = this.resolveLoopSide(secIndex, section, grid);
    //     if (loopSide === null) {
    //         this.scope.callAlert("error", "Нельзя добавить дверь");
    //         return;
    //     }

    //     // --- Добавление двери в секцию ---
    //     newDoor.loopsSide = loopSide;
    //     section.loopsSides ??= {};
    //     section.loopsSides[section.fasades.length] = loopSide;
    //     section.fasades.push([newDoor]);

    //     // --- Пересчёт смежных элементов ---
    //     if (section.fasadesDrawers?.length || section.hiTechProfiles?.length) {
    //         this.EXTERNAL_FASADES.calcDrawersFasades(secIndex, false, grid);
    //     }

    //     if (!grid.isSlidingDoors) {
    //         this.scope.LOOPS.calcLoops(secIndex);
    //         if (!section.loops) {
    //             newDoor.loopsSide = LOOPSIDE['none'];
    //         }
    //     }

    //     this.scope.reset(grid);
    // }

    // // --- Вспомогательные методы ---

    // private calcDoorWidth(
    //     secIndex: number,
    //     section: SectionObject,
    //     grid: GridModule
    // ): number {
    //     const leftWidth = grid.leftWallThickness || grid.moduleThickness;
    //     const rightWidth = grid.rightWallThickness || grid.moduleThickness;
    //     const existingFasade = section.fasades[0]?.[0];

    //     if (existingFasade) {
    //         return Math.floor(existingFasade.width / 2 - 2);
    //     }

    //     if (grid.sections.length === 1) {
    //         return grid.width - 4;
    //     }

    //     const isMiddleSection = secIndex > 0 && secIndex < grid.sections.length - 1;
    //     if (isMiddleSection) {
    //         return section.width + grid.moduleThickness - 4;
    //     }

    //     const wallWidth = secIndex === 0 ? leftWidth : rightWidth;
    //     return section.width + (wallWidth - 2) + (grid.moduleThickness / 2 - 2);
    // }

    // private updateExistingFasades(
    //     section: SectionObject,
    //     doorWidth: number
    // ): { firstFasade: FasadeObject; newDoorPosition: THREE.Vector2 } {
    //     section.fasades[0].forEach(item => { item.width = doorWidth; });

    //     const firstFasade = section.fasades[0][0];
    //     const newDoorPosition = new THREE.Vector2(
    //         firstFasade.position.x + doorWidth + 4,
    //         firstFasade.position.y
    //     );

    //     return { firstFasade, newDoorPosition };
    // }

    // private createFirstFasade(
    //     secIndex: number,
    //     doorWidth: number,
    //     grid: GridModule
    // ): { firstFasade: FasadeObject; newDoorPosition: THREE.Vector2 } {
    //     const PROPS = this.scope.UM_STORE.getUMData();
    //     const FASADE_PROPS = PROPS.CONFIG.FASADE_PROPS[0];
    //     const FASADE = this.getFasadePosition(FASADE_PROPS.POSITION);

    //     const startX = secIndex > 0
    //         ? grid.sections[secIndex].position.x - grid.sections[secIndex].width / 2 - grid.moduleThickness / 2 + 2
    //         : FASADE.POSITION_X;

    //     const positionY = grid.isRestrictedModule ? FASADE.POSITION_Y : grid.horizont + 2;
    //     const newDoorPosition = new THREE.Vector2(startX, positionY);

    //     const firstFasade = <FasadeObject>{
    //         id: 1,
    //         width: doorWidth,
    //         height: grid.height - grid.horizont - 4,
    //         position: newDoorPosition,
    //         type: "fasade",
    //         material: <TFasadeProp>{
    //             ...FASADE_PROPS,
    //             HANDLES: { ...FASADE_PROPS.HANDLES },
    //         },
    //     };

    //     return {
    //         firstFasade: Object.assign(firstFasade, this.getFasadePositionMinMax(firstFasade)),
    //         newDoorPosition,
    //     };
    // }

    // private validateFasade(fasade: FasadeObject, doorWidth: number): void {
    //     const isValid = this.FASADES_CONVERSATION.checkFasadeConversations(
    //         fasade.material.COLOR,
    //         <TFasadeTrueSizes>{ FASADE_WIDTH: fasade.width, FASADE_HEIGHT: fasade.height }
    //     );

    //     if (!isValid || doorWidth < fasade.minX) {
    //         fasade.error = true;
    //     } else {
    //         delete fasade.error;
    //     }
    // }

    // private buildNewDoor(
    //     firstFasade: FasadeObject,
    //     newDoorPosition: THREE.Vector2,
    //     grid: GridModule
    // ): FasadeObject {
    //     const newDoor: FasadeObject = {
    //         ...firstFasade,
    //         position: newDoorPosition,
    //         material: { ...firstFasade.material, HANDLES: { ...firstFasade.material.HANDLES } },
    //     };

    //     // Высота берётся из позиции фасада в БД, а не из grid
    //     const fasadePosition = this.getFasadePosition(newDoor.material.POSITION);
    //     newDoor.height = fasadePosition.FASADE_HEIGHT;

    //     return newDoor;
    // }

    // /** Возвращает сторону петель или null, если добавить дверь невозможно */
    // private resolveLoopSide(
    //     secIndex: number,
    //     section: SectionObject,
    //     grid: GridModule
    // ): LOOPSIDE | null {
    //     const allLoopSides = this.scope.LOOPS.getLoopsideList(secIndex, section.fasades.length, grid);
    //     const validLoopSides = allLoopSides.filter(item => item.ID !== LOOPSIDE['none']);

    //     if (!grid.isRestrictedModule && !validLoopSides.length) {
    //         return null;
    //     }

    //     return validLoopSides.pop()?.ID ?? LOOPSIDE['none'];
    // }
}