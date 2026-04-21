//@ts-nocheck
import * as PIXI from 'pixi.js';
// import { MathUtils } from "three";

import {
  Vector2,
} from "@/types/constructor2d/interfaсes";

import {
  Config,
  State
} from "./interfaces";

import {
  drawCircle,
  rectV2,
} from "./../../utils/Shape";

import {
  adjustSegmentLength,
  isPointNearLine,
  findSegmentIntersection,
  getDistanceBetweenVectors,
} from "./../../utils/Math";

import { handlerMouseLeftDown } from "./methods/events/handlerMouseLeftDown/index";
import { handlerMouseOver } from "./methods/events/handlerMouseOver/index";
import { handlerMouseOut } from "./methods/events/handlerMouseOut/index";
import { handlerMouseMove } from "./methods/events/handlerMouseMove/index";
import { handlerMouseUp } from "./methods/events/handlerMouseUp/index";
import { handlerCanvasMouseLeave } from "./methods/events/handlerCanvasMouseLeave/index";

import { drawAngleBetweenWalls } from "./methods/drawAngleBetweenWalls/index";

export default class StartPointActiveObject {

  private app: PIXI.Application;
  private parent: any;
  private container: PIXI.Container;

  private circleStartPoint: PIXI.Graphics;
  private circleEndPoint: PIXI.Graphics;

  private startPointRect: PIXI.Graphics;
  private endPointRect: PIXI.Graphics;

  private angleBetweenWalls: PIXI.Graphics; // линия арки между стенами
  private angleText: PIXI.Text; // текст отображающий угол
  private angleTextConatainer: PIXI.Container; // контейнер, в который будет добавлен текст, цель контейнера в поцизионировании на холсте
  private circleAngleMask: PIXI.Graphics; // маска окружность, чтобы вычасть из линии арки для отображения текста

  private handlerMouseLeftDown: (e: PIXI.FederatedPointerEvent) => void;
  private handlerMouseOver: (e: PIXI.FederatedPointerEvent) => void;
  private handlerMouseOut: (e: PIXI.FederatedPointerEvent) => void;
  private handlerMouseMove: (e: PIXI.FederatedPointerEvent) => void;
  private handlerMouseUp: (e: PIXI.FederatedPointerEvent) => void;
  private handlerCanvasMouseLeave: (e: MouseEvent) => void;

  public drawAngleBetweenWalls: () => void;

  private config: Config = {

    fontSize: 15,
    colorText: 0x5D6069,
    colorRect: 0xDA444C,
    colorCircle: 0x4285F4,
    colorAngleArc: 0x131313,

  };

  public state: State = {

    downActivePointerPosition: { x: 0, y: 0 },

  };

  constructor(pixiApp: PIXI.Application, parent: any) {

    if (!pixiApp) throw new Error("PIXI.Application instance is required");

    this.app = pixiApp;
    this.parent = parent;
    this.container = new PIXI.Container();
    this.container.x = 30;
    this.container.y = 30;
    this.app.stage.addChild(this.container);

    this.startPointRect = new PIXI.Graphics();
    this.container.addChild(this.startPointRect);
    this.endPointRect = new PIXI.Graphics();
    this.container.addChild(this.endPointRect);

    this.circleStartPoint = new PIXI.Graphics();
    (this.circleStartPoint as PIXI.Graphics & { indexPoint: number }).indexPoint = 0;
    this.circleStartPoint.eventMode = 'static';
    this.container.addChild(this.circleStartPoint);

    this.circleEndPoint = new PIXI.Graphics();
    (this.circleEndPoint as PIXI.Graphics & { indexPoint: number }).indexPoint = 1;
    this.circleEndPoint.eventMode = 'static';
    this.container.addChild(this.circleEndPoint);

    this.angleBetweenWalls = new PIXI.Graphics();
    this.container.addChild(this.angleBetweenWalls);
    this.circleAngleMask = new PIXI.Graphics();
    this.container.addChild(this.circleAngleMask);
    this.angleText = new PIXI.Text({
      text: "",
      style: {
        fontSize: this.config.fontSize,
        fill: this.config.colorText
      }
    });
    this.angleTextConatainer = new PIXI.Container();
    this.angleTextConatainer.addChild(this.angleText);
    this.container.addChild(this.angleTextConatainer);

    this.handlerMouseLeftDown = handlerMouseLeftDown.bind(this);
    this.handlerMouseOver = handlerMouseOver.bind(this);
    this.handlerMouseOut = handlerMouseOut.bind(this);
    this.handlerMouseMove = handlerMouseMove.bind(this);
    this.handlerMouseUp = handlerMouseUp.bind(this);
    this.handlerCanvasMouseLeave = handlerCanvasMouseLeave.bind(this);

    this.drawAngleBetweenWalls = drawAngleBetweenWalls.bind(this);

    // рисуем графику
    this.initGraphic();

    this.setupInteractions();

  }

