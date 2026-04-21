//@ts-nocheck

import FasadesManager from "@/components/UMconstructor/ts/modules/FasadesManager.ts";
import * as THREE from "three";
import {
    FasadeObject,
    FillingObject,
    GridModule,
    LOOPSIDE
} from "@/components/UMconstructor/types/UMtypes.ts";
import {TFasadeProp} from "@/types/types.ts";

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";


export default class ExternalFasadesManager {
    FASADES_MANAGER: FasadesManager
    scope: UMconstructorClass
    constructor(FASADES_MANAGER: FasadesManager) {
        this.FASADES_MANAGER = FASADES_MANAGER;
        this.scope = this.FASADES_MANAGER.scope;
    }

    calcDrawersFasades(secIndex: number, fillingData: FillingObject = false, grid: GridModule = this.FASADES_MANAGER.scope.UM_STORE.getUMGrid()) {

        if (fillingData) {
            if(fillingData.fasade && grid.sections[secIndex].fasadesDrawers) {
                fillingData.fasade.position.y = grid.height - (fillingData.position.y + fillingData.height + fillingData.fasade.manufacturerOffset)

                let drawerInfoId = grid.sections[secIndex].fasadesDrawers.findIndex(item => (
                    item.sec === fillingData.fasade.sec &&
                    item.cell === fillingData.fasade.cell &&
                    item.row === fillingData.fasade.row &&
                    item.extra === fillingData.fasade.extra &&
                    item.item === fillingData.fasade.item
                ))

                grid.sections[secIndex].fasadesDrawers[drawerInfoId] = fillingData.fasade
            }
            else if (fillingData.isProfile && grid.sections[secIndex].hiTechProfiles){
                let profileInfoId = grid.sections[secIndex].hiTechProfiles?.findIndex(item => (
                    item.sec === fillingData.sec &&
                    item.cell === fillingData.cell &&
                    item.row === fillingData.row &&
                    item.extra === fillingData.extra &&
                    item.id === fillingData.id
                ))
                grid.sections[secIndex].hiTechProfiles[profileInfoId] = fillingData
            }
        }

        const leftWidth = grid.leftWallThickness || grid.moduleThickness;
        const rightWidth = grid.rightWallThickness || grid.moduleThickness;
        const currentSection = grid.sections[secIndex];
        const correctSectionFasadeWidth =
            grid.sections.length > 1 ?
                secIndex > 0 && secIndex < grid.sections.length - 1 ? currentSection.width + grid.moduleThickness - 4 :
                    currentSection.width + ((secIndex == 0 ? leftWidth : rightWidth) - 2) + (grid.moduleThickness / 2 - 2) :
                grid.width - 4;


        let baseFasade = grid.sections[secIndex]?.fasades?.[0]?.find(item => !item.manufacturerOffset)

        if(!baseFasade) {
            const PROPS = this.FASADES_MANAGER.scope.UM_STORE.getUMData();

            const FASADE_PROPS = PROPS.CONFIG.FASADE_PROPS[0];
            const FASADE = this.FASADES_MANAGER.getFasadePosition(FASADE_PROPS.POSITION);

            const width = currentSection.fasades[0]?.[0] ? Math.floor(currentSection.fasades[0][0].width / 2 - 2) :
                grid.sections.length === 1 ? grid.width - 4 :
                    (secIndex > 0 && secIndex < grid.sections.length - 1) ? currentSection.width + grid.moduleThickness - 4 :
                        currentSection.width + ((secIndex == 0 ? leftWidth : rightWidth) - 2) + (grid.moduleThickness / 2 - 2);

            let startX = secIndex > 0 ? currentSection.position.x - currentSection.width / 2 - grid.moduleThickness / 2 + 2 : FASADE.POSITION_X;

            let newDoorPosition = new THREE.Vector2(startX, grid.isRestrictedModule ? FASADE.POSITION_Y : grid.horizont + 2);
            baseFasade = <FasadeObject>{
                id: 1,
                width,
                height: grid.height - grid.horizont - 4,
                position: newDoorPosition,
                type: "fasade",
                material: <TFasadeProp>{
                    ...FASADE_PROPS,
                },
            };
            let fasadeMinMax = this.FASADES_MANAGER.getFasadePositionMinMax(baseFasade);
            baseFasade = Object.assign(baseFasade, fasadeMinMax);
            baseFasade.loopsSide = LOOPSIDE['none']
        }

        if(baseFasade.minY === undefined) {
            let fasadeMinMax = this.FASADES_MANAGER.getFasadePositionMinMax(baseFasade);
            baseFasade = Object.assign(baseFasade, fasadeMinMax);
        }

        let baseFasade2 = grid.sections[secIndex].fasades[1]?.find(item => !item.manufacturerOffset)
        if(baseFasade2 && baseFasade2.minY === undefined) {
            let fasadeMinMax = this.FASADES_MANAGER.getFasadePositionMinMax(baseFasade2);
            baseFasade2 = Object.assign(baseFasade2, fasadeMinMax);
        }


        let fasadesDrawers = grid.sections[secIndex].fasadesDrawers || []

        let baseDrawerFasade = fasadesDrawers[0]
        let fasadesList = this.calcDrawersFasadesPositons(secIndex, grid) || []

        grid.sections[secIndex].fasades[0] = []
        if (grid.sections[secIndex].fasades[1])
            grid.sections[secIndex].fasades[1] = []

        grid.sections[secIndex].fasadesDrawers = fasadesDrawers.sort((a, b) => a.position.y - b.position.y)

        let drawerIndex = 0
        fasadesList = fasadesList.filter((item) => {
            return item.type != "profile"
        })

        fasadesList.forEach((item, index) => {

            switch (item.type) {
                case "drawer":
                    let drawerFasade = fasadesDrawers[drawerIndex]
                    let filling = this.scope.FILLINGS.getFillingObject({
                        grid,
                        sec: drawerFasade.sec,
                        cell: drawerFasade.cell,
                        row: drawerFasade.row,
                        extra: drawerFasade.extra,
                        item: drawerFasade.item - 1,
                    });

                    drawerFasade.id = index + 1
                    drawerFasade.width = correctSectionFasadeWidth

                    if(filling)
                        filling.fasade = drawerFasade

                    drawerIndex += 1
                    break;
                case "fasade":
                    let fasadeClone = Object.assign(<FasadeObject>{}, baseFasade)
                    fasadeClone.id = index + 1
                    fasadeClone.height = item.height
                    fasadeClone.material = {...baseFasade.material}
                    fasadeClone.material.HANDLES = {...fasadeClone.material.HANDLES}

                    fasadeClone.position = new THREE.Vector2(baseFasade.position.x, item.y)

                    if (fasadeClone.height < fasadeClone.minY || fasadeClone.width < fasadeClone.minX)
                        fasadeClone.error = true
                    else
                        delete fasadeClone.error;

                    grid.sections[secIndex].fasades[0].push(fasadeClone)

                    if (baseFasade2) {
                        let fasadeClone2 = Object.assign(<FasadeObject>{}, fasadeClone)
                        fasadeClone2.position = new THREE.Vector2(baseFasade2.position.x, item.y)
                        fasadeClone2.material = {...fasadeClone.material}
                        fasadeClone2.material.HANDLES = {...fasadeClone2.material.HANDLES}
                        fasadeClone2.loopsSide = baseFasade2.loopsSide

                        grid.sections[secIndex].fasades[1].push(Object.assign(<FasadeObject>{}, fasadeClone2))
                    }
                    break
                default:
                    break;
            }
        })

        this.FASADES_MANAGER.scope.LOOPS.calcLoops(secIndex, grid)
    };

