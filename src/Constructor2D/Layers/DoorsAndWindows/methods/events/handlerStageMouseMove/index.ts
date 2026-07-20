import { MathUtils } from "three";
import * as PIXI from "pixi.js";

import { Vector2 } from "@/types/constructor2d/interfaсes";

import {
  IDrawObjects
} from "./../../../interfaces";

import {
  ObjectWall
} from "./../../../../Planner/interfaces";

import {
  isPointInPolygon,
  getIntersectVectorLine,
  getDistanceBetweenVectors,
  rotatePointsAroundCenter,
  // offsetVectorBySegment,
  getAngleBetweenVectors,
  offsetVectorBySegmentNormal,
} from "./../../../../../utils/Math";

/**
 * Обработчик перемещения мыши на сцене
 * 
 * Функция обрабатывает перемещение мыши при активном перетаскивании объекта:
 * 1. Вычисляет смещение курсора от начальной точки нажатия
 * 2. Проверяет, что новые координаты объекта не выходят за допустимые границы
 * 3. Обновляет позиции точек объекта в соответствии с перемещением
 * 4. Отрисовывает обновленный объект
 * 
 * @param this - Контекст вызова (текущий экземпляр класса)
 * @param e - Событие перемещения указателя PIXI
 */
export function handlerStageMouseMove(this: any, e: PIXI.FederatedPointerEvent): void {
  // Проверяем, что левая кнопка мыши нажата и есть активный объект
  if (this.state.mouseLeft && this.state.activeObject) {
    const id = this.state.activeObject; // ID активного объекта

    // Получаем текущие координаты курсора
    const mousePostion: Vector2 = {
      x: e.global.x, // Глобальная X-координата
      y: e.global.y  // Глобальная Y-координата
    };

    // позиция курсора на сцене
    const cursorPositionOnScene: Vector2 = {
      x: (mousePostion.x - this.parent.config.originOfCoordinates.x - 30) * this.parent.config.inverseScale,
      y: (mousePostion.y - this.parent.config.originOfCoordinates.y - 30) * this.parent.config.inverseScale,
    };

    // Вычисляем расстояние перемещения с учетом масштаба
    const distance: Vector2 = {
      x: (mousePostion.x - this.state.positionDown.x) * this.parent.config.inverseScale,
      y: (mousePostion.y - this.state.positionDown.y) * this.parent.config.inverseScale
    };

    // Находим объект для перемещения в массиве объектов
    const dataObjectIndex = this.drawObjects.findIndex((el: IDrawObjects) => el.id === id);

    if (dataObjectIndex != -1) {

      const dataObject = this.drawObjects[dataObjectIndex];

      let status = true; // Флаг допустимости перемещения

      let cursorIsInside: boolean = false; // назодится ли курсор внутри стены или нет

      const listWalls = this.parent.layers.planner.objectWalls;
      let dataWall: ObjectWall | null = null;

      for (let i = 0, len = listWalls.length; i < len; i++) {

        cursorIsInside = isPointInPolygon(
          listWalls[i].points,
          cursorPositionOnScene
        );

        if (cursorIsInside) {
          // dataWall = JSON.parse(JSON.stringify(listWalls[i]));
          dataWall = JSON.parse(JSON.stringify((() => {
            const { id, name, width, height, points, heightDirection, angleDegrees } = listWalls[i];
            return { id, name, width, height, points, heightDirection, angleDegrees };
          })()));
          break;
        }

      }

      // Проверяем, что новые координаты всех точек не выходят за границы (не отрицательные)
      for (let index = 0, len = dataObject.points.length; index < len; index++) {
        if (
          this.state.oldPosition[index].x + distance.x < 0 ||
          this.state.oldPosition[index].y + distance.y < 0
        ) {
          status = false; // Если хоть одна точка выходит за границы
        }
      }

      // Если перемещение допустимо
      if (status) {

        if (cursorIsInside && dataWall) {

          this.drawObjects[dataObjectIndex].belongsToWall.id = dataWall.id;
          this.drawObjects[dataObjectIndex].angleDegrees = dataWall.angleDegrees;
          this.drawObjects[dataObjectIndex].height = dataWall.height;

          const degRotation: number = getAngleBetweenVectors(
            this.state.oldPosition[0],
            {
              x: this.state.oldPosition[0].x + 300,
              y: this.state.oldPosition[0].y
            },
            this.state.oldPosition[1]
          );
          const __objectPoints: Vector2[] = rotatePointsAroundCenter(
            this.state.oldPosition, 
            {
              x: (this.state.positionDown.x - this.parent.config.originOfCoordinates.x - 30) * this.parent.config.inverseScale,
              y: (this.state.positionDown.y - this.parent.config.originOfCoordinates.y - 30) * this.parent.config.inverseScale,
            }, 
            ((360 + degRotation * -1) + this.drawObjects[dataObjectIndex].angleDegrees)
          );

          __objectPoints.forEach((p: Vector2, index: number) => {
            __objectPoints[index].x = p.x + distance.x;
            __objectPoints[index].y = p.y + distance.y;
          });

          const objectPoints: Vector2[] | [] = [];

          objectPoints[0] = getIntersectVectorLine(
            [dataWall.points[0], dataWall.points[1]],
            __objectPoints[0]
          ) || {x: 0, y: 0};

          objectPoints[1] = getIntersectVectorLine(
            [dataWall.points[0], dataWall.points[1]],
            __objectPoints[1]
          ) || {x: 0, y: 0};

          objectPoints[2] = offsetVectorBySegmentNormal(
            [objectPoints[0], objectPoints[1]],
            objectPoints[1],
            this.drawObjects[dataObjectIndex].height * this.drawObjects[dataObjectIndex].heightDirection
          ) || {x: 0, y: 0};

          objectPoints[3] = offsetVectorBySegmentNormal(
            [objectPoints[0], objectPoints[1]],
            objectPoints[0],
            this.drawObjects[dataObjectIndex].height * this.drawObjects[dataObjectIndex].heightDirection
          ) || {x: 0, y: 0};

          // Обновляем координаты всех точек объекта
          objectPoints.forEach((p: Vector2, index: number) => {
            this.drawObjects[dataObjectIndex].points[index].x = p.x;
            this.drawObjects[dataObjectIndex].points[index].y = p.y;
          });

          this.drawObjects[dataObjectIndex].belongsToWall.distanceFromWallStart = getDistanceBetweenVectors(
            dataWall.points[0], 
            this.drawObjects[dataObjectIndex].points[0]
          );

        } else {

          this.drawObjects[dataObjectIndex].belongsToWall.id = null;
          this.drawObjects[dataObjectIndex].belongsToWall.distanceFromWallStart = 0;
          this.drawObjects[dataObjectIndex].height = this.config[this.drawObjects[dataObjectIndex].name]?.height;

          const degRotation: number = getAngleBetweenVectors(
            this.state.oldPosition[0],
            {
              x: this.state.oldPosition[0].x + 300,
              y: this.state.oldPosition[0].y
            },
            this.state.oldPosition[1]
          );

          const objectPoints: Vector2[] = rotatePointsAroundCenter(
            this.state.oldPosition, 
            {
              x: (this.state.positionDown.x - this.parent.config.originOfCoordinates.x - 30) * this.parent.config.inverseScale,
              y: (this.state.positionDown.y - this.parent.config.originOfCoordinates.y - 30) * this.parent.config.inverseScale,
            }, 
            ((360 + degRotation * -1) + this.drawObjects[dataObjectIndex].angleDegrees)
          );
          
          // Обновляем координаты всех точек объекта
          this.drawObjects[dataObjectIndex].points.forEach((p: Vector2, index: number) => {
            p.x = objectPoints[index].x + distance.x; // Новая X-координата
            p.y = objectPoints[index].y + distance.y; // Новая Y-координата
          });

        }
        
        this.parent.layers.startPointActiveObject.startPointRect.rotation = MathUtils.degToRad(this.drawObjects[dataObjectIndex].angleDegrees);
        this.parent.layers.startPointActiveObject.endPointRect.rotation = MathUtils.degToRad(this.drawObjects[dataObjectIndex].angleDegrees);

        // Перерисовываем объект с новыми координатами
        this.draw(id);

        // Активируем начальную точку объекта (если есть специальный слой для этого)
        this.parent.layers.startPointActiveObject.activate([this.drawObjects[dataObjectIndex].points[0], this.drawObjects[dataObjectIndex].points[1]]);
      }
    }

    e.stopPropagation(); // Предотвращаем всплытие события
  }
};