  private initGraphic(): void {

    { // start point

      rectV2(
        this.startPointRect,
        {
          center: { x: 0, y: 0 },
          width: 10,
          height: 10,
          lineColor: this.config.colorRect, // Цвет обводки (по умолчанию чёрный)
          lineWidth: 1, // Толщина линии обводки
          angleDegrees: 0
        }
      );

      // синяя точка
      drawCircle(
        this.circleStartPoint,
        { x: 0, y: 0 },
        10,
        this.config.colorCircle
      );

    }

    { // end point

      rectV2(
        this.endPointRect,
        {
          center: { x: 0, y: 0 },
          width: 10,
          height: 10,
          lineColor: this.config.colorRect, // Цвет обводки (по умолчанию чёрный)
          lineWidth: 1, // Толщина линии обводки
          angleDegrees: 0
        }
      );

      // прозрачная точка
      drawCircle(
        this.circleEndPoint,
        { x: 0, y: 0 },
        10,
        "rgba(0,0,0,0)"
      );

    }

    this.container.visible = false;

  }

  public setupInteractions(): void {

    this.circleStartPoint // события для стартовой точки
      .on('pointerdown', this.handlerMouseLeftDown) //.handleMouseDown.bind(this, 0)) // если нажали на точку стены
      .on("mouseover", this.handlerMouseOver)
      .on("mouseout", this.handlerMouseOut);

    this.circleEndPoint // события для конечной точки
      .on('pointerdown', this.handlerMouseLeftDown) //handleMouseDown.bind(this, 1)) // если нажали на точку стены
      .on("mouseover", this.handlerMouseOver)
      .on("mouseout", this.handlerMouseOut);

    this.app.stage
      .on('pointermove', this.handlerMouseMove)
      .on('pointerup', this.handlerMouseUp);

    this.app.renderer.canvas.addEventListener("mouseleave", this.handlerCanvasMouseLeave);

  }

  // включены точки
  public activate(value: [Vector2, Vector2] | false = false) {

    if (value) {

      if (!value[0] || !value[1]) return;

      const indexPoint = this.parent.layers.planner.state.activePointWall ?? this.parent.layers.doorsAndWindows.state.activePointObject;

      { // start point
        const p: Vector2 = {
          x: value[0].x < 0 ? 0 : value[0].x,
          y: value[0].y < 0 ? 0 : value[0].y,
        };

        this.circleStartPoint.x = p.x;
        this.circleStartPoint.y = p.y;
        this.startPointRect.x = p.x
        this.startPointRect.y = p.y;

        this.startPointRect.visible = indexPoint == 0 ? true : false;

      }

      { // end point
        const p: Vector2 = { // point position
          x: value[1].x < 0 ? 0 : value[1].x,
          y: value[1].y < 0 ? 0 : value[1].y,
        };

        this.circleEndPoint.x = p.x;
        this.circleEndPoint.y = p.y;
        this.endPointRect.x = p.x;
        this.endPointRect.y = p.y;

        this.endPointRect.visible = indexPoint == 1 ? true : false;

      }

      if(this.parent.layers.planner.state.activeWall){
        this.angleBetweenWalls.visible = true;
        this.circleAngleMask.visible = true;
        this.angleTextConatainer.visible = true;
        this.drawAngleBetweenWalls();
      }else{
        this.angleBetweenWalls.visible = false;
        this.circleAngleMask.visible = false;
        this.angleTextConatainer.visible = false;
      }

      this.container.visible = true;

    } else {

      this.container.visible = false;

    }

  }

  private getPointerPosition(x: number, y: number): Vector2 {

    const co = this.parent.config.originOfCoordinates;
    const inverseScale = this.parent.config.inverseScale;

    return {
      x: (x - co.x - 30) * inverseScale,
      y: (y - co.y - 30) * inverseScale,
    };

  }

