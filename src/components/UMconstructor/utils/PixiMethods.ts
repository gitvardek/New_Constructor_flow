// @ts-nocheck 31
import {UM_PARAMS} from "./Const.ts";
import {Container, Graphics, GraphicsPath, Text, TextStyle} from "pixi.js";
import * as THREE from "three";
import {MANUFACTURER} from "@/types/constructor2d/interfaсes.ts";
import {TSelectedCell} from "@/components/UMconstructor/types/UMtypes.ts";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import {useUMStorage} from "@/store/appStore/UniversalModule/useUMStorage.ts";

type TDashedLine = {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    dashLength?: number;
    gapLength?: number;
    graphics: any;
};

type TBounds = {
    x: number,
    y: number,
    width: number,
    height: number
}

type THoleData = {
    type: string,
    width: number,
    height: number,
    radius: number,
    x: number, // центр по X (относительно центра секции)
    y: number, // центр по Y (относительно центра секции)
    lable: string,
    Mwidth: number,
    Mheight: number,
    Mradius: number,
    distances: {
        left: number,
        right: number,
        top: number,
        bottom: number,
    };
}

const {
    MIN_SECTION_WIDTH,
    MIN_SECTION_HEIGHT,
    MAX_SECTION_WIDTH,
    CONST_MAX_AREA_HEIGHT,
    CONST_MAX_AREA_WIDTH
} = UM_PARAMS;

type TExtremum = { maxX: number, maxY: number, minX: number, minY: number }


class Helpers {

    maxAreaHeight: number
    step: number = 1

    constructor() {
        this.maxAreaHeight = UM_PARAMS.TOTAL_HEIGHT * CONST_MAX_AREA_HEIGHT / UM_PARAMS.TOTAL_LENGTH
    }

    setStep(value: number) {
        this.step = value
    }

    getPixelWidth(mmWidth: number) {
        return (mmWidth / UM_PARAMS.TOTAL_LENGTH) * CONST_MAX_AREA_WIDTH;
    };

    getPixelHeight(mmHeight: number) {
        // return Math.floor((mmHeight / TOTAL_HEIGHT) * getMaxAreaHeight.value);
        return (mmHeight / UM_PARAMS.TOTAL_HEIGHT) * this.maxAreaHeight;
    };

    getMmWidth(pxWidth: number) {
        return (pxWidth / CONST_MAX_AREA_WIDTH) * UM_PARAMS.TOTAL_LENGTH;
    };

    getMmHeight(pxHeight: number) {
        return (pxHeight / this.maxAreaHeight) * UM_PARAMS.TOTAL_HEIGHT;
    };

    convertToTen(value) {

        if (value < 0) return 0

        return Math.round(value / this.step) * this.step;

    }

    getSectorBounds(sector: Container) {

        //let tmpChildren = [...sector.children];
        //sector.children = sector.children.filter(item => !item.dimensions);
        const bounds = sector.getBounds()
        //sector.children = tmpChildren;
        return {
            x: sector.x,
            y: sector.y,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY

        }
    }

    getTotalBounds(sector: Container, row) {

        const shapes = sector.shapes;

        if (shapes.length === 0) {
            return {maxX: 0, maxY: 0, minX: 0, minY: 0}; // или другое значение по умолчанию
        }


        let maxX = -0;
        let maxY = -0;
        let minX = 0;
        let minY = 0;

        for (const shape of shapes) {
            if (!shape.data.isVerticalItem) {
                const bounds = shape.graphic.getBounds();
                maxX = Math.max(maxX, bounds.maxX);
                maxY = Math.max(maxY, bounds.maxY);
                minX = Math.min(minX, bounds.minX);
                minY = Math.min(minY, bounds.minY);
            }
        }

        return {maxX, maxY, minX, minY};
    }

    getRightSectionWidth(sector, minX) {

        if (minX < MIN_SECTION_WIDTH)
            return MIN_SECTION_WIDTH

        const sBounds = sector.getBounds()
        const sMax = this.convertToTen(this.getMmWidth(sBounds.maxX))
        return sMax - minX + UM_PARAMS.SECTOR_PADDING

    }

    getLeftSectionWidth(sector, maxX) {

        if (maxX < MIN_SECTION_WIDTH)
            return MIN_SECTION_WIDTH

        const sBounds = sector.getBounds()
        const sMin = this.convertToTen(this.getMmWidth(sBounds.minX))
        return maxX - sMin + UM_PARAMS.SECTOR_PADDING
    }

    getSectionTop(sector, maxY) {

        if (maxY < MIN_SECTION_HEIGHT)
            return MIN_SECTION_HEIGHT

        const sBounds = sector.getBounds()
        const sMin = this.convertToTen(this.getMmWidth(sBounds.minY))
        return maxY - sMin + UM_PARAMS.SECTOR_PADDING
    }

    getSectionBottom(sector, minY) {

        if (minY < MIN_SECTION_HEIGHT)
            return MIN_SECTION_HEIGHT

        const sBounds = sector.getBounds()
        const sMax = this.convertToTen(this.getMmWidth(sBounds.maxY))
        return sMax - minY + UM_PARAMS.SECTOR_PADDING
    }

