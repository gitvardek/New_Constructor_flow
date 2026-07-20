
//@ts-nocheck
import { CUTTER_PARAMS } from "./CutterConst";
import { Application, Container, Graphics, Text, TextStyle, GraphicsPath } from "pixi.js";

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

type TExtremum = { maxX: number, maxY: number, minX: number, minY: number }


class Helpers {

  maxAreaHeight: number;
  step: number = 1;
  minSize: number = 10;

  constructor() {


    this.maxAreaHeight = CUTTER_PARAMS.TOTAL_HEIGHT * CUTTER_PARAMS.MAX_AREA_WIDTH / CUTTER_PARAMS.TOTAL_LENGTH
  }

  setStep(value: number) {
    this.step = value
  }

  getPixelWidth(mmWidth: number) {
    return (mmWidth / CUTTER_PARAMS.TOTAL_LENGTH) * CUTTER_PARAMS.MAX_AREA_WIDTH;
  };

  getPixelHeight(mmHeight: number) {
    // return Math.floor((mmHeight / TOTAL_HEIGHT) * getMaxAreaHeight.value);
    return (mmHeight / CUTTER_PARAMS.TOTAL_HEIGHT) * this.maxAreaHeight;
  };

  getMmWidth(pxWidth: number) {
    return (pxWidth / CUTTER_PARAMS.MAX_AREA_WIDTH) * CUTTER_PARAMS.TOTAL_LENGTH;
  };

  getMmHeight(pxHeight: number) {
    return (pxHeight / this.maxAreaHeight) * CUTTER_PARAMS.TOTAL_HEIGHT;
  };

  convertToTen(value) {

    if (value < 0) return 0

    return Math.round(value / this.step) * this.step;

  }

  preparePathToThree(path) {
    // const clone = path.map(item => item)

    const clone = path.map(item => {
      if (item.action !== "closePath" && item.data && item.data.length > 0) {
        return {
          ...item,
          data: item.data.map(num => this.getMmWidth(num))
        };
      }
      return item;
    });

    return clone
  }

  getSectorBounds(sector: Container) {


    const bounds = sector.getBounds()

    return {
      x: sector.x,
      y: sector.y,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY

    }
  }

  getTotalBounds(sector: Container, row) {

    const shapes = sector.shapes;
    const roundCut = row.roundCut.graphic

    if (shapes.length === 0 && !roundCut) {
      return { maxX: 0, maxY: 0, minX: 0, minY: 0 }; // или другое значение по умолчанию
    }


    let maxX = -Infinity;
    let maxY = -Infinity;
    let minX = Infinity;
    let minY = Infinity;


    if (roundCut) {
      const bounds = roundCut.getBounds();
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
    }
    else {
      for (const shape of shapes) {
        const bounds = shape.graphic.getBounds();
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
      }
    }


    return { maxX, maxY, minX, minY };

  }

  getRightSectionWidth(sector, minX) {

    if (minX < CUTTER_PARAMS.PART_MIN_SIZE) return CUTTER_PARAMS.PART_MIN_SIZE

    const sBounds = sector.getBounds()
    const sMax = this.convertToTen(this.getMmWidth(sBounds.maxX))
    return sMax - minX + CUTTER_PARAMS.SECTOR_PADDING

  }

  getLeftSectionWidth(sector, maxX) {

    if (maxX < CUTTER_PARAMS.PART_MIN_SIZE) return CUTTER_PARAMS.PART_MIN_SIZE

    const sBounds = sector.getBounds()
    const sMin = this.convertToTen(this.getMmWidth(sBounds.minX))
    return maxX - sMin + CUTTER_PARAMS.SECTOR_PADDING
  }

  getSectionTop(sector, maxY) {

    if (maxY < CUTTER_PARAMS.PART_MIN_SIZE) return CUTTER_PARAMS.PART_MIN_SIZE
    const sBounds = sector.getBounds()
    const sMin = this.convertToTen(this.getMmWidth(sBounds.minY))
    return maxY - sMin + CUTTER_PARAMS.SECTOR_PADDING
  }