  public updatePositionIndicatorPoint(__position: Vector2): Vector2 {

    // интедкст активной точки стены
    const indexWallPoint = this.parent.layers.planner.state.activePointWall;
    const indexObjectPoint = this.parent.layers.doorsAndWindows.state.activePointObject;

    // координаты мыши
    const position: Vector2 = { x: 0, y: 0 };

    if(indexWallPoint !== null) { // активная точка стены

      const idWall = this.parent.layers.planner.state.activeWall;
      const listWalls = this.parent.layers.planner.objectWalls;
      const dataWall = listWalls.find((wall: any) => wall.id === idWall);

      if (this.parent.state.keys.ctrl) { // свободное перемещение | зажата клавиша Ctrl

        position.x = __position.x < 0 ? 0 : __position.x;
        position.y = __position.y < 0 ? 0 : __position.y;

        if(dataWall.name === 'dividing_wall'){ // Определяет, находится ли точка v0 близко к отрезку [p0, p1] | isPointNearLine
          let minDist = Infinity; // Инициализируем минимальное расстояние бесконечностью
          let closestPoint: Vector2 | null = null; // Переменная для хранения ближайшей точки к линии

          const walls = this.parent.layers.planner.objectWalls;

          for (let i = 0, len = walls.length; i < len; i++) { // Перебираем все стены
            const wall = walls[i];

            if (wall.id === this.parent.layers.planner.state.activeWall) continue; // Пропускаем активную стену

            const segments: [Vector2, Vector2][] = [
              [wall.points[0], wall.points[1]], // Первый сегмент стены
              [wall.points[2], wall.points[3]]  // Второй сегмент стены
            ];

            for (const seg of segments) { // Перебираем оба сегмента стены
              const nearLine: Vector2 = isPointNearLine(seg, position, 10); // Проверяем, находится ли точка рядом с сегментом (в пределах 10px)
              if (nearLine) { // Если точка рядом найдена
                const dist = Math.hypot(position.x - nearLine.x, position.y - nearLine.y); // Вычисляем расстояние до найденной точки
                if (dist < minDist) { // Если это расстояние меньше минимального
                  minDist = dist; // Обновляем минимальное расстояние
                  closestPoint = nearLine; // Сохраняем ближайшую точку
                }
              }
            }
          }

          if (closestPoint) { // Если ближайшая точка найдена
            position.x = closestPoint.x; // Обновляем позицию по x
            position.y = closestPoint.y; // Обновляем позицию по y
          }
        }

      } else { // смещение вдоль линии отрезка

        // Изменяет длину отрезка, перемещая точку A или B вдоль линии
        const p = adjustSegmentLength(
          [dataWall.points[0], dataWall.points[1]], // линия отрезка
          indexWallPoint, // индекс точки, которую нужно переместить
          __position, // позиция мыши
        );

        // Ограничиваем позицию точки, чтобы она не уходила за границы холста
        position.x = p.x < 0 ? 0 : p.x;
        position.y = p.y < 0 ? 0 : p.y;

        {
          const walls = this.parent.layers.planner.objectWalls;
          const line_p0 = p;
          const line_p1 = indexWallPoint == 0 ? dataWall.points[1] : dataWall.points[0];

          // Создаем временный отрезок для проверки
          const tempSegment = [line_p0, line_p1] as [Vector2, Vector2];

          for (let i = 0, len = walls.length; i < len; i++) {
            const wall = walls[i];

            // Пропускаем текущую стену и связанные стены
            if (
              wall.id === this.parent.layers.planner.state.activeWall ||
              wall.id === dataWall.mergeWalls.wallPoint0 ||
              wall.id === dataWall.mergeWalls.wallPoint1
            ) {
              continue;
            }

            // Проверяем оба отрезка стены
            const wallSegments = [
              [wall.points[0], wall.points[1]] as [Vector2, Vector2],
              [wall.points[2], wall.points[3]] as [Vector2, Vector2]
            ];

            for (const wallSegment of wallSegments) {
              // Исключаем случай, когда проверяемый отрезок совпадает с tempSegment
              if (this.segmentsEqual(tempSegment, wallSegment)) {
                continue;
              }

              const intersection = findSegmentIntersection(tempSegment, wallSegment);

              if (intersection) {
                // Проверяем, что точка пересечения не совпадает с line_p1
                if (!this.pointsEqual(intersection, line_p1)) {

                  const dis = getDistanceBetweenVectors(__position, intersection);
                  //
                  if(dis < 15){
                    position.x = intersection.x;
                    position.y = intersection.y;
                  }
                  break; // Нашли пересечение - выходим
                }
              }
            }

            if (position.x !== p.x || position.y !== p.y) {
              break; // Если позиция изменилась - прерываем внешний цикл
            }
          }
        }

      }

      if (indexWallPoint == 0) {
        this.circleStartPoint.x = position.x;
        this.circleStartPoint.y = position.y;
        this.startPointRect.x = position.x
        this.startPointRect.y = position.y;
      } else if (indexWallPoint == 1) {
        this.circleEndPoint.x = position.x;
        this.circleEndPoint.y = position.y;
        this.endPointRect.x = position.x;
        this.endPointRect.y = position.y;
      }

    }else if (indexObjectPoint !== null) { // активная точка объекта

      const idObject = this.parent.layers.doorsAndWindows.state.activeObject;
      const dataObject = this.parent.layers.doorsAndWindows.drawObjects.find((obj: any) => obj.id === idObject);

      // Изменяет длину отрезка, перемещая точку A или B вдоль линии
      // и возвращает новую позицию точки, которую нужно переместить
      const p = adjustSegmentLength(
        [dataObject.points[0], dataObject.points[1]], // линия отрезка
        indexObjectPoint, // индекс точки, которую нужно переместить
        __position, // позиция мыши
      );

      // Ограничиваем позицию точки, чтобы она не уходила за границы холста
      position.x = p.x < 0 ? 0 : p.x;
      position.y = p.y < 0 ? 0 : p.y;

      if (indexObjectPoint == 0) {
        this.circleStartPoint.x = position.x;
        this.circleStartPoint.y = position.y;
        this.startPointRect.x = position.x
        this.startPointRect.y = position.y;
      } else if (indexObjectPoint == 1) {
        this.circleEndPoint.x = position.x;
        this.circleEndPoint.y = position.y;
        this.endPointRect.x = position.x;
        this.endPointRect.y = position.y;
      }

    }

    return position;

  }