    getValidValue({
                      topLeft,
                      topRight,
                      bottomLeft,
                      bottomRight,
                      sectionWidth,
                      sectionHeight,
                  }) {
        // Инициализация значений по умолчанию
        const tl_width = topLeft.width || 0;
        const tr_width = topRight.width || 0;
        const bl_width = bottomLeft.width || 0;
        const br_width = bottomRight.width || 0;
        const tl_radius = topLeft.radius || 0;
        const tr_radius = topRight.radius || 0;
        const bl_radius = bottomLeft.radius || 0;
        const br_radius = bottomRight.radius || 0;
        const tl_corner = topLeft.corner || 0;
        const tr_corner = topRight.corner || 0;
        const bl_corner = bottomLeft.corner || 0;
        const br_corner = bottomRight.corner || 0;

        // Проверка ширины секции относительно всех углов
        if (
            sectionWidth <= tl_width ||
            sectionWidth <= tr_width ||
            sectionWidth <= bl_width ||
            sectionWidth <= br_width ||
            sectionWidth <= tl_radius ||
            sectionWidth <= tr_radius ||
            sectionWidth <= bl_radius ||
            sectionWidth <= br_radius ||
            sectionWidth <= tl_corner ||
            sectionWidth <= tr_corner ||
            sectionWidth <= bl_corner ||
            sectionWidth <= br_corner
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Проверка пересечения по ширине (между левыми и правыми углами)
        if (
            sectionWidth - tl_width <= tr_width ||
            sectionWidth - tr_width <= tl_width ||
            sectionWidth - bl_width <= br_width ||
            sectionWidth - br_width <= bl_width
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Проверка пересечения углов (corner) по ширине
        if (
            sectionWidth - tl_corner <= tr_corner ||
            sectionWidth - tr_corner <= tl_corner ||
            sectionWidth - bl_corner <= br_corner ||
            sectionWidth - br_corner <= bl_corner
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Проверка пересечения радиусов по ширине
        if (
            sectionWidth - tl_radius <= tr_radius ||
            sectionWidth - tr_radius <= tl_radius ||
            sectionWidth - bl_radius <= br_radius ||
            sectionWidth - br_radius <= bl_radius
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Проверка смешанных пересечений (ширина и радиус)
        if (
            sectionWidth - tl_width <= tr_radius ||
            sectionWidth - tr_width <= tl_radius ||
            sectionWidth - bl_width <= br_radius ||
            sectionWidth - br_width <= bl_radius ||
            sectionWidth - tl_radius <= tr_width ||
            sectionWidth - tr_radius <= tl_width ||
            sectionWidth - bl_radius <= br_width ||
            sectionWidth - br_radius <= bl_width
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Проверка смешанных пересечений (ширина и угол)
        if (
            sectionWidth - tl_width <= tr_corner ||
            sectionWidth - tr_width <= tl_corner ||
            sectionWidth - bl_width <= br_corner ||
            sectionWidth - br_width <= bl_corner ||
            sectionWidth - tl_corner <= tr_width ||
            sectionWidth - tr_corner <= tl_width ||
            sectionWidth - bl_corner <= br_width ||
            sectionWidth - br_corner <= bl_width
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Проверка смешанных пересечений (радиус и угол)
        if (
            sectionWidth - tl_radius <= tr_corner ||
            sectionWidth - tr_radius <= tl_corner ||
            sectionWidth - bl_radius <= br_corner ||
            sectionWidth - br_radius <= bl_corner ||
            sectionWidth - tl_corner <= tr_radius ||
            sectionWidth - tr_corner <= tl_radius ||
            sectionWidth - bl_corner <= br_radius ||
            sectionWidth - br_corner <= bl_radius
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Проверка высоты секции относительно радиусов и углов
        if (
            sectionHeight <= tl_radius ||
            sectionHeight <= tr_radius ||
            sectionHeight <= bl_radius ||
            sectionHeight <= br_radius ||
            sectionHeight <= tl_corner ||
            sectionHeight <= tr_corner ||
            sectionHeight <= bl_corner ||
            sectionHeight <= br_corner
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Проверка пересечения радиусов по высоте (между верхними и нижними углами)
        if (
            sectionHeight - tl_radius <= bl_radius ||
            sectionHeight - tr_radius <= br_radius ||
            sectionHeight - bl_radius <= tl_radius ||
            sectionHeight - br_radius <= tr_radius
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Проверка пересечения углов по высоте
        if (
            sectionHeight - tl_corner <= bl_corner ||
            sectionHeight - tr_corner <= br_corner ||
            sectionHeight - bl_corner <= tl_corner ||
            sectionHeight - br_corner <= tr_corner
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Проверка смешанных пересечений (радиус и угол) по высоте
        if (
            sectionHeight - tl_radius <= bl_corner ||
            sectionHeight - tr_radius <= br_corner ||
            sectionHeight - bl_radius <= tl_corner ||
            sectionHeight - br_radius <= tr_corner ||
            sectionHeight - tl_corner <= bl_radius ||
            sectionHeight - tr_corner <= br_radius ||
            sectionHeight - bl_corner <= tl_radius ||
            sectionHeight - br_corner <= tr_radius
        ) {
            return {
                tl_width: 0, tr_width: 0, bl_width: 0, br_width: 0,
                tl_radius: 0, tr_radius: 0, bl_radius: 0, br_radius: 0,
                tl_corner: 0, tr_corner: 0, bl_corner: 0, br_corner: 0,
                error: "101"
            };
        }

        // Если все проверки пройдены, возвращаем валидные значения
        return {
            tl_width, tr_width, bl_width, br_width,
            tl_radius, tr_radius, bl_radius, br_radius,
            tl_corner, tr_corner, bl_corner, br_corner,
            error: false
        };
    }

    drawDashedLine({
                       startX,
                       startY,
                       endX,
                       endY,
                       dashLength = 5,
                       gapLength = 2.5,
                       graphics,
                   }: TDashedLine) {
        // graphics.clear(); // Очищаем предыдущее состояние


        const totalLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const dx = (endX - startX) / totalLength;
        const dy = (endY - startY) / totalLength;

        let currentPos = 0;

        while (currentPos < totalLength) {
            const dashStartX = startX + dx * currentPos;
            const dashStartY = startY + dy * currentPos;
            const dashEndX = startX + dx * Math.min(currentPos + dashLength, totalLength);
            const dashEndY = startY + dy * Math.min(currentPos + dashLength, totalLength);

            graphics.moveTo(dashStartX, dashStartY);
            graphics.lineTo(dashEndX, dashEndY);

            currentPos += dashLength + gapLength;
        }

        graphics.stroke({width: 1, color: '#5D6069'}); // Завершаем отрисовку линии

        return graphics

    };
}

class Shape extends Helpers {
    select: () => void
    render: () => void
    calcDrawersFasades: () => void
    checkLoopsCollision: () => void
    UM_STORE: ReturnType<typeof useUMStorage> = useUMStorage();
    type: string
    sectorBounds: TBounds
    graphic: Graphics
    highlightGraphics: Graphics
    width: number = 0
    height: number = 0
    radius: number = 0
    paddingTop: number = 0
    paddingBottom: number = 0
    drawersFasadesOffset: number = 0
    shapes: Shape[]
    data: THoleData
    sector: Container
    dementionContainer: Container
    dragActive: boolean = true

    private distanceGraphics: Graphics | null = null; // Для хранения линий расстояний
    private distanceLabels: Text[] = []; // Для хранения текстовых меток

    constructor({
                    type,
                    sector,
                    position,
                    data,
                    select,
                    render,
                    dementionContainer,
                    getMmWidth,
                    getMmHeight,
                    getPixelHeight,
                    getPixelWidth,
                    dragActive,
                    calcDrawersFasades,
                    checkLoopsCollision
                }:
                {
                    type: string,
                    sector: Container,
                    position?: { x: number, y: number },
                    data: THoleData,
                    select?: () => void,
                    render?: () => void,
                    getMmHeight?: () => void,
                    getMmWidth?: () => void,
                    getPixelHeight?: () => void,
                    getPixelWidth?: () => void,
                    calcDrawersFasades?: () => void,
                    checkLoopsCollision?: () => void,
                    dementionContainer?: Container,
                    dragActive: boolean,
                })
    {
        super()

        this.sector = sector

        this.type = type;
        this.sectorBounds = this.getSectorBounds(sector);

        this.graphic = new Graphics();
        this.highlightGraphics = new Graphics();
        this.shapes = sector.shapes
        this.data = data
        this.select = select
        this.render = render

        if (getMmWidth)
            this.getMmWidth = getMmWidth
        if (getMmHeight)
            this.getMmHeight = getMmHeight
        if (getPixelWidth)
            this.getPixelWidth = getPixelWidth
        if (getPixelHeight)
            this.getPixelHeight = getPixelHeight
        if (calcDrawersFasades)
            this.calcDrawersFasades = calcDrawersFasades
        if (checkLoopsCollision)
            this.checkLoopsCollision = checkLoopsCollision

        this.dementionContainer = dementionContainer

        // Инициализация графики в зависимости от типа
        this.width = this.getPixelWidth(data.width);
        this.height = this.getPixelHeight(data.height);

        this.graphic.data = data
        this.graphic.holeId = data.id
        this.highlightGraphics.data = data
        this.highlightGraphics.holeId = data.id

        this.graphic.rect(0, 0, this.getPixelWidth(data.width), this.getPixelHeight(data.height))
        this.graphic.fill("#875003")
        this.graphic.stroke({width: 1, color: "#b86c02", alignment: 1});
        this.highlightGraphics.rect(0, 0, this.getPixelWidth(data.width), this.getPixelHeight(data.height))
        this.highlightGraphics.fill("#b86c02")
        this.highlightGraphics.stroke({width: 1, color: "#875003", alignment: 1});
        this.drawersFasadesOffset = this.getPixelHeight(4)

        if (position) {
            this.graphic.position.x = this.getPixelWidth(position.x);
            this.graphic.position.y = this.getPixelHeight(position.y);
            this.highlightGraphics.position.x = this.getPixelWidth(position.x);
            this.highlightGraphics.position.y = this.getPixelHeight(position.y);
        } else {
            this.graphic.position.x = this.getPixelWidth(data.x);
            this.graphic.position.y = this.getPixelHeight(data.y);
            this.highlightGraphics.position.x = this.getPixelWidth(data.x);
            this.highlightGraphics.position.y = this.getPixelHeight(data.y);
        }

        // Сохраняем ссылку на класс в графическом объекте
        this.graphic.shapeInstance = this;
        this.highlightGraphics.shapeInstance = this;
        this.highlightGraphics.visible = false;

        if (data.fasade) {
            this.paddingBottom = this.getPixelHeight(data.fasade.manufacturerOffset - (data.moduleThickness - 2))
            this.paddingTop = this.getPixelHeight(data.fasade.height - data.fasade.manufacturerOffset - data.height - (data.moduleThickness - 2))
        }

        if (data.isProfile) {
            this.paddingTop = this.getPixelHeight(-data.moduleThickness)
        }

        // Настройка перетаскивания
        if (dragActive && (!data.isProfile || !data.isProfile.isBottomHiTechProfile)) {
            // Настройка интерактивности
            this.graphic.eventMode = "static";
            this.graphic.cursor = "grab";
            this.highlightGraphics.eventMode = "static";
            this.highlightGraphics.cursor = "grab";

            this.setupDraggable();
        }
    }

    // Настройка перетаскивания
    setupDraggable() {
        let dragging = false;
        let dragOffset = {x: 0, y: 0};
        let originalPosition = {x: 0, y: 0};
        const self = this;

        const pointerdown = (event, graphic) => {
            graphic.cursor = "grabbing";
            this.select("fillings", <TSelectedCell>{
                sec: this.sector.secIndex,
                cell: this.sector.cellIndex,
                row: this.sector.rowIndex,
                extra: this.sector.extraIndex
            });
            dragging = true;
            originalPosition = {
                x: graphic.position.x,
                y: graphic.position.y
            };
            dragOffset = {
                x: graphic.position.x - event.global.x,
                y: graphic.position.y - event.global.y,
            };
            graphic.alpha = 0.7;
        }

        const pointermove = (event, graphic) => {
            if (dragging) {
                // Вычисляем новые позиции
                const newY = event.global.y + dragOffset.y;
                const newX = event.global.x + dragOffset.x;

                // Ограничения по осям
                let adjustedY = Math.max(
                    this.sectorBounds.y + this.paddingTop,
                    Math.min(newY, this.sectorBounds.y + this.sectorBounds.height - self.height - this.paddingBottom)
                );
                let adjustedX = Math.max(
                    this.sectorBounds.x,
                    Math.min(newX, this.sectorBounds.x + this.sectorBounds.width - self.width)
                );

                // Сохраняем текущую позицию для восстановления в случае коллизии
                let currentY = graphic.position.y;
                const currentX = graphic.position.x;

                if (self.data.isVerticalItem) {
                    // Пробуем движение по X
                    self.graphic.position.x = adjustedX;
                    self.highlightGraphics.position.x = adjustedX;
                    let hasCollisionX = false;

                    for (const otherShape of this.sector.shapes) {
                        if (self !== otherShape && self.checkOverlap(otherShape, true)) {
                            hasCollisionX = true;
                            break;
                        }
                    }

                    if (hasCollisionX) {
                        self.graphic.position.x = currentX;
                        self.highlightGraphics.position.x = currentX;
                    }
                } else {
                    // Пробуем движение по Y
                    self.graphic.position.y = adjustedY;
                    self.highlightGraphics.position.y = adjustedY;
                    let hasCollisionY = false;

                    let shapes = this.sector.shapes

                    if (self.data.fasade || self.data.isProfile) {
                        const curentSec = self.UM_STORE.getUMGrid()?.sections?.[self.data.sec]
                        const fasadesDrawers = curentSec.fasadesDrawers ?? [];
                        const sectionSector = fasadesDrawers[0]?.sector?.sections?.[0]

                        if(sectionSector?.children) {
                            let allShapes = []
                            sectionSector.children.forEach(child => {
                                if(child.secIndex === self.data.sec && child.shapes)
                                    allShapes.push(...child.shapes)
                            })
                            shapes = allShapes
                        }
                    }

                    for (const otherShape of shapes) {
                        if ((self !== otherShape && self.data !== otherShape.data) && self.checkOverlap(otherShape)) {

                            if((self.data.fasade && otherShape.data.fasade) && (self.data.fasade.fasadeDrawerId === otherShape.data.fasade.fasadeDrawerId))
                                continue;

                            hasCollisionY = true;

                            if (self.data.fasade && otherShape.data.fasade) {
                                self.graphic.position.y = currentY;
                                self.highlightGraphics.position.y = currentY;
                                let thisPos = self.getDrawerFasadePosition(self)

                                let otherPos = self.getDrawerFasadePosition(otherShape)

                                if (thisPos.min >= otherPos.max) {

                                    let delta = self.getMmHeight(thisPos.min - otherPos.max)

                                    if (Math.abs(delta) < 10) {
                                        let newPos = otherPos.max + self.drawersFasadesOffset + self.getPixelHeight(self.data.fasade.height - self.data.fasade.manufacturerOffset - self.data.height)
                                        self.graphic.position.y = newPos;
                                        self.highlightGraphics.position.y = newPos;

                                        //if (!self.checkOverlap(otherShape))
                                            currentY = newPos

                                        self.graphic.position.y = adjustedY;
                                        self.highlightGraphics.position.y = adjustedY;
                                    }
                                } else if (otherPos.min >= thisPos.max) {
                                    let delta = self.getMmHeight(otherPos.min - thisPos.max)

                                    if (Math.abs(delta) < 10) {
                                        let newPos = otherPos.min - self.drawersFasadesOffset - self.getPixelHeight(self.data.fasade.manufacturerOffset + self.data.height)
                                        self.graphic.position.y = newPos;
                                        self.highlightGraphics.position.y = newPos;

                                        //if (!self.checkOverlap(otherShape))
                                            currentY = newPos

                                        self.graphic.position.y = adjustedY;
                                        self.highlightGraphics.position.y = adjustedY;
                                    }
                                }
                            }

                            break;
                        }
                    }

                    if (hasCollisionY) {
                        self.graphic.position.y = currentY;
                        self.highlightGraphics.position.y = currentY;
                    }
                }
            }
        }

        this.graphic.on("pointerdown", (event) => pointerdown(event, this.graphic));
        this.graphic.on("globalpointermove", (event) => pointermove(event, this.graphic));
        this.highlightGraphics.on("pointerdown", (event) => pointerdown(event, this.highlightGraphics));
        this.highlightGraphics.on("globalpointermove", (event) => pointermove(event, this.highlightGraphics));

        const endDrag = () => {
            if (dragging) {
                dragging = false;
                self.graphic.alpha = 1;

                this.data.Mwidth = 600;
                this.data.Mheight = 600;

                if (this.data.position) {
                    this.data.position.x = Math.round(this.getMmWidth(self.graphic.position.x));
                    this.data.position.y = Math.round(this.getMmHeight(self.graphic.position.y));
                } else {
                    this.data.x = Math.round(this.getMmWidth(self.graphic.position.x));
                    this.data.y = Math.round(this.getMmHeight(self.graphic.position.y));
                }

                if (this.data.fasade || this.data.isProfile) {
                    this.calcDrawersFasades(this.data.sec, this.data)
                } else
                    this.checkLoopsCollision(this.data.sec)

                this.render();
            }
        };

        this.graphic.on("pointerup", endDrag);
        this.graphic.on("pointerupoutside", endDrag);
        this.highlightGraphics.on("pointerup", endDrag);
        this.highlightGraphics.on("pointerupoutside", endDrag);
    }

    getDrawerFasadePosition(shape: Shape) {
        let result = {
            min: shape.graphic.position.y,
            max: shape.graphic.position.y + shape.height,
            drawer: false,
        }

        if (shape.data.fasade) {
            result.min = shape.graphic.position.y - shape.getPixelHeight(shape.data.fasade.height - shape.data.fasade.manufacturerOffset - shape.data.height)
            result.max = result.min + shape.getPixelHeight(shape.data.fasade.height)
            result.drawer = true;
        }

        return result;
    }

    // Проверка перекрытия с другой фигурой
    checkOverlap(otherShape: Shape, isVerticalItem: boolean = false) {

        if (this === otherShape)
            return false;

        let verticalCheck = false;
        let horizontalCheck = false;

        if ((this.data.isDrawer || this.data.fasade) && otherShape.data.type === 'loop')
            return false

        if (isVerticalItem || otherShape.data.isVerticalItem) {
            let thisPosX = this.graphic.position.x
            let thisWidth = this.width
            let otherShapePosX = otherShape.graphic.position.x
            let otherShapeWidth = otherShape.width

            if (['loop', 'vertical_shelf'].includes(otherShape.data.type)) {
                // Проверка наложения прямоугольников
                verticalCheck = (
                        (
                            thisPosX + thisWidth <= otherShapePosX + otherShapeWidth &&
                            thisPosX + thisWidth >= otherShapePosX
                        ) ||
                        (
                            thisPosX <= otherShapePosX + otherShapeWidth &&
                            thisPosX >= otherShapePosX
                        )
                    ) ||
                    (
                        (
                            otherShapePosX + otherShapeWidth <= thisPosX + thisWidth &&
                            otherShapePosX + otherShapeWidth >= thisPosX
                        ) ||
                        (
                            otherShapePosX <= thisPosX + thisWidth &&
                            otherShapePosX >= thisPosX
                        )
                    );
            } else
                verticalCheck = true;

        } else {
            let thisPosY = this.graphic.position.y
            let thisHeight = this.height
            let otherShapePosY = otherShape.graphic.position.y
            let otherShapeHeight = otherShape.height

            if (!['loop', 'vertical_shelf'].includes(otherShape.data.type)) {
                thisPosY = this.data.fasade ? this.graphic.position.y
                    - this.getPixelHeight(this.data.fasade.height - this.data.fasade.manufacturerOffset - this.data.height + 2)
                    : thisPosY

                thisHeight = this.data.fasade ? this.getPixelHeight(this.data.fasade.height + 4) : thisHeight

                otherShapePosY = otherShape.data.fasade ? otherShape.graphic.position.y -
                    this.getPixelHeight(otherShape.data.fasade.height - otherShape.data.fasade.manufacturerOffset - otherShape.data.height + 2)
                    : otherShapePosY

                otherShapeHeight = otherShape.data.fasade ? this.getPixelHeight(otherShape.data.fasade.height + 4) : otherShapeHeight

                if (!(this.data.isProfile && otherShape.data.isProfile)) {
                    if (this.data.isProfile && otherShape.data.fasade) {
                        thisPosY = this.graphic.position.y - this.getPixelHeight(this.data.isProfile.TYPE_PROFILE === 'l' ? 0 : this.data.isProfile.manufacturerOffset)
                        thisHeight = this.getPixelHeight(this.data.isProfile.offsetFasades)
                    }

                    if (otherShape.data.isProfile && this.data.fasade) {
                        otherShapePosY = otherShape.graphic.position.y - this.getPixelHeight(otherShape.data.isProfile.TYPE_PROFILE === 'l' ? 0 : otherShape.data.isProfile.manufacturerOffset)
                        otherShapeHeight = this.getPixelHeight(otherShape.data.isProfile.offsetFasades)
                    }
                }
            }

            // Проверка наложения прямоугольников
            horizontalCheck = (
                    (
                        thisPosY + thisHeight <= otherShapePosY + otherShapeHeight &&
                        thisPosY + thisHeight >= otherShapePosY
                    ) ||
                    (
                        thisPosY <= otherShapePosY + otherShapeHeight &&
                        thisPosY >= otherShapePosY
                    )
                ) ||
                (
                    (
                        otherShapePosY + otherShapeHeight <= thisPosY + thisHeight &&
                        otherShapePosY + otherShapeHeight >= thisPosY
                    ) ||
                    (
                        otherShapePosY <= thisPosY + thisHeight &&
                        otherShapePosY >= thisPosY
                    )
                );

        }

        return horizontalCheck || verticalCheck
    }

    // Проверка, находится ли указанная позиция внутри сектора
    isPositionInsideSector(position: { x: number, y: number }) {
        const pxPos = {
            x: this.getPixelWidth(position.x),
            y: this.getPixelHeight(position.y)
        };

        let width = this.width
        let height = this.height
        if(this.data.fasade) {
            let moduleThickness = this.UM_STORE.getUMGrid().moduleThickness
            let top_offset = this.data.fasade.height - this.data.fasade.manufacturerOffset - this.data.height - (moduleThickness - 2)
            height = this.getPixelHeight(this.data.fasade.height - (moduleThickness - 2) * 2)
            pxPos.y -= this.getPixelHeight(top_offset)

            return (
                (
                    (
                        pxPos.x + width <= this.sectorBounds.x + this.sectorBounds.width &&
                        pxPos.x + width >= this.sectorBounds.x
                    ) &&
                    (
                        pxPos.x <= this.sectorBounds.x + this.sectorBounds.width &&
                        pxPos.x >= this.sectorBounds.x
                    )
                ) &&
                (
                    (
                        pxPos.y + height <= this.sectorBounds.y + this.sectorBounds.height &&
                        pxPos.y + height >= this.sectorBounds.y
                    ) &&
                    (
                        pxPos.y <= this.sectorBounds.y + this.sectorBounds.height &&
                        pxPos.y >= this.sectorBounds.y
                    )
                )
            );
        }
        else
            return (
            (
                (
                    pxPos.x + this.width <= this.sectorBounds.x + this.sectorBounds.width &&
                    pxPos.x + this.width >= this.sectorBounds.x
                ) ||
                (
                    pxPos.x <= this.sectorBounds.x + this.sectorBounds.width &&
                    pxPos.x >= this.sectorBounds.x
                )
            ) &&
            (
                (
                    pxPos.y + this.height <= this.sectorBounds.y + this.sectorBounds.height &&
                    pxPos.y + this.height >= this.sectorBounds.y
                ) ||
                (
                    pxPos.y <= this.sectorBounds.y + this.sectorBounds.height &&
                    pxPos.y >= this.sectorBounds.y
                )
            )
        );
    }

    // Вспомогательный метод для отрисовки стрелки (заполненный треугольник)
    private drawArrowhead(
        graphics: Graphics,
        x: number,
        y: number,
        direction: 'left' | 'right' | 'up' | 'down',
        size: number = 6,
        color: string = '#5D6069'
    ) {
        graphics.fill(color);
        const halfSize = size / 2;
        switch (direction) {
            case 'left': // Треугольник указывает влево
                graphics.moveTo(x, y);
                graphics.lineTo(x + size, y - halfSize);
                graphics.lineTo(x + size, y + halfSize);
                graphics.lineTo(x, y);
                break;
            case 'right': // Треугольник указывает вправо
                graphics.moveTo(x, y);
                graphics.lineTo(x - size, y - halfSize);
                graphics.lineTo(x - size, y + halfSize);
                graphics.lineTo(x, y);
                break;
            case 'up': // Треугольник указывает вверх
                graphics.moveTo(x, y);
                graphics.lineTo(x - halfSize, y + size);
                graphics.lineTo(x + halfSize, y + size);
                graphics.lineTo(x, y);
                break;
            case 'down': // Треугольник указывает вниз
                graphics.moveTo(x, y);
                graphics.lineTo(x - halfSize, y - size);
                graphics.lineTo(x + halfSize, y - size);
                graphics.lineTo(x, y);
                break;
        }

    }

    drawBoundaryDistances() {

        if (this.distanceGraphics) {
            this.dementionContainer.removeChild(this.distanceGraphics);
            this.distanceGraphics.destroy();
            this.distanceGraphics = null;
        }
        this.distanceLabels.forEach(label => this.dementionContainer.removeChild(label));
        this.distanceLabels.forEach(label => label.destroy());
        this.distanceLabels = [];

        const graphics = new Graphics();
        this.distanceGraphics = graphics;

        const distances = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
        };

        const textStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 12,
            fill: '#5D6069',
        });

        distances.left = this.graphic.position.x - this.sectorBounds.x;
        distances.right = this.sectorBounds.x + this.sectorBounds.width - (this.graphic.position.x + this.width);
        distances.top = this.graphic.position.y - this.sectorBounds.y;
        distances.bottom = this.sectorBounds.y + this.sectorBounds.height - (this.graphic.position.y + this.height);

        let left, right, top, bottom
        if (this.sector.shapes.length > 1) {
            let tmp_shapes = this.sector.shapes.slice().filter(shape => shape.data.type !== 'loop');
            let y_sorted = tmp_shapes.slice().sort((a, b) => a.data.position.y - b.data.position.y);
            let x_sorted = tmp_shapes.slice().sort((a, b) => a.data.position.x - b.data.position.x);

            let y_index = y_sorted.findIndex(shape => shape.graphic.uid === this.graphic.uid);
            let x_index = x_sorted.findIndex(shape => shape.graphic.uid === this.graphic.uid);

            left = x_sorted[x_index - 1]
            right = x_sorted[x_index + 1]
            top = y_sorted[y_index - 1]
            bottom = y_sorted[y_index + 1]

            left = left ? this.graphic.position.x - left.graphic.position.x : false;
            right = right ? right.graphic.position.x + right.width - (this.graphic.position.x + this.width) : false;
            top = top ? this.graphic.position.y - (top.graphic.position.y + top.height) : false;
            bottom = bottom ? bottom.graphic.position.y - (this.graphic.position.y + this.height) : false;
        }

        // Отрисовка для левой границы
        if (distances.left > 0) {
            const startX = this.graphic.position.x
            const startY = this.graphic.position.y + this.height / 2
            const endX = startX - (left || distances.left);
            const endY = startY;
            this.drawDashedLine({
                startX,
                startY,
                endX,
                endY,
                graphics,
            });
            // Стрелка у объекта (у начала линии, указывает вправо, к объекту)
            this.drawArrowhead(graphics, startX, startY, 'right');
            // Стрелка на краю сектора (внутри сектора, указывает влево, от фигуры)
            this.drawArrowhead(graphics, endX, endY, 'left', 5);

            let distance = startX - endX
            const leftText = new Text({text: `${Math.round(this.getMmWidth(distance))} mm`, style: textStyle});

            let widthSize = leftText.getSize()
            if (widthSize.width > distance) {
                leftText.scale.x = (distance - 2) / widthSize.width
            }
            widthSize = leftText.getSize()

            leftText.position.set(
                startX - distance / 2 - widthSize.width / 2,
                startY - textStyle.fontSize / 2 - 15
            );
            this.dementionContainer.addChild(leftText);
            this.distanceLabels.push(leftText);
        }

        // Отрисовка для правой границы
        if (distances.right > 0 && !right) {
            const startX = this.graphic.position.x + this.width
            const startY = this.graphic.position.y + this.height / 2
            const endX = startX + (right || distances.right);
            const endY = startY;
            this.drawDashedLine({
                startX,
                startY,
                endX,
                endY,
                graphics,
            });
            // Стрелка у объекта (у начала линии, указывает влево, к объекту)
            this.drawArrowhead(graphics, startX, startY, 'left');
            // Стрелка на краю сектора (внутри сектора, указывает вправо, от фигуры)
            this.drawArrowhead(graphics, endX, endY, 'right', 5);

            let distance = endX - startX
            const rightText = new Text({text: `${Math.round(this.getMmWidth(distance))} mm`, style: textStyle});

            let widthSize = rightText.getSize()
            if (widthSize.width > distance) {
                rightText.scale.x = (distance - 2) / widthSize.width
            }
            widthSize = rightText.getSize()

            rightText.position.set(
                startX + distance / 2 - widthSize.width / 2,
                startY - textStyle.fontSize / 2 - 15
            );
            this.dementionContainer.addChild(rightText);
            this.distanceLabels.push(rightText);
        }

        // Отрисовка для верхней границы
        if (distances.top > 0 && !top) {
            const startX = this.graphic.position.x + this.width / 2
            const startY = this.graphic.position.y
            const endX = startX;
            const endY = startY - (top || distances.top);
            this.drawDashedLine({
                startX,
                startY,
                endX,
                endY,
                graphics,
            });
            // Стрелка у объекта (у начала линии, указывает вниз, к объекту)
            this.drawArrowhead(graphics, startX, startY, 'down');
            // Стрелка на краю сектора (внутри сектора, указывает вверх, от фигуры)
            this.drawArrowhead(graphics, endX, endY, 'up', 5);

            let distance = startY - endY
            const topText = new Text({text: `${Math.round(this.getMmHeight(distance))} mm`, style: textStyle});

            let heightSize = topText.getSize()
            if (heightSize.height > distance) {
                topText.scale.y = (distance - 2) / heightSize.height
            }
            heightSize = topText.getSize()

            topText.position.set(
                startX + 5,
                startY - distance / 2 - heightSize.height / 2
            );
            this.dementionContainer.addChild(topText);
            this.distanceLabels.push(topText);
        }

        // Отрисовка для нижней границы
        if (distances.bottom > 0) {
            const startX = this.graphic.position.x + this.width / 2
            const startY = this.graphic.position.y + this.height
            const endX = startX;
            const endY = startY + (bottom || distances.bottom);
            this.drawDashedLine({
                startX,
                startY,
                endX,
                endY,
                graphics,
            });
            // Стрелка у объекта (у начала линии, указывает вверх, к объекту), с небольшим смещением вниз
            this.drawArrowhead(graphics, startX, startY, 'up');
            // Стрелка на краю сектора (внутри сектора, указывает вниз, от фигуры)
            this.drawArrowhead(graphics, endX, endY, 'down'); // Увеличено смещение до 5 пикселей
            this.drawArrowhead(graphics, startX, startY, 'up');

            let distance = endY - startY
            const bottomText = new Text({
                text: `${Math.round(this.getMmHeight(distance))} mm`,
                style: textStyle
            });

            let heightSize = bottomText.getSize()
            if (heightSize.height > distance) {
                bottomText.scale.y = (distance - 2) / heightSize.height
            }
            heightSize = bottomText.getSize()

            bottomText.position.set(
                startX + 5,
                startY + distance / 2 - heightSize.height / 2
            );
            this.dementionContainer.addChild(bottomText);
            this.distanceLabels.push(bottomText);
        }

        this.dementionContainer.addChild(graphics);

        // Добавляем данные для отображения в компоненте VUE @CutOptions.vue

        this.data.distances = {
            left: Math.round(this.getMmWidth(distances.left)),
            right: Math.round(this.getMmWidth(distances.right)),
            top: Math.round(this.getMmHeight(distances.top)),
            bottom: Math.round(this.getMmHeight(distances.bottom)),
        }

    }

}

class Section extends Helpers {
    cellGraphics: Graphics = new Graphics();
    highlightGraphics: Graphics = new Graphics();
    width: number = 0;
    height: number = 0;
    data: any;
    sector: Container;
    opacity: number;
    _drawDimensions: boolean;

    constructor(data: any, width: number, height: number, sector: Container, _drawDimensions: boolean = true, opacity: number = 1) {
        super();
        this.data = data;
        this.width = width;
        this.height = height;
        this.sector = sector;
        this._drawDimensions = _drawDimensions;
        this.opacity = opacity;

        this.createSection();
    }

    createSection(data = {}) {
        this.createFormSection(this.data);
    }

    createFormSection(data) {
        let bottomLeft = data.bottomLeft ?? {type: 'none'};
        let bottomRight = data.bottomRight ?? {type: 'none'};
        let topLeft = data.topLeft ?? {type: 'none'};
        let topRight = data.topRight ?? {type: 'none'};
        let opacity = this.opacity;

        let defCellColor, deffHighlightColor;
        switch (data.type) {
            case "fasade":
                defCellColor = '#1E90FF'
                deffHighlightColor = '#80bfff'
                break;
            case "module":
                defCellColor = '#875003'
                deffHighlightColor = '#b86c02'
                break;
            case "loop":
                defCellColor = '#64646e';
                deffHighlightColor = '#64646e';
                break;
            default:
                defCellColor = '#d2d0d7';
                deffHighlightColor = '#ECEBF1';
                break;
        }

        if (data.error) {
            defCellColor = '#ad0202'
            deffHighlightColor = '#fa3c3c'
        }

        // Очищаем графику перед отрисовкой
        this.cellGraphics.clear();
        this.highlightGraphics.clear();

        // Создаем пути для графики
        const cellPath = this.createPath(topRight, topLeft, bottomRight, bottomLeft);
        const highlightPath = this.createPath(topRight, topLeft, bottomRight, bottomLeft);

        if (cellPath.error) {
            defCellColor = '#f5caca';
            deffHighlightColor = '#f7e2e2';
        }

        // Отрисовываем пути на графике
        this.cellGraphics.path(cellPath).fill({color: defCellColor, alpha: opacity});
        this.highlightGraphics.path(highlightPath).fill({color: deffHighlightColor, alpha: opacity});

        // Отрисовываем размеры
        if (this._drawDimensions) {
            this.drawDimensions(this.cellGraphics, topRight, topLeft, bottomRight, bottomLeft);
            this.drawDimensions(this.highlightGraphics, topRight, topLeft, bottomRight, bottomLeft);
        }
    }

    createPath(topRight, topLeft, bottomRight, bottomLeft): GraphicsPath {
        const elems = [topLeft, topRight, bottomLeft, bottomRight];

        const path = new GraphicsPath();
        const x = 0;
        const y = 0;

        const validValue = this.getValidValue({
            topLeft,
            topRight,
            bottomLeft,
            bottomRight,
            sectionWidth: this.width,
            sectionHeight: this.height,
        });

        const {
            tl_width, tr_width, bl_width, br_width,
            tl_radius, tr_radius, bl_radius, br_radius,
            tl_corner, tr_corner, bl_corner, br_corner,
            error
        } = validValue;

        // Начинаем с верхнего левого угла
        if (topLeft.type === 'rounded') {
            path.lineTo(x, y + tl_radius);
            path.arcTo(x, y, x + tl_radius, y, tl_radius);
        } else if (topLeft.type === 'corner') {
            path.lineTo(x, y + tl_corner);
            path.lineTo(x + tl_corner, y);
        } else if (topLeft.type === 'inward') {
            path.lineTo(x, y + tl_radius);
            const startX = x + tl_width - tl_radius;
            const startY = y + tl_radius;
            const endX = x + tl_width;
            const endY = y
            const controlX = x + tl_width;
            const controlY = y + tl_radius
            path.lineTo(startX, startY);
            path.quadraticCurveTo(controlX, controlY, endX, endY);
            path.lineTo(x + tl_width, y);

        } else {
            path.moveTo(x, y); // Острый угол
        }

        // Верхний правый угол
        if (topRight.type === 'rounded') {
            path.lineTo(x + this.width - tr_radius, y);
            path.arcTo(x + this.width, y, x + this.width, y + tr_radius, tr_radius);
        } else if (topRight.type === 'corner') {
            path.lineTo(x + this.width - tr_corner, y);
            path.lineTo(x + this.width, y + tr_corner);
        } else if (topRight.type === 'inward') {
            path.lineTo(x + this.width - tr_width, y);
            const endX = x + this.width - (tr_width - tr_radius);
            const endY = y + tr_radius;
            const controlX = x + this.width - tr_width;
            const controlY = y + tr_radius;
            path.quadraticCurveTo(controlX, controlY, endX, endY);
            path.lineTo(x + this.width, y + tr_radius);
        } else {
            path.lineTo(x + this.width, y); // Острый угол
        }
        // Нижний правый угол
        if (bottomRight.type === 'rounded') {
            path.lineTo(x + this.width, y + this.height - br_radius);
            path.arcTo(x + this.width, y + this.height, x + this.width - br_radius, y + this.height, br_radius);
        } else if (bottomRight.type === 'corner') {
            path.lineTo(x + this.width, y + this.height - br_corner);
            path.lineTo(x + this.width - br_corner, y + this.height);

        } else if (bottomRight.type === 'inward') {
            path.lineTo(x + this.width, y + this.height - br_radius);
            const startX = x + this.width - (br_width - br_radius);
            const startY = y + this.height - br_radius;
            const endX = x + this.width - br_width;
            const endY = y + this.height;
            const controlX = x + this.width - br_width;
            const controlY = y + this.height - br_radius;
            path.lineTo(startX, startY);
            path.quadraticCurveTo(controlX, controlY, endX, endY);
            path.lineTo(x + this.width - br_width, y + this.height);
        } else {
            path.lineTo(x + this.width, y + this.height); // Острый угол
        }
        // Нижний левый угол
        if (bottomLeft.type === 'rounded') {
            path.lineTo(x + bl_radius, y + this.height);
            path.arcTo(x, y + this.height, x, y + this.height - bl_radius, bl_radius);
        } else if (bottomLeft.type === 'corner') {
            path.lineTo(x + bl_corner, y + this.height);
            path.lineTo(x, y + this.height - bl_corner);
        } else if (bottomLeft.type === 'inward') {
            path.lineTo(x + bl_width, y + this.height);
            const startX = x + bl_width;
            const startY = y + this.height;
            const endX = x + (bl_width - bl_radius);
            const endY = y + this.height - bl_radius;
            const controlX = x + bl_width;
            const controlY = y + this.height - bl_radius;
            path.lineTo(startX, startY);
            path.quadraticCurveTo(controlX, controlY, endX, endY);
            path.lineTo(x, y + this.height - bl_radius);
        } else {
            path.lineTo(x, y + this.height); // Острый угол
        }

        // Закрываем путь, возвращаясь к начальной точке
        path.closePath();

        // Присваиваем код ошибки
        path.error = validValue.error;

        elems.forEach(item => {
            if (item.el) {
                item.el.error = validValue.error;
            }
        });

        return path;
    }

    drawDimensions(graphics: Graphics, topRight, topLeft, bottomRight, bottomLeft) {
        const x = 0;
        const y = 0;

        // Стили для текстовых меток
        const textStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 12,
            fill: '#1a1a1e',
        });

        let textOfDimensions = new Graphics();
        textOfDimensions.dimensions = true

        // Метка ширины (по центру сверху)
        const widthText = new Text({text: `${this.data.width} мм`, style: textStyle});
        widthText.anchor.set(0.5, 0); // Центрируем по горизонтали, привязка к верхнему краю
        widthText.x = x + this.width / 2;
        widthText.y = y + 5; // Смещаем вниз на 10 пикселей от верхней границы

        let widthSize = widthText.getSize()
        if (widthSize.width > this.width) {
            widthText.scale.x = (this.width - 2) / widthSize.width
            widthSize = widthText.getSize()
            widthText.x = x + this.width / 2// - widthSize.width / 2;
        }

        textOfDimensions.addChild(widthText);

        // Метка высоты (по центру справа)
        const heightText = new Text({text: `${this.data.height} мм`, style: textStyle});
        heightText.anchor.set(1, 0.5); // Привязка к правому краю, центрируем по вертикали
        heightText.rotation = -Math.PI / 2; // Поворот на 90 градусов против часовой
        heightText.x = x + this.width - 10; // Смещаем влево на 10 пикселей от правой границы
        heightText.y = y + this.height / 2 - 20;

        let heightSize = heightText.getSize()
        if (heightSize.width > this.height) {
            heightText.scale.x = (this.height - 2) / heightSize.width
            heightSize = heightText.getSize()
            heightText.y = y + this.height / 2 - heightSize.width / 2;
        }

        textOfDimensions.addChild(heightText);

        graphics.addChild(textOfDimensions);

        // Дополнительные метки для углов (если нужно)
        // Например, радиусы или углы для topLeft и topRight
    }

}

class ShapeAdjuster extends Helpers {
    maxIterations: number = 500
    maxPositionAttempts: number = 250
    scope: UMconstructorClass

    constructor({scope, getMmWidth, getMmHeight, getPixelHeight, getPixelWidth}:
                {
                    scope: UMconstructorClass,
                    getMmHeight?: () => void,
                    getMmWidth?: () => void,
                    getPixelHeight?: () => void,
                    getPixelWidth?: () => void,
                }) {
        super()
        this.scope = scope
        if (getMmWidth)
            this.getMmWidth = getMmWidth
        if (getMmHeight)
            this.getMmHeight = getMmHeight
        if (getPixelWidth)
            this.getPixelWidth = getPixelWidth
        if (getPixelHeight)
            this.getPixelHeight = getPixelHeight
    }

    createColumnBounds(list) {

        const colBounds = list.reduce((acc: TExtremum, cur: TExtremum) => {

            let bound = cur.shapesBond || cur.sector?.bound || cur.bound
            if (bound) {
                acc.maxX = Math.max(acc.maxX, bound.maxX)

                if (bound.minX > 0) {
                    acc.minX = Math.min(acc.minX, bound.minX);
                }

                acc.maxY = Math.max(acc.maxY, bound.maxY)
                acc.minY = acc.minY <= 0 ? bound.minY : bound.minY <= 0 ? Math.max(acc.minY, bound.minY) : Math.min(acc.minY, bound.minY)
            }

            return acc

        }, {maxX: -0, maxY: -0, minX: 0, minY: 0})

        return colBounds
    }

    getRandomPosition(sector, shape) {

        const bounds = this.getSectorBounds(sector)

        const margin = 0;
        let {width, height} = shape;
        const {isVerticalItem} = shape.data;

        const origX = shape.graphic.position.x
        const origY = shape.graphic.position.y

        if (isVerticalItem) {
            const y = bounds.y
            let maxX = bounds.x + bounds.width

            for (let i = 0; i < maxX - bounds.x - width; i++) {

                const x = this.convertToTen(bounds.x + (bounds.width - width) - i);

                shape.graphic.position.x = x;
                shape.graphic.position.y = y;

                if (
                    !sector.shapes.some(
                        (other) => other !== shape && shape.checkOverlap(other, isVerticalItem)
                    )
                ) {
                    shape.graphic.position.x = origX;
                    shape.graphic.position.y = origY;
                    return {x, y};
                }
            }
        } else {
            const x = bounds.x
            let maxY = bounds.y + bounds.height
            let minY = bounds.y

            if (shape.data?.data?.MIN_FASADE_SIZE) {
                let manufacturer_name = shape.data.data.EN_NAME?.toLowerCase() || shape.data.data.NAME?.toLowerCase()
                let manufacturerOffset
                if (shape.data.data.FASADE_DRAWER_OFFSET) {
                    manufacturerOffset = shape.data.data.FASADE_DRAWER_OFFSET
                } else
                    Object.entries(MANUFACTURER).forEach(([key, offset]) => {
                        if (manufacturer_name.includes(key)) {
                            manufacturer_name = key
                            manufacturerOffset = offset
                        }
                    })

                shape.data.fasade = {}
                shape.data.fasade.manufacturerOffset = manufacturerOffset
                shape.data.fasade.height = shape.data.data.MIN_FASADE_SIZE
                let moduleData = this.scope.UM_STORE.getUMGrid()

                height += this.getPixelHeight(manufacturerOffset - (moduleData.moduleThickness - 2))
                //maxY = maxY + this.getPixelHeight(manufacturerOffset - (moduleData.moduleThickness - 2))
                //minY = minY - this.getPixelHeight(moduleData.moduleThickness - 2)
            }

            let totalMax = this.getMmHeight(maxY - minY - height)
            for (let i = 0; i < totalMax; i++) {
                let pixel_i = this.getPixelHeight(i)
                const y = this.convertToTen(minY + (bounds.height - height) - pixel_i);

                shape.graphic.position.x = x;
                shape.graphic.position.y = y;

                if (
                    !sector.shapes.some(
                        (other) => other !== shape && shape.checkOverlap(other)
                    )
                ) {
                    shape.graphic.position.x = origX;
                    shape.graphic.position.y = origY;
                    return {x, y};
                }
            }
        }


        shape.graphic.position.x = origX;
        shape.graphic.position.y = origY;
        return null;
    }

    getClosestPosition(sector, data, inputPosition){

        if (!sector) {
            return false;
        }

        let tempShape = sector.shapes.find(item => (
            item.data?.sec === data.sec &&
            item.data?.cell === data.cell &&
            item.data?.row === data.row &&
            item.data?.extra === data.extra &&
            item.data?.id === data.id
        ))

        if (!tempShape) {
            return false;
        }

  /*      let tempShape = new Shape({
            type: data.type,
            sector,
            position: {x: 0, y: 0},
            data,
            getMmWidth: this.getMmWidth,
            getMmHeight: this.getMmHeight,
            getPixelWidth: this.getPixelWidth,
            getPixelHeight: this.getPixelHeight,
        });*/

        /** Проверяем на возможность размещения отверстия */

        let position = this.findClosestPosition(sector, tempShape, {x: this.getPixelWidth(inputPosition.x), y: this.getPixelHeight(inputPosition.y)});

        if (!position) {
            return false;
        }

        return {
            x: Math.round(this.getMmWidth(position.x)),
            y: Math.round(this.getMmHeight(position.y)),
        };
    }

    findClosestPosition(sector, shape, inputPosition) {

        const bounds = this.getSectorBounds(sector)

        const margin = 0;
        let {width, height} = shape;
        const {isVerticalItem} = shape.data;

        const origX = shape.graphic.position.x
        const origY = shape.graphic.position.y

        if (isVerticalItem) {
            const y = bounds.y
            let maxX = bounds.x + bounds.width

            for (let i = 0; i < maxX - bounds.x - width; i++) {

                const x = this.convertToTen(bounds.x + (bounds.width - width) - i);

                shape.graphic.position.x = x;
                shape.graphic.position.y = y;

                if (
                    !sector.shapes.some(
                        (other) => other !== shape && shape.checkOverlap(other, isVerticalItem)
                    )
                ) {
                    shape.graphic.position.x = origX;
                    shape.graphic.position.y = origY;
                    return {x, y};
                }
            }
        }
        else {
            const x = bounds.x

            let findTopMaxY = inputPosition.y
            let findTopMinY = bounds.y
            let topHeight = findTopMaxY - findTopMinY

            let findBottomMaxY = bounds.y + bounds.height
            let findBottomMinY = inputPosition.y
            let bottomStartY = findBottomMinY

            /*if (shape.data?.fasade) {
                let manufacturerOffset = shape.data.fasade.manufacturerOffset
                let moduleData = this.scope.UM_STORE.getUMGrid()

                findTopMaxY = findTopMaxY + this.getPixelHeight(manufacturerOffset - (moduleData.moduleThickness - 2))
                findTopMinY = findTopMinY - this.getPixelHeight(moduleData.moduleThickness - 2)

                findBottomMaxY = findBottomMaxY + this.getPixelHeight(manufacturerOffset - (moduleData.moduleThickness - 2))
                findBottomMinY = findBottomMinY + this.getPixelHeight(moduleData.moduleThickness - 2)
                bottomStartY = findBottomMinY + this.getPixelHeight(shape.data.fasade.height - shape.data.height - manufacturerOffset - (moduleData.moduleThickness - 2) * 2)
            }*/

            let findPositionTop = null
            let totalMax = this.getMmHeight(topHeight - height)
            for (let i = 0; i < totalMax; i++) {
                let pixel_i = this.getPixelHeight(i)
                const y = this.convertToTen(findTopMinY + (topHeight - height) - pixel_i);

                shape.graphic.position.x = x;
                shape.graphic.position.y = y;

                if (
                    !sector.shapes.some(
                        (other) => other !== shape && shape.checkOverlap(other)
                    )
                ) {
                    shape.graphic.position.x = origX;
                    shape.graphic.position.y = origY;
                    findPositionTop = {x, y}
                   break;
                }
            }

            let findPositionBottom = null
            totalMax = this.getMmHeight(findBottomMaxY - findBottomMinY - height)
            for (let i = 0; i < totalMax; i++) {
                let pixel_i = this.getPixelHeight(i)
                const y = this.convertToTen(bottomStartY + pixel_i);

                shape.graphic.position.x = x;
                shape.graphic.position.y = y;

                if (
                    !sector.shapes.some(
                        (other) => other !== shape && shape.checkOverlap(other)
                    )
                ) {
                    shape.graphic.position.x = origX;
                    shape.graphic.position.y = origY;
                    findPositionBottom = {x, y}
                    break;
                }
            }

            let topOffset = findPositionTop ? Math.abs(inputPosition.y - findPositionTop.y) : Infinity
            let bottomOffset = findPositionBottom ? Math.abs(inputPosition.y - findPositionBottom.y) : Infinity

            return topOffset > bottomOffset ? findPositionBottom : findPositionTop

        }

        shape.graphic.position.x = origX;
        shape.graphic.position.y = origY;
        return null;
    }

    checkToCollision(sector: Container, shapeType: string, shapeData: THoleData) {
        const shapes = sector.shapes;


        const tempShape = new Shape({
            type: shapeType,
            sector: sector,
            data: shapeData,
            position: {...shapeData.position},
            getMmWidth: this.getMmWidth,
            getMmHeight: this.getMmHeight,
            getPixelWidth: this.getPixelWidth,
            getPixelHeight: this.getPixelHeight,
        });

        const insideSector = tempShape.isPositionInsideSector(shapeData.position || {
            x: shapeData.x,
            y: shapeData.y,
        });


        const overLap = shapes.some(
            (otherShape) =>
                otherShape.graphic.holeId !== tempShape.graphic.holeId &&
                tempShape.checkOverlap(otherShape, tempShape.data.isVerticalItem)
        );

        return insideSector && !overLap;
    }

}

const saveUMGrid = (module) => {
    const garbage = ["sector", "shapesBond", "xOffset", "yOffset", "Mwidth", "Mheight"];
    const garbageFasades = ["sector", "shapesBond", "xOffset", "yOffset", "Mwidth", "Mheight"];
    const nesting = ["cells", "sections", "cellsRows", "extras", "fasades", "fillings", "loops", "fasadesDrawers", "hiTechProfiles"];

    //Рекурсивная очистка сетки от "технических" полей 2D конструктора
    const removeGarbage = (object) => {
        if (typeof object === "object" && !Array.isArray(object)) {

            let objectType = object.type || false
            object = Object.entries(object).map(([key, value]) => {

                if (nesting.includes(key)) {
                    value = value.slice().map(item => {
                        if (Array.isArray(item))
                            return item = item.slice().map(_item => {
                                return removeGarbage(_item)
                            })
                        else {
                            if (item.fasade)
                                item.fasade = removeGarbage(item.fasade)
                            return removeGarbage(item)
                        }
                    })
                }

                return [key, value]
            })

            if (objectType === "fasade")
                object = object.filter(([key, value]) => !garbageFasades.includes(key))
            else
                object = object.filter(([key, value]) => !garbage.includes(key))

            object.forEach(([key, value], index) => {
                if (key === "position") {
                    if (value.z)
                        object[index] = [key, new THREE.Vector3(value.x, value.y, value.z)];
                    else
                        object[index] = [key, new THREE.Vector2(value.x, value.y)];
                }
                if (key === "size") {
                    object[index] = [key, {...value}];
                }
            })

            object = Object.fromEntries(object)
        }

        return object;
    }

    let tmpClone = Object.assign({}, module)
    tmpClone = removeGarbage(tmpClone)

    return tmpClone;
};


export {Shape, ShapeAdjuster, Section, saveUMGrid}