  getSectionBottom(sector, minY) {

    if (minY < CUTTER_PARAMS.PART_MIN_SIZE) return CUTTER_PARAMS.PART_MIN_SIZE
    const sBounds = sector.getBounds()
    const sMax = this.convertToTen(this.getMmWidth(sBounds.maxY))
    return sMax - minY + CUTTER_PARAMS.SECTOR_PADDING
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

    graphics.stroke({ width: 1, color: '#5D6069' }); // Завершаем отрисовку линии

    return graphics

  };
}

class Shape extends Helpers {
  select: () => void
  render: () => void
  type: string
  sectorBounds: TBounds
  graphic: Graphics
  width: number = 0
  height: number = 0
  radius: number = 0
  shapes: Shape[]
  data: THoleData
  sector: Container
  dementionContainer: Container

  private distanceGraphics: Graphics | null = null; // Для хранения линий расстояний
  private distanceLabels: Text[] = []; // Для хранения текстовых меток
  private readonly padding: number = this.getPixelWidth(CUTTER_PARAMS.SECTOR_PADDING); // Отступ от краев сектора в пикселях


  constructor({ type, sector, position, data, select, render, dementionContainer }:
    { type: string, sector: Container, position?: { x: number, y: number }, data: THoleData, select?: () => void, render?: () => void, dementionContainer?: Container }) {
    super()

    this.sector = sector

    this.type = type;
    this.sectorBounds = this.getSectorBounds(sector);
    this.graphic = new Graphics();
    this.shapes = sector.shapes
    this.data = data
    this.select = select
    this.render = render

    this.dementionContainer = dementionContainer

    this.graphic.data = data
    this.graphic.holeId = data.holeId

    // Инициализация графики в зависимости от типа
    if (type === "circle") {
      this.radius = this.getPixelWidth(data.radius * 0.5);
      this.graphic.circle(0, 0, this.radius);
      this.graphic.fill("#ffffff");
      this.graphic.stroke({ width: 1, color: "#A3A9B5", alignment: 1 });
    } else if (type === "rect") { // rectangle
      this.width = this.getPixelWidth(data.width);
      this.height = this.getPixelHeight(data.height);

      this.graphic.rect(0, 0, this.getPixelWidth(data.width), this.getPixelHeight(data.height))
      this.graphic.fill("#ffffff")
      this.graphic.stroke({ width: 1, color: "#A3A9B5", alignment: 1 });

    }
    else {
      this.radius = this.getPixelWidth(data.radius * 0.5);
      this.graphic.circle(0, 0, this.radius);
      this.graphic.fill('#d2d0d7');
      this.graphic.stroke({ width: 1, color: "#A3A9B5", alignment: 1 });
    }

    if (position) {
      this.graphic.position.x = this.getPixelWidth(position.x);
      this.graphic.position.y = this.getPixelWidth(position.y);
    } else {
      this.graphic.position.x = this.getPixelWidth(data.x);
      this.graphic.position.y = this.getPixelWidth(data.y);
    }

    // Настройка позиции


    // Настройка интерактивности
    this.graphic.eventMode = "static";
    this.graphic.cursor = "grab";

    // Сохраняем ссылку на класс в графическом объекте
    this.graphic.shapeInstance = this;

    // Настройка перетаскивания
    this.setupDraggable();
  }