    calcDrawersFasadesPositons(secIndex: number, _grid: GridModule){
        const fasadeList = []
        const {CONFIG} = this.FASADES_MANAGER.scope.UM_STORE.getUMData()
        const grid = _grid || this.FASADES_MANAGER.scope.UM_STORE.getUMGrid()

        let moduleThickness = grid.moduleThickness || 18
        moduleThickness = !grid.horizont ? -2 : moduleThickness - 2

        //Ящики с фасадами
        const BOX_FASADE = grid.sections[secIndex].fasadesDrawers || []
        const HI_TECH_PROFILES = grid.sections[secIndex].hiTechProfiles || []

        const boxesArray = []
        BOX_FASADE.forEach((box, box_key) => {
            if (!box.position) {
                box.position = new THREE.Vector3()
            }
            boxesArray.push(box)
        })

        HI_TECH_PROFILES.forEach((_profile, box_key) => {
            let profile = Object.assign(<FillingObject>{}, _profile)
            if (!profile.position) {
                profile.position = new THREE.Vector3()
            }
            else {
                profile.position = {
                    x: profile.position.x,
                    y: grid.height - (profile.position.y + profile.height + profile.isProfile.manufacturerOffset)
                }
            }
            boxesArray.push(profile)
        })

        const sortedBoxesByIncrease = boxesArray.sort((a, b) => a.position.y - b.position.y)

        let fasadePosition = this.FASADES_MANAGER.getFasadePosition(this.FASADES_MANAGER.scope.APP.CATALOG.PRODUCTS[grid.productID].FASADE_POSITION[0])
        if (!fasadePosition)
            return

        const otstup = 4

        let fullFasadelSize = fasadePosition.FASADE_HEIGHT
        let bottomFasadePosition = grid.horizont + 2
        const firstFasadePosition = bottomFasadePosition

        if (!sortedBoxesByIncrease.length) {
            fasadeList.push({
                y: firstFasadePosition,
                height: fullFasadelSize,
                type: "fasade",
            })

            return fasadeList
        }

        const firstBox = sortedBoxesByIncrease[0] //нижний ящик
        if ((firstBox.position.y - (firstBox.isProfile ? 0 : otstup)) > bottomFasadePosition) {
            let firstFasadeSize = Math.abs(firstBox.position.y - (firstBox.isProfile ? 0 : otstup) - bottomFasadePosition)

            fasadeList.push({
                y: firstFasadePosition,
                height: firstFasadeSize,
                type: "fasade",
            })

            fullFasadelSize = fullFasadelSize - firstFasadeSize - (firstBox.isProfile ? 0 : otstup)
            bottomFasadePosition = bottomFasadePosition + firstFasadeSize + (firstBox.isProfile ? 0 : otstup)
        }

        for (let index = 0; index < sortedBoxesByIncrease.length; index++) {
            let box = sortedBoxesByIncrease[index]

            if (!box.position?.y) {
                box.position = new THREE.Vector3()
            }

            const boxFasadeHeight = box.isProfile && box.isProfile.offsetFasades ? box.isProfile.offsetFasades : box.height

            fasadeList.push({
                y: bottomFasadePosition,
                height: boxFasadeHeight,
                type: box.isProfile ? "profile" : "drawer",
            })

            const topBox = sortedBoxesByIncrease[index + 1]
            let upperFasadeSize = false

            fullFasadelSize = fullFasadelSize - boxFasadeHeight - (box.isProfile || topBox?.isProfile ? 0 : otstup)
            bottomFasadePosition = bottomFasadePosition + boxFasadeHeight + (box.isProfile || topBox?.isProfile ? 0 : otstup)

            //Условие для нижней планки
            if (topBox) {
                upperFasadeSize = Math.abs(topBox.position.y - bottomFasadePosition)

                if ((!box.isProfile && topBox.isProfile) && upperFasadeSize > 4) {
                    bottomFasadePosition += otstup
                    upperFasadeSize -= 4
                } else if ((!box.isProfile && !topBox.isProfile) && upperFasadeSize > 0) {
                    upperFasadeSize -= 4
                }
            } else {
                upperFasadeSize = Math.abs(this.FASADES_MANAGER.scope.UM_STORE.totalHeight - 2 - bottomFasadePosition)
            }

            if (upperFasadeSize > 200)
                fasadeList.push({
                    y: bottomFasadePosition,
                    height: upperFasadeSize,
                    type: "fasade",
                })

            //Если между ящиками расстояние <= 4мм, то туда фасад не нужен, НО если информациб об этом "фасаде" не положить - сломется
            //логика приложения. Поэтому, если у нас такой промежуток есть, то мы кладём его размер и позицию, но не смещаем её и не уменьшаем\
            //общий фасад, тогда фасады отобразятся корректно.
            if (upperFasadeSize > 0) {
                fullFasadelSize = fullFasadelSize - upperFasadeSize - (box.isProfile || topBox?.isProfile ? 0 : otstup)
                bottomFasadePosition = bottomFasadePosition + upperFasadeSize + (box.isProfile || topBox?.isProfile ? 0 : otstup)
            }
        }

        if (fullFasadelSize >= this.FASADES_MANAGER.scope.CONST.MIN_FASADE_HEIGHT)
            fasadeList.push({
                y: bottomFasadePosition,
                height: fullFasadelSize,
                type: "fasade",
            })

        return fasadeList
    }
}