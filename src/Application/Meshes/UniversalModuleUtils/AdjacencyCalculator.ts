// @ts-nocheck

// Расчёт "соседства" элементов наполнения (ADDITIVES) для производственных
// отступов — кто слева/справа/сверху/снизу от кого. Оперирует только
// PROPS.CONFIG.SECTIONS (уже готовым деревом наполнения), про корпус/стенки
// не знает — поэтому продукто-агностичен и переиспользуем будущими типами
// товара (например гардеробной системой без стенок), не только BuildUniversalModule.
export class AdjacencyCalculator {
    private builder: any

    constructor(builder: any) {
        this.builder = builder
    }

    calcSubElementsAdditives(PROPS) {
        const fillingsZeroPosition = ['drawer', 'profile']

        const fasadeThickness = this.builder._FASADE[PROPS.CONFIG.MODULE_COLOR]?.DEPTH || 18

        Object.entries(PROPS.CONFIG.SECTIONS).forEach(([sectionNumber, sectionConf]) => {
            if (sectionConf.fillings)
                Object.entries(sectionConf.fillings).forEach(([elementNumber, element]) => {
                    element.ADDITIVES = {}
                })
        })

        Object.entries(PROPS.CONFIG.SECTIONS).forEach(([sectionNumber, sectionConf]) => {
            if (sectionConf.fillings) {
                const sectionSize = { width: sectionConf.size.x, height: sectionConf.size.y, depth: sectionConf.size.z }
                Object.entries(sectionConf.fillings).forEach(([_elementNumber, element]) => {
                    const product = this.builder.filters.filterProductInfo(element.product)
                    const elementNumber = +_elementNumber + 1
                    if (!product)
                        return

                    const PRODUCT_TYPE = this.builder._PRODUCTS_TYPES[product.productType]?.CODE || false;

                    if (element.position) {

                        let leftObj, rightObj, bottomObj, topObj;

                        let positionX = element.position.x - fasadeThickness
                        let positionY = element.position.y

                        let sectionPos = sectionConf.position.x;

                        let leftPos = sectionPos - sectionSize.width / 2 - fasadeThickness,
                            rightPos = sectionPos + sectionSize.width / 2 - fasadeThickness,
                            bottomPos = 0,
                            topPos = sectionSize.height

                        if (!["vertical_shelf", "section_partition"].includes(element.type)) {
                            positionX = element.position.x

                            Object.entries(PROPS.CONFIG.SECTIONS[sectionNumber].fillings)?.filter(([key, item]) => item.type === "vertical_shelf")
                                .sort(([key1, item1], [key2, item2]) => {
                                    return item1.POSITION - item2.POSITION
                                })
                                .forEach(([key, object]) => {
                                    if (elementNumber != object.id && (positionY < object.position.y + object.size.y && positionY > object.position.y)) {
                                        let objPos = object.position.x

                                        if ((objPos + object.size.x / 2 <= positionX) && (objPos + object.size.x / 2 >= leftPos)) {
                                            leftObj = object
                                            leftPos = objPos + object.size.x / 2
                                        }

                                        if ((objPos - object.size.x / 2 >= positionX) && (objPos - object.size.x / 2 <= rightPos)) {
                                            rightObj = object
                                            rightPos = objPos - object.size.x / 2
                                        }
                                    }
                                })

                            //element.type !== 'drawer'
                            let relative_posY = Math.floor(positionY + (!fillingsZeroPosition.includes(element.type) ? element.size.y / 2 : 0) - (element.fasade?.manufacturerOffset || 0))
                            element.basketRenderPosition = positionY

                            if (leftObj) {
                                let relative_pos = leftObj.size.y - ((leftObj.position.y + leftObj.size.y) - relative_posY)

                                leftObj.ADDITIVES[elementNumber || element.id || element.product] = {
                                    id_subelement: element.product,
                                    additive_position: relative_pos,
                                    orientation: "right",
                                    section: +sectionNumber,
                                }

                                element.ADDITIVES[leftObj.id || leftObj.product] = {
                                    id_subelement: leftObj.product,
                                    additive_position: relative_pos,
                                    orientation: "left",
                                    section: +sectionNumber,
                                }

                                delete element.ADDITIVES["left"]

                            }
                            else {
                                if (PROPS.CONFIG.SECTIONS[+sectionNumber - 1]?.fillings?.[0] && PROPS.CONFIG.SECTIONS[+sectionNumber - 1].fillings[0].type === "section_partition") {
                                    leftObj = PROPS.CONFIG.SECTIONS[+sectionNumber - 1].fillings[0]
                                    let relative_pos = leftObj.size.y - ((leftObj.position.y + leftObj.size.y) - relative_posY)

                                    element.ADDITIVES[`${+sectionNumber - 1}_${leftObj.id || leftObj.product}`] = {
                                        id_subelement: leftObj.product,
                                        additive_position: relative_pos,
                                        orientation: "left",
                                        section: +sectionNumber - 1,
                                    }
                                    delete element.ADDITIVES["left"]

                                    leftObj.ADDITIVES[`${+sectionNumber}_${elementNumber || element.id || element.product}`] = {
                                        id_subelement: element.product,
                                        additive_position: relative_pos,
                                        orientation: "right",
                                        section: +sectionNumber,
                                    }
                                } else
                                    element.ADDITIVES["left"] = {
                                        id_subelement: false,
                                        additive_position: relative_posY,
                                        orientation: "left"
                                    }
                            }

                            if (rightObj) {
                                let relative_pos = rightObj.size.y - ((rightObj.position.y + rightObj.size.y) - relative_posY)

                                let righAdditiveName = elementNumber || element.id || element.product;
                                rightObj.ADDITIVES[righAdditiveName] = {
                                    id_subelement: element.product,
                                    additive_position: relative_pos,
                                    orientation: "left",
                                    section: +sectionNumber,
                                }

                                element.ADDITIVES[rightObj.id || rightObj.product] = {
                                    id_subelement: rightObj.product,
                                    additive_position: relative_pos,
                                    orientation: "right",
                                    section: +sectionNumber,
                                }

                                delete element.ADDITIVES["right"]

                            }
                            else {
                                if (PROPS.CONFIG.SECTIONS[+sectionNumber + 1] && PROPS.CONFIG.SECTIONS[+sectionNumber].fillings[0].type === "section_partition") {
                                    rightObj = PROPS.CONFIG.SECTIONS[+sectionNumber].fillings[0]
                                    let relative_pos = rightObj.size.y - ((rightObj.position.y + rightObj.size.y) - relative_posY)

                                    element.ADDITIVES[`${sectionNumber}_${rightObj.id || rightObj.product}`] = {
                                        id_subelement: rightObj.product,
                                        additive_position: relative_pos,
                                        orientation: "right",
                                        section: +sectionNumber,
                                    }
                                    delete element.ADDITIVES["right"]

                                    rightObj.ADDITIVES[`${sectionNumber}_${elementNumber || element.id || element.product}`] = {
                                        id_subelement: element.product,
                                        additive_position: relative_pos,
                                        orientation: "left",
                                        section: +sectionNumber,
                                    }
                                } else
                                    element.ADDITIVES["right"] = {
                                        id_subelement: false,
                                        additive_position: relative_posY,
                                        orientation: "right"
                                    }
                            }

                            element.VALUE = relative_posY

                        }
                        else {

                            Object.entries(PROPS.CONFIG.SECTIONS[sectionNumber].fillings)?.filter(([key, item]) => item.type === "shelf")
                                .sort(([key1, item1], [key2, item2]) => {
                                    return item1.POSITION - item2.POSITION
                                })
                                .forEach(([key, object]) => {
                                    let objRelPos = object.position.x - fasadeThickness
                                    let objHeight = object.fasade?.size?.y || object.size.y
                                    if (elementNumber != object.id && (positionX < objRelPos + object.size.x / 2 && positionX > objRelPos - object.size.x / 2)) {
                                        let objPos = object.position.y - (object.fasade?.manufacturerOffset || 0)
                                        if (objPos + objHeight <= positionY && objPos + objHeight >= bottomPos) {
                                            bottomObj = object
                                            bottomPos = objPos + objHeight
                                        }

                                        if (objPos >= positionY && objPos <= topPos) {
                                            topObj = object
                                            topPos = objPos
                                        }
                                    }
                                })

                            let relative_posX = positionX - (sectionConf.position.x - sectionSize.width / 2) + fasadeThickness
                            if (bottomObj) {
                                let bottomObjPositionX = bottomObj.position.x - bottomObj.size.x / 2 - fasadeThickness
                                let relative_pos = relative_posX - (bottomObjPositionX - leftPos)

                                bottomObj.ADDITIVES[elementNumber || element.id || element.product] = {
                                    id_subelement: element.product,
                                    additive_position: relative_pos,
                                    orientation: "top",
                                    section: +sectionNumber,
                                }

                                element.ADDITIVES[bottomObj.id || bottomObj.product] = {
                                    id_subelement: bottomObj.product,
                                    additive_position: relative_pos,
                                    orientation: "bottom",
                                    section: +sectionNumber,
                                }

                                delete element.ADDITIVES["bottom"]

                            } else {
                                element.ADDITIVES["bottom"] = {
                                    id_subelement: false,
                                    additive_position: positionX,
                                    orientation: "bottom"
                                }
                            }

                            if (topObj) {
                                let topObjPositionX = topObj.position.x - topObj.size.x / 2 - fasadeThickness
                                let relative_pos = relative_posX - (topObjPositionX - leftPos)

                                topObj.ADDITIVES[elementNumber || element.id || element.product] = {
                                    id_subelement: element.product,
                                    additive_position: relative_pos,
                                    orientation: "bottom",
                                    section: +sectionNumber,
                                }

                                element.ADDITIVES[topObj.id || topObj.product] = {
                                    id_subelement: topObj.product,
                                    additive_position: relative_pos,
                                    orientation: "top",
                                    section: +sectionNumber,
                                }

                                delete element.ADDITIVES["top"]

                            } else {
                                element.ADDITIVES["top"] = {
                                    id_subelement: false,
                                    additive_position: positionX,
                                    orientation: "top"
                                }
                            }

                            element.VALUE = positionX
                        }

                    }
                })
            }
        })
    }
}