  // Настройка перетаскивания
  setupDraggable() {
    let dragging = false;
    let dragOffset = { x: 0, y: 0 };
    let originalPosition = { x: 0, y: 0 };
    const self = this;

    this.graphic.on("pointerdown", (event) => {
      this.graphic.cursor = "grabbing";
      this.select(this.sector.colNdx, this.sector.rowNdx)
      dragging = true;
      originalPosition = {
        x: self.graphic.position.x,
        y: self.graphic.position.y
      };
      dragOffset = {
        x: self.graphic.position.x - event.global.x,
        y: self.graphic.position.y - event.global.y,
      };
      self.graphic.alpha = 0.7;
    });

    this.graphic.on("pointermove", (event) => {
      if (dragging) {
        // Вычисляем новые позиции
        const newX = event.global.x + dragOffset.x;
        const newY = event.global.y + dragOffset.y;

        // Ограничиваем позицию границами сектора с учетом отступа
        let adjustedX = newX;
        let adjustedY = newY;

        // Ограничения по X
        if (self.type === "rect") {
          adjustedX = Math.max(
            this.sectorBounds.x + this.padding,
            Math.min(newX, this.sectorBounds.x + this.sectorBounds.width - self.width - this.padding)
          );
        } else {
          adjustedX = Math.max(
            this.sectorBounds.x + self.radius + this.padding,
            Math.min(newX, this.sectorBounds.x + this.sectorBounds.width - self.radius - this.padding)
          );
        }

        // Ограничения по Y
        if (self.type === "rect") {
          adjustedY = Math.max(
            this.sectorBounds.y + this.padding,
            Math.min(newY, this.sectorBounds.y + this.sectorBounds.height - self.height - this.padding)
          );
        } else {
          adjustedY = Math.max(
            this.sectorBounds.y + self.radius + this.padding,
            Math.min(newY, this.sectorBounds.y + this.sectorBounds.height - self.radius - this.padding)
          );
        }

        // Сохраняем текущую позицию для восстановления в случае коллизии
        const currentX = self.graphic.position.x;
        const currentY = self.graphic.position.y;

        // Пробуем движение по X
        self.graphic.position.x = adjustedX;
        let hasCollisionX = false;

        for (const otherShape of this.shapes) {
          if (self !== otherShape && self.checkOverlap(otherShape)) {
            hasCollisionX = true;
            break;
          }
        }

        if (hasCollisionX) {
          self.graphic.position.x = currentX;
        }

        // Пробуем движение по Y
        self.graphic.position.y = adjustedY;
        let hasCollisionY = false;

        for (const otherShape of this.shapes) {
          if (self !== otherShape && self.checkOverlap(otherShape)) {
            hasCollisionY = true;
            break;
          }
        }

        if (hasCollisionY) {
          self.graphic.position.y = currentY;
        }

        if (this.type !== "circleSector") {
          this.drawBoundaryDistances();
        }
      }
    });

    const endDrag = () => {
      if (dragging) {
        dragging = false;
        self.graphic.alpha = 1;

        if (this.type === 'rect') {
          this.data.Mwidth = 600;
          this.data.Mheight = 600;
        }
        if (this.type === 'circle') {
          this.data.Mradius = 600;
        }

        this.data.x = Math.round(this.getMmWidth(self.graphic.position.x));
        this.data.y = Math.round(this.getMmWidth(self.graphic.position.y));

        this.render();
      }
    };

    this.graphic.on("pointerup", endDrag);
    this.graphic.on("pointerupoutside", endDrag);
  }

  // Проверка перекрытия с другой фигурой
  checkOverlap(otherShape: Shape) {

    if (this === otherShape) return false;

    if (this.type === "circle" && otherShape.type === "circle" || this.type === "circleSector" && otherShape.type === "circleSector") {
      // Расстояние между центрами
      const dx = this.graphic.position.x - otherShape.graphic.position.x;
      const dy = this.graphic.position.y - otherShape.graphic.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < this.radius + otherShape.radius;
    } else if (this.type === "rect" && otherShape.type === "rect") {
      // Проверка наложения прямоугольников
      return !(
        this.graphic.position.x + this.width < otherShape.graphic.position.x ||
        this.graphic.position.x > otherShape.graphic.position.x + otherShape.width ||
        this.graphic.position.y + this.height < otherShape.graphic.position.y ||
        this.graphic.position.y > otherShape.graphic.position.y + otherShape.height
      );
    } else {
      // Круг и прямоугольник
      let circle, rect;
      if (this.type === "circle" || this.type === "circleSector") {
        circle = this;
        rect = otherShape;
      } else {
        circle = otherShape;
        rect = this;
      }

      // Ближайшая к кругу точка на прямоугольнике
      const closestX = Math.max(
        rect.graphic.position.x,
        Math.min(circle.graphic.position.x, rect.graphic.position.x + rect.width)
      );
      const closestY = Math.max(
        rect.graphic.position.y,
        Math.min(circle.graphic.position.y, rect.graphic.position.y + rect.height)
      );

      // Расстояние от центра круга до ближайшей точки
      const dx = closestX - circle.graphic.position.x;
      const dy = closestY - circle.graphic.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance < circle.radius;
    }
  }