  private pointsEqual(a: Vector2, b: Vector2, epsilon = 1e-6): boolean {
    return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
  }

  private segmentsEqual(seg1: [Vector2, Vector2], seg2: [Vector2, Vector2]): boolean {
    return (this.pointsEqual(seg1[0], seg2[0]) && this.pointsEqual(seg1[1], seg2[1])) ||
      (this.pointsEqual(seg1[0], seg2[1]) && this.pointsEqual(seg1[1], seg2[0]));
  }

  public updateScenePosition(): void {

    this.container!.x = this.parent.config.originOfCoordinates.x + 30;
    this.container!.y = this.parent.config.originOfCoordinates.y + 30;

  }

  public set scale(v: number) {
    this.container!.scale.set(v);
  }

  public destroy(): void {

    this.app.stage
      .off('pointermove', this.handlerMouseMove)
      .off('pointerup', this.handlerMouseUp);

    this.circleStartPoint
      .off('pointerdown', this.handlerMouseLeftDown)
      .off('mouseover', this.handlerMouseOver)
      .off('mouseout', this.handlerMouseOut);

    this.circleEndPoint
      .off('pointerdown', this.handlerMouseLeftDown)
      .off('mouseover', this.handlerMouseOver)
      .off('mouseout', this.handlerMouseOut);

    this.app.renderer.canvas.removeEventListener("mouseleave", this.handlerCanvasMouseLeave);

    // Очистка и уничтожение графики
    [
      this.circleStartPoint,
      this.circleEndPoint,
      this.startPointRect,
      this.endPointRect,
      this.circleAngleMask,
      this.angleText,
      this.angleTextConatainer,
      this.angleBetweenWalls,
    ].forEach(graphic => {
      if (graphic) {
        graphic.destroy(true);
        this.container.removeChild(graphic);
      }
    });

    // Удаление контейнера
    if (this.container) {
      this.app.stage.removeChild(this.container);
      this.container.destroy({ children: true, texture: true });
    }

    // Обнуление свойств
    this.circleStartPoint = null!;
    this.circleEndPoint = null!;
    this.startPointRect = null!;
    this.endPointRect = null!;
    this.circleAngleMask = null!;
    this.angleText = null!;
    this.angleTextConatainer = null!;
    this.container = null!;
    this.app = null!;

  }

};