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

// Группа сегментов одного разделения: идентификатор, сколько сегментов в ней было
// до пересборки списка фасадов, границы области, которую она занимала, и настройки
// каждого сегмента снизу вверх
type SplitGroup = {
    id: number,
    count: number,
    from: number,
    to: number,
    segments: { material: TFasadeProp, loopsSide: number | boolean }[],
} | null

// Насколько фасад перекрывается с областью, где разделение было до пересборки.
// По этому признаку разделение возвращается на свою область, а не на самую высокую:
// между ящиками таких областей может быть несколько
const splitOverlap = (fasade: FasadeObject, split: SplitGroup) => {
    const top = Math.min(fasade.position.y + fasade.height, split.to)
    const bottom = Math.max(fasade.position.y, split.from)

    return Math.max(top - bottom, 0)
}

// Сегменты одного разделения идут вплотную, между ними только технологический зазор.
// Если расстояние больше, значит между ними встало что-то ещё — ящик или профиль,
// и разделением эти фасады уже не являются. Допуск 1 мм на округления раскладки
const isSplitContiguous = (group: FasadeObject[], gap: number) => {
    const sorted = group.slice().sort((a, b) => a.position.y - b.position.y)

    return sorted.every((fasade, index) => {
        if (!index) return true

        const prev = sorted[index - 1]
        return fasade.position.y - (prev.position.y + prev.height) <= gap + 1
    })
}


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

            let FASADE_PROPS = PROPS.CONFIG.FASADE_PROPS[0];
            if (!FASADE_PROPS) {
                this.scope.BUILDER.filters.filterFasadePosition(PROPS.CONFIG, this.scope.APP.CATALOG.PRODUCTS[PROPS.PRODUCT]);
                FASADE_PROPS = PROPS.CONFIG.FASADE_PROPS[0];
            }

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

        // Ручное разделение помечено идентификатором splitGroup (см. FasadesManager.splitFasade).
        // Полная пересборка ниже теряет сегменты, поэтому запоминаем группы и восстанавливаем
        // после. Считаем только помеченные: фасады, порождённые промежутками между ящиками,
        // идентификатора не имеют и за разделение больше не принимаются
        const prevSegments = (grid.sections[secIndex].fasades ?? []).map(door => {
            if (!door?.length) return null

            // Пересборка создаёт фасады клонированием baseFasade, поэтому материал, ручки
            // и сторону открывания каждого сегмента запоминаем отдельно — снизу вверх,
            // в этом же порядке они и вернутся
            const describe = (group: FasadeObject[]) => {
                const sorted = group.slice().sort((a, b) => a.position.y - b.position.y)
                const last = sorted[sorted.length - 1]

                return {
                    count: sorted.length,
                    from: sorted[0].position.y,
                    to: last.position.y + last.height,
                    segments: sorted.map(fasade => ({
                        material: fasade.material,
                        loopsSide: fasade.loopsSide,
                    })),
                }
            }

            const marked = door.filter(fasade => fasade?.splitGroup)
            if (marked.length) {
                const id = marked[0].splitGroup
                const group = marked.filter(fasade => fasade.splitGroup === id)
                if (group.length > 1) return { id, ...describe(group) }
            }

            // Проекты, сохранённые до появления splitGroup. Без внешних ящиков промежуточных
            // фасадов взяться неоткуда, поэтому несколько сегментов — это точно разделение
            if (marked.length === 0 && door.length > 1 && !fasadesDrawers.length) {
                const id = Date.now()
                door.forEach(fasade => { fasade.splitGroup = id })
                return { id, ...describe(door) }
            }

            return null
        })

        this.liftStackAboveBottom(secIndex, grid)

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
                    drawerFasade.position.x = baseFasade.position.x

                    if(filling)
                        filling.fasade = drawerFasade

                    drawerIndex += 1
                    break;
                case "fasade":
                    let fasadeClone = Object.assign(<FasadeObject>{}, baseFasade)

                    // Признак разделения принадлежит конкретным сегментам, а не форме
                    // фасада, поэтому клоном не наследуется — иначе метку получают и
                    // фасады промежутков между ящиками. Разделение вернёт
                    // restoreFasadeSegments, на ту же область, где оно было
                    delete fasadeClone.splitGroup

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

        this.restoreFasadeSegments(grid.sections[secIndex].fasades, prevSegments, grid)

        this.FASADES_MANAGER.scope.LOOPS.calcLoops(secIndex, grid)
    };

    // Ниже этой суммарной высоты разделение фасада не имеет смысла: сегмент 780
    // плюс технологический зазор 4. Разделение при этом не создаётся и снимается,
    // если область стала меньше
    static readonly MIN_SPLIT_HEIGHT = 784

    // Возвращает ручное разделение фасада, потерянное при пересборке списка:
    // делит самый высокий сегмент пополам, пока их число не совпадёт с прежним.
    // Деление прекращается, если половина окажется ниже минимально допустимой высоты
    restoreFasadeSegments(fasades: FasadeObject[][], prevSegments: SplitGroup[], grid: GridModule) {
        if (!fasades?.length) return

        const gap = grid.isSlidingDoors ? 0 : 4

        const minSplitHeight = ExternalFasadesManager.MIN_SPLIT_HEIGHT

        fasades.forEach((door, doorIndex) => {
            const split = prevSegments[doorIndex]
            if (!door?.length || !split) return

            // Пересборка сохранила часть сегментов группы — восстанавливаем остальные.
            // Считаем каждый раз заново: сегменты группы могли не сохраниться совсем
            const groupSegments = () => door.filter(fasade => fasade.splitGroup === split.id)

            // Сегменты разъехались — между ними появился ящик. Разделения больше нет:
            // снимаем признак, каждый фасад дальше живёт сам по себе и получает петли.
            // Высоты и позиции при этом не трогаем, фасады остаются на своих местах
            const separated = groupSegments()
            if (separated.length > 1 && !isSplitContiguous(separated, gap)) {
                separated.forEach(fasade => delete fasade.splitGroup)
                door.forEach((fasade, i) => { fasade.id = i + 1 })
                return
            }

            while (groupSegments().length < split.count) {
                const group = groupSegments()

                // Пока сегменты группы есть — делим самый высокий из них. Если пересборка
                // не сохранила ни одного, ищем область, на которой разделение было раньше:
                // у неё наибольшее пересечение с прежними границами группы
                let segment = group.length ? group[0] : door[0]

                if (group.length)
                    group.forEach(fasade => { if (fasade.height > segment.height) segment = fasade })
                else
                    door.forEach(fasade => {
                        if (splitOverlap(fasade, split) > splitOverlap(segment, split)) segment = fasade
                    })

                const index = door.indexOf(segment)
                const half = Math.floor((segment.height - gap) / 2)

                // Делим, только если разделение поместится по суммарной высоте
                if (segment.height < minSplitHeight) break
                if (half < (segment.minY ?? 0)) break

                segment.splitGroup = split.id

                const delta = segment.height - half * 2 - gap
                segment.height = half + delta

                const nextY = segment.position.y + gap + segment.height

                const clone = <FasadeObject>{
                    ...segment,
                    height: half,
                    position: grid.isSlidingDoors
                        ? new THREE.Vector3(segment.position.x, nextY, segment.position.z)
                        : new THREE.Vector2(segment.position.x, nextY),
                    material: { ...segment.material, HANDLES: { ...segment.material.HANDLES } },
                }

                door.splice(index + 1, 0, clone)
            }

            // Возвращаем сегментам их материал, ручки и сторону открывания. Петли при этом
            // не назначаются вручную: calcLoops вызывается сразу после и сам отбросит
            // сегмент, у которого материал сняли или поставили «без фасада»
            groupSegments()
                .sort((a, b) => a.position.y - b.position.y)
                .forEach((fasade, index) => {
                    const saved = split.segments?.[index]
                    if (!saved) return

                    fasade.material = saved.material
                    fasade.loopsSide = saved.loopsSide
                })

            // Условия не сошлись: сегментов меньше пары или суммарная высота ниже
            // допустимой — идентификатор снимается, дальше фасад ведёт себя как обычный.
            // Обратно он не вернётся: в следующий раз группы в двери уже не будет
            const group = groupSegments()
            const totalHeight = group.reduce((sum, fasade) => sum + fasade.height, 0)
                + gap * (group.length - 1)

            if (group.length < 2 || totalHeight < minSplitHeight) {
                const first = group[0]

                if (first) {
                    first.height = totalHeight
                    group.slice(1).forEach(fasade => door.splice(door.indexOf(fasade), 1))
                }

                group.forEach(fasade => delete fasade.splitGroup)
            }

            door.forEach((fasade, i) => { fasade.id = i + 1 })
        })
    };

    // Фасад ящика свисает на manufacturerOffset ниже дна тела. Со снятым цоколем
    // (опция «Без дна») тело опускается почти к полу модуля, и фасад уходит за габарит:
    // при moduleThickness 16 и offset 28 его низ оказывается на -14. Поднимаем стопку
    // целиком — тела ящиков, их фасады и профили — чтобы нижний фасад встал на
    // BOTTOM_FASADE_OFFSET. Зазоры внутри стопки и размеры деталей при этом не меняются.
    // С цоколем сдвиг выходит отрицательным и метод ничего не делает
    liftStackAboveBottom(secIndex: number, grid: GridModule) {
        const BOTTOM_FASADE_OFFSET = 2

        const section = grid.sections?.[secIndex]
        const drawerFasades = section?.fasadesDrawers ?? []
        if (!drawerFasades.length) return

        const lowest = Math.min(...drawerFasades.map(fasade => fasade.position?.y ?? 0))
        const shift = BOTTOM_FASADE_OFFSET - lowest
        if (shift <= 0) return

        // После saveUMGrid fillings[].fasade, hiTechProfiles и fasadesDrawers могут быть
        // как одним объектом, так и разными копиями — двигаем каждый объект ровно один раз
        const moved = new Set()
        const moveBody = (body) => {
            if (!body?.position || moved.has(body)) return
            moved.add(body)

            // Тела живут в системе сверху вниз, поэтому подъём — это вычитание
            body.position.y -= shift
            if (body.distances) {
                body.distances.top -= shift
                body.distances.bottom += shift
            }
        }

        section.fillings?.forEach(filling => {
            if (!filling?.fasade && !filling?.isProfile) return
            moveBody(filling)
        })
        section.hiTechProfiles?.forEach(moveBody)

        // Позицию фасада пересчитываем от тела — единственного источника истины
        const placeFasade = (fasade, body) => {
            if (!fasade?.position || !body?.position) return
            fasade.position.y = grid.height - (body.position.y + body.height + fasade.manufacturerOffset)
        }

        section.fillings?.forEach(filling => placeFasade(filling.fasade, filling))
        drawerFasades.forEach(fasade => {
            const body = section.fillings?.find(filling => filling.id === fasade.item)
            placeFasade(fasade, body)
        })
    };

    calcDrawersFasadesPositons(secIndex: number, _grid: GridModule){
        const fasadeList = []
        const {CONFIG} = this.FASADES_MANAGER.scope.UM_STORE.getUMData()
        const grid = _grid || this.FASADES_MANAGER.scope.UM_STORE.getUMGrid()

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
                y: Math.floor(firstFasadePosition),
                height: Math.floor(fullFasadelSize),
                type: "fasade",
            })

            return fasadeList
        }

        const firstBox = sortedBoxesByIncrease[0] //нижний ящик
        if ((firstBox.position.y - (firstBox.isProfile ? 0 : otstup)) > bottomFasadePosition) {
            let firstFasadeSize = Math.abs(firstBox.position.y - (firstBox.isProfile ? 0 : otstup) - bottomFasadePosition)

            // Порог тот же, что у верхнего промежутка ниже по коду: из зазора в пару
            // миллиметров фасад не делаем. Без этого при подъёме ящика к разделённому
            // фасаду снизу появлялся сегмент высотой 1 мм — невидимый, но занимавший
            // место в двери: разделение выглядело пропавшим и возвращалось после
            // ручного удаления сегмента
            if (firstFasadeSize > 200) {
                fasadeList.push({
                    y: firstFasadePosition,
                    height: Math.floor(firstFasadeSize),
                    type: "fasade",
                })
            }

            fullFasadelSize = fullFasadelSize - firstFasadeSize - (firstBox.isProfile ? 0 : otstup)
            bottomFasadePosition = bottomFasadePosition + firstFasadeSize + (firstBox.isProfile ? 0 : otstup)
        }

        for (let index = 0; index < sortedBoxesByIncrease.length; index++) {
            let box = sortedBoxesByIncrease[index]

            if (!box.position?.y) {
                box.position = new THREE.Vector3()
            }

            // Г-образный профиль крепится к корпусу и высоту фасада не занимает.
            // Без этого в расчёт уходил box.height (= moduleThickness), т.к. имя профиля
            // парсится в кириллическую "г" и не совпадает с латинскими "c"/"l",
            // из-за чего offsetFasades остаётся нулевым
            const boxFasadeHeight = box.isProfile?.isBottomHiTechProfile
                ? 0
                : box.isProfile && box.isProfile.offsetFasades ? box.isProfile.offsetFasades : box.height

            fasadeList.push({
                y: Math.floor(bottomFasadePosition),
                height: Math.floor(boxFasadeHeight),
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
                    y: Math.floor(bottomFasadePosition),
                    height: Math.floor(upperFasadeSize),
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
                y: Math.floor(bottomFasadePosition),
                height: Math.floor(fullFasadelSize),
                type: "fasade",
            })

        return fasadeList
    }
}