  // Проверка, находится ли указанная позиция внутри сектора
  isPositionInsideSector(position: { x: number, y: number }) {
    const pxPos = {
      x: this.getPixelWidth(position.x),
      y: this.getPixelHeight(position.y)
    };

    if (this.type === "rect") {
      return (
        pxPos.x >= this.sectorBounds.x + this.padding &&
        pxPos.x + this.width <= this.sectorBounds.x + this.sectorBounds.width - this.padding &&
        pxPos.y >= this.sectorBounds.y + this.padding &&
        pxPos.y + this.height <= this.sectorBounds.y + this.sectorBounds.height - this.padding
      );
    } else {
      return (
        pxPos.x - this.radius >= this.sectorBounds.x + this.padding &&
        pxPos.x + this.radius <= this.sectorBounds.x + this.sectorBounds.width - this.padding &&
        pxPos.y - this.radius >= this.sectorBounds.y + this.padding &&
        pxPos.y + this.radius <= this.sectorBounds.y + this.sectorBounds.height - this.padding
      );
    }
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

    if (this.type === "rect") {
      distances.left = this.graphic.position.x - this.sectorBounds.x;
      distances.right = this.sectorBounds.x + this.sectorBounds.width - (this.graphic.position.x + this.width);
      distances.top = this.graphic.position.y - this.sectorBounds.y;
      distances.bottom = this.sectorBounds.y + this.sectorBounds.height - (this.graphic.position.y + this.height);
    } else {
      distances.left = this.graphic.position.x - this.radius - this.sectorBounds.x;
      distances.right = this.sectorBounds.x + this.sectorBounds.width - (this.graphic.position.x + this.radius);
      distances.top = this.graphic.position.y - this.radius - this.sectorBounds.y;
      distances.bottom = this.sectorBounds.y + this.sectorBounds.height - (this.graphic.position.y + this.radius);
    }

    // Отрисовка для левой границы
    if (distances.left > 0) {
      const startX = this.type === "rect" ? this.graphic.position.x : this.graphic.position.x - this.radius;
      const startY = this.type === "rect" ? this.graphic.position.y + this.height / 2 : this.graphic.position.y;
      const endX = this.sectorBounds.x;
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
      const leftText = new Text({ text: `${Math.round(this.getMmWidth(distances.left))} mm`, style: textStyle });
      leftText.position.set(
        this.sectorBounds.x + distances.left / 2,
        startY - 15
      );
      this.dementionContainer.addChild(leftText);
      this.distanceLabels.push(leftText);
    }

    // Отрисовка для правой границы
    if (distances.right > 0) {
      const startX = this.type === "rect" ? this.graphic.position.x + this.width : this.graphic.position.x + this.radius;
      const startY = this.type === "rect" ? this.graphic.position.y + this.height / 2 : this.graphic.position.y;
      const endX = this.sectorBounds.x + this.sectorBounds.width;
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
      const rightText = new Text({ text: `${Math.round(this.getMmWidth(distances.right))} mm`, style: textStyle });
      rightText.position.set(
        startX + distances.right / 2,
        startY - 15
      );
      this.dementionContainer.addChild(rightText);
      this.distanceLabels.push(rightText);
    }

    // Отрисовка для верхней границы
    if (distances.top > 0) {
      const startX = this.type === "rect" ? this.graphic.position.x + this.width / 2 : this.graphic.position.x;
      const startY = this.type === "rect" ? this.graphic.position.y : this.graphic.position.y - this.radius;
      const endX = startX;
      const endY = this.sectorBounds.y;
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
      const topText = new Text({ text: `${Math.round(this.getMmWidth(distances.top))} mm`, style: textStyle });
      topText.position.set(
        startX + 5,
        this.sectorBounds.y + distances.top / 2
      );
      this.dementionContainer.addChild(topText);
      this.distanceLabels.push(topText);
    }

    // Отрисовка для нижней границы
    if (distances.bottom > 0) {
      const startX = this.type === "rect" ? this.graphic.position.x + this.width / 2 : this.graphic.position.x;
      const startY = this.type === "rect" ? this.graphic.position.y + this.height : this.graphic.position.y + this.radius;
      const endX = startX;
      const endY = this.sectorBounds.y + this.sectorBounds.height;
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

      const bottomText = new Text({ text: `${Math.round(this.getMmWidth(distances.bottom))} mm`, style: textStyle });
      bottomText.position.set(
        startX + 5,
        startY + distances.bottom / 2
      );
      this.dementionContainer.addChild(bottomText);
      this.distanceLabels.push(bottomText);
    }

    this.dementionContainer.addChild(graphics);

    // Добавляем данные для отображения в компоненте VUE @CutOptions.vue

    this.data.distances = {
      left: Math.round(this.getMmWidth(distances.left)),
      right: Math.round(this.getMmWidth(distances.right)),
      top: Math.round(this.getMmWidth(distances.top)),
      bottom: Math.round(this.getMmWidth(distances.bottom)),
    }

  }

}

class Section extends Helpers {
  cellGraphics: Graphics = new Graphics();
  highlightGraphics: Graphics = new Graphics();
  width: number = 0;
  height: number = 0;
  radiusEuro: number = 50;
  radiusLarge: number = 50;
  data: any;
  sector: Container;

  constructor(data: any, width: number, height: number, sector: Container) {
    super();
    this.data = data;
    this.width = width;
    this.height = height;
    this.sector = sector;

    this.createSection();
  }

  createSection() {
    const data = this.getServiseData();
    this.createFormSection(data);
  }

  // getServiseData() {
  //   // console.log(this.data, 'this.data')

  //   // Сбрасываем ошибки
  //   this.data.serviseData.forEach(el => {
  //     el.error = false;
  //   });

  //   const data = this.data.serviseData.filter(elem => elem.value === true);

  //   console.log(this.data.serviseData, 'data')

  //   const handlers: Record<number, (acc: any, el: any) => void> = {
  //     // bottomLeft
  //     201640: (acc, el) => acc.bottomLeft = { type: 'rounded', radius: this.getPixelWidth(el.RADIUS), el },
  //     247670: (acc, el) => acc.bottomLeft = { type: 'rounded', radius: this.getPixelWidth(el.RADIUS), el },
  //     201638: (acc, el) => acc.bottomLeft = { type: 'corner', corner: this.getPixelWidth(el.CORNER), el },
  //     247672: (acc, el) => acc.bottomLeft = { type: 'inward', radius: this.getPixelWidth(el.RADIUS), width: this.getPixelWidth(el.EURO_WIDTH), el },

  //     // bottomRight
  //     201641: (acc, el) => acc.bottomRight = { type: 'rounded', radius: this.getPixelWidth(el.RADIUS), el },
  //     247669: (acc, el) => acc.bottomRight = { type: 'rounded', radius: this.getPixelWidth(el.RADIUS), el },
  //     201639: (acc, el) => acc.bottomRight = { type: 'corner', corner: this.getPixelWidth(el.CORNER), el },
  //     247671: (acc, el) => acc.bottomRight = { type: 'inward', radius: this.getPixelWidth(el.RADIUS), width: this.getPixelWidth(el.EURO_WIDTH), el },

  //     // topLeft
  //     201640_2: (acc, el) => acc.topLeft = { type: 'rounded', radius: this.getPixelWidth(el.RADIUS), el },
  //     247670_2: (acc, el) => acc.topLeft = { type: 'rounded', radius: this.getPixelWidth(el.RADIUS), el },
  //     201638_2: (acc, el) => acc.topLeft = { type: 'corner', corner: this.getPixelWidth(el.CORNER), el },
  //     247672_2: (acc, el) => acc.topLeft = { type: 'inward', radius: this.getPixelWidth(el.RADIUS), width: this.getPixelWidth(el.EURO_WIDTH), el },

  //     // topRight
  //     201641_2: (acc, el) => acc.topRight = { type: 'rounded', radius: this.getPixelWidth(el.RADIUS), el },
  //     247669_2: (acc, el) => acc.topRight = { type: 'rounded', radius: this.getPixelWidth(el.RADIUS), el },
  //     201639_2: (acc, el) => acc.topRight = { type: 'corner', corner: this.getPixelWidth(el.CORNER), el },
  //     247671_2: (acc, el) => acc.topRight = { type: 'inward', radius: this.getPixelWidth(el.RADIUS), width: this.getPixelWidth(el.EURO_WIDTH), el },

  //     // спецкейсы
  //     616287_2: (acc, el) => {
  //       const r = this.height * 0.4999;
  //       acc.topLeft = { type: 'rounded', radius: r, el };
  //       acc.bottomLeft = { type: 'rounded', radius: r, el };
  //     },
  //     616287: (acc, el) => {
  //       const r = this.height * 0.4999;
  //       acc.topRight = { type: 'rounded', radius: r, el };
  //       acc.bottomRight = { type: 'rounded', radius: r, el };
  //     },
  //   };

  //   const remaster = data.reduce((acc, el) => {
  //          console.log(handlers[el.ID], ' === handler ===')

  //     const handler = handlers[el.ID];


  //     if (handler) handler(acc, el);
  //     return acc;
  //   }, {} as Record<string, any>);

  //   console.log(remaster, 'remaster')

  //   return remaster;
  // }

  getServiseData() {
    // Сбрасываем ошибки
    this.data.serviseData.forEach(el => el.error = false);

    const active = this.data.serviseData.filter(el => el.value === true);
    const result = {
      bottomLeft: null,
      bottomRight: null,
      topLeft: null,
      topRight: null,
    };

    // Разрешённые группы — только эти 6, и ничего больше!
    const ALLOWED_GROUPS = new Set([
      'left_bottom',
      'right_bottom',
      'left_top',
      'right_top',
      'left_full',
      'right_full'
    ]);

    // Вспомогательная функция — определяет тип обработки
    const getProcessing = (el: any) => {
      if (el.RADIUS && el.EURO_WIDTH) {
        return {
          type: 'inward',
          radius: this.getPixelWidth(el.RADIUS),
          width: this.getPixelWidth(el.EURO_WIDTH)
        };
      }
      if (el.RADIUS) {
        return { type: 'rounded', radius: this.getPixelWidth(el.RADIUS) };
      }
      if (el.CORNER) {
        return { type: 'corner', corner: this.getPixelWidth(el.CORNER) };
      }
      return { type: 'simple' };
    };

    active.forEach(el => {
      const group = el.NEW_CONSTRUCTOR_GROUP;

      if (!group || group === false) return;

      const groups = Array.isArray(group) ? group : [group];

      // Ключевое правило:
      // Если в массиве есть хоть одна НЕразрешённая группа — пропускаем всю услугу целиком
      const hasForbiddenGroup = groups.some(group => !ALLOWED_GROUPS.has(group));
      if (hasForbiddenGroup) return;

      // Теперь ищем, есть ли среди разрешённых групп нужная нам
      const targetGroup = groups.find(group => ALLOWED_GROUPS.has(group));
      if (!targetGroup) return;

      const isLeft = targetGroup.includes('left');
      const isRight = targetGroup.includes('right');
      const isTop = targetGroup.includes('top');
      const isFull = targetGroup.includes('full');

      const side = isLeft ? 'Left' : isRight ? 'Right' : null;
      if (!side) return;

      if (isFull) {
        // Барная стойка — полный торец
        const radius = this.height * 0.4999;
        const payload = { type: 'rounded', radius, el };

        if (isLeft) {
          result.topLeft = payload;
          result.bottomLeft = payload;
        } else {
          result.topRight = payload;
          result.bottomRight = payload;
        }
      } else {
        // Обычный угол
        const level = isTop ? 'top' : 'bottom';
        const key = `${level}${side}` as keyof typeof result;

        const processing = getProcessing(el);
        result[key] = { ...processing, el };
      }
    });

    return result;
  }

  createFormSection(data) {
    let bottomLeft = data.bottomLeft ?? { type: 'none' };
    let bottomRight = data.bottomRight ?? { type: 'none' };
    let topLeft = data.topLeft ?? { type: 'none' };
    let topRight = data.topRight ?? { type: 'none' };
    let defCellColor = '#d2d0d7';
    let deffHighlightColor = '#ECEBF1';

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
    this.cellGraphics.path(cellPath).fill(defCellColor);
    this.highlightGraphics.path(highlightPath).fill(deffHighlightColor);
    const instructions = cellPath.instructions
    this.cellGraphics.cellPath = this.preparePathToThree(instructions)


    // Отрисовываем размеры
    this.drawDimensions(this.cellGraphics, topRight, topLeft, bottomRight, bottomLeft);
    this.drawDimensions(this.highlightGraphics, topRight, topLeft, bottomRight, bottomLeft);
  }

  createPath(topRight, topLeft, bottomRight, bottomLeft): GraphicsPath {
    const elems = [topLeft, topRight, bottomLeft, bottomRight];
    const path = new GraphicsPath();
    const x = 0, y = 0;
    const validValue = this.getValidValue({
      topLeft, topRight, bottomLeft, bottomRight,
      sectionWidth: this.width,
      sectionHeight: this.height,
    });

    const {
      tl_width, tr_width, bl_width, br_width,
      tl_radius, tr_radius, bl_radius, br_radius,
      tl_corner, tr_corner, bl_corner, br_corner,
      error
    } = validValue;

    const W = this.width;
    const H = this.height;

    const cornerDefs = [
      // верхний левый (start)
      {
        item: topLeft,
        fn: () => {
          if (topLeft.type === 'rounded') {
            path.moveTo(x, y + tl_radius);
            path.lineTo(x, y + tl_radius);
            path.quadraticCurveTo(x, y, x + tl_radius, y);
          } else if (topLeft.type === 'corner') {
            path.moveTo(x, y + tl_corner);
            path.lineTo(x + tl_corner, y);
          } else if (topLeft.type === 'inward') {
            path.moveTo(x, y + tl_radius);
            path.lineTo(x + tl_width - tl_radius, y + tl_radius);
            path.quadraticCurveTo(x + tl_width, y + tl_radius, x + tl_width, y);
            path.lineTo(x + tl_width, y);
          } else {
            path.moveTo(x, y);
          }
        }
      },
      // верхний правый
      {
        item: topRight,
        fn: () => {
          if (topRight.type === 'rounded') {
            path.lineTo(x + W - tr_radius, y);
            path.quadraticCurveTo(x + W, y, x + W, y + tr_radius);
          } else if (topRight.type === 'corner') {
            path.lineTo(x + W - tr_corner, y);
            path.lineTo(x + W, y + tr_corner);
          } else if (topRight.type === 'inward') {
            path.lineTo(x + W - tr_width, y);
            path.quadraticCurveTo(x + W - tr_width, y + tr_radius, x + W - (tr_width - tr_radius), y + tr_radius);
            path.lineTo(x + W, y + tr_radius);
          } else {
            path.lineTo(x + W, y);
          }
        }
      },
      // нижний правый
      {
        item: bottomRight,
        fn: () => {
          if (bottomRight.type === 'rounded') {
            path.lineTo(x + W, y + H - br_radius);
            path.lineTo(x + W, y + H - br_radius);
            path.quadraticCurveTo(x + W, y + H, x + W - br_radius, y + H);
          } else if (bottomRight.type === 'corner') {
            path.lineTo(x + W, y + H - br_corner);
            path.lineTo(x + W - br_corner, y + H);
          } else if (bottomRight.type === 'inward') {
            path.lineTo(x + W, y + H - br_radius);
            path.lineTo(x + W - (br_width - br_radius), y + H - br_radius);
            path.quadraticCurveTo(x + W - br_width, y + H - br_radius, x + W - br_width, y + H);
            path.lineTo(x + W - br_width, y + H);
          } else {
            path.lineTo(x + W, y + H);
          }
        }
      },
      // нижний левый
      {
        item: bottomLeft,
        fn: () => {
          if (bottomLeft.type === 'rounded') {
            path.lineTo(x + bl_radius, y + H);
            path.lineTo(x + bl_radius, y + H);
            path.quadraticCurveTo(x, y + H, x, y + H - bl_radius);
          } else if (bottomLeft.type === 'corner') {
            path.lineTo(x + bl_corner, y + H);
            path.lineTo(x, y + H - bl_corner);
          } else if (bottomLeft.type === 'inward') {
            path.lineTo(x + bl_width, y + H);
            path.lineTo(x + bl_width, y + H);
            path.quadraticCurveTo(x + bl_width, y + H - bl_radius, x + (bl_width - bl_radius), y + H - bl_radius);
            path.lineTo(x, y + H - bl_radius);
          } else {
            path.lineTo(x, y + H);
          }
        }
      }
    ];

    // Выполнить в том же порядке, что и оригинал
    cornerDefs.forEach(d => d.fn());

    path.closePath();
    path.error = error;

    elems.forEach(item => {
      if (item.el) item.el.error = error;
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
      fill: '#5D6069',
    });

    // Метка ширины (по центру сверху)
    const widthText = new Text({ text: `${this.data.width} мм`, style: textStyle });
    widthText.anchor.set(0.5, 0); // Центрируем по горизонтали, привязка к верхнему краю
    widthText.x = x + this.width / 2;
    widthText.y = y + 5; // Смещаем вниз на 10 пикселей от верхней границы
    graphics.addChild(widthText);

    // Метка высоты (по центру справа)
    const heightText = new Text({ text: `${this.data.height} мм`, style: textStyle });
    heightText.anchor.set(1, 0.5); // Привязка к правому краю, центрируем по вертикали
    heightText.rotation = -Math.PI / 2; // Поворот на 90 градусов против часовой
    heightText.x = x + this.width - 10; // Смещаем влево на 10 пикселей от правой границы
    heightText.y = y + this.height / 2 - 20;
    graphics.addChild(heightText);

    // Дополнительные метки для углов (если нужно)
    // Например, радиусы или углы для topLeft и topRight
  }

}

class ShapeAdjuster extends Helpers {
  maxIterations: number = 500
  maxPositionAttempts: number = 250
  constructor() {
    super()
  }

  createColumnBounds(sections, colNdx) {

    const totalCol = sections.filter(el => el.colNdx == colNdx)

    const colBounds = totalCol.reduce((acc: TExtremum, cur: TExtremum) => {

      if (cur.bound) {
        acc.maxX = Math.max(acc.maxX, cur.bound.maxX)

        if (cur.bound.minX > 0) {
          acc.minX = Math.min(acc.minX, cur.bound.minX);
        }

        acc.maxY = Math.max(acc.maxY, cur.bound.maxY)
        acc.minY = acc.minY <= 0 ? cur.bound.minY : Math.min(acc.minY, cur.bound.minY)
        return acc
      }

    }, { maxX: -Infinity, maxY: -Infinity, minX: Infinity, minY: Infinity })

    return colBounds
  }


  getRandomPosition(sector, shape) {

    const bounds = this.getSectorBounds(sector)
    const padding = this.getPixelWidth(CUTTER_PARAMS.SECTOR_PADDING)

    const isCircle = shape.type === "circle";
    const margin = isCircle ? shape.radius : 0;

    const width = isCircle ? (shape.radius) * 2 : shape.width
    const height = isCircle ? (shape.radius) * 2 : shape.height;


    const origX = shape.graphic.position.x
    const origY = shape.graphic.position.y

    for (let i = 0; i < this.maxPositionAttempts; i++) {

      const x = this.convertToTen(bounds.x + padding + margin + Math.random() * (bounds.width - padding * 2 - width));
      const y = this.convertToTen(bounds.y + padding + margin + Math.random() * (bounds.height - padding * 2 - height));

      shape.graphic.position.x = x;
      shape.graphic.position.y = y;

      if (
        !sector.shapes.some(
          (other) => other !== shape && shape.checkOverlap(other)
        )
      ) {
        shape.graphic.position.x = origX;
        shape.graphic.position.y = origY;
        return { x, y };
      }
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
    });

    const insideSector = tempShape.isPositionInsideSector({
      x: shapeData.x,
      y: shapeData.y,
    });


    const overLap = shapes.some(
      (otherShape) =>
        otherShape.graphic.holeId !== tempShape.graphic.holeId &&
        tempShape.checkOverlap(otherShape)
    );

    return insideSector && !overLap;


  }

}



export { Shape, ShapeAdjuster, Section }