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

        if (cursorIsInside && dataWall) { // если есть стена под курсором

          dataObject.belongsToWall.id = dataWall.id;

          const point_0: Vector2 | null = getIntersectVectorLine(
            [dataWall.points[0], dataWall.points[1]],
            cursorPositionOnScene
          );

          if (point_0) {

            this.drawObjects[dataObjectIndex].belongsToWall.distanceFromWallStart = getDistanceBetweenVectors(dataWall.points[0], point_0);
            this.drawObjects[dataObjectIndex].height = dataWall.height;
            this.drawObjects[dataObjectIndex].angleDegrees = dataWall.angleDegrees;

            // 2. Генерируем точки объекта, взяв точку лежащую на линии стены
            const point_1: Vector2 = {
              x: point_0.x + this.drawObjects[dataObjectIndex].width,
              y: point_0.y
            };
            const point_2: Vector2 = JSON.parse(JSON.stringify(point_1));
            point_2.y -= this.drawObjects[dataObjectIndex].height;
            const point_3: Vector2 = JSON.parse(JSON.stringify(point_0));
            point_3.y -= this.drawObjects[dataObjectIndex].height;


            // 3. Устанавливаем угол повторота объекта
            const objectPoints: Vector2[] = rotatePointsAroundCenter([
              point_0,
              point_1,
              point_2,
              point_3
            ], point_0, this.drawObjects[dataObjectIndex].angleDegrees);

            // Обновляем координаты всех точек объекта
            objectPoints.forEach((p: Vector2, index: number) => {
              this.drawObjects[dataObjectIndex].points[index].x = p.x;
              this.drawObjects[dataObjectIndex].points[index].y = p.y;
            });

          } else {

            console.error("!!! Error! Failed to determine the intersection point of the cursor with the wall line.");

          }

        } else { // если нет стены под курсором

          this.drawObjects[dataObjectIndex].belongsToWall.id = null;
          this.drawObjects[dataObjectIndex].belongsToWall.distanceFromWallStart = 0;
          this.drawObjects[dataObjectIndex].angleDegrees = 0;
          this.drawObjects[dataObjectIndex].height = this.config[this.drawObjects[dataObjectIndex].name]?.height;

          const point_0: Vector2 = cursorPositionOnScene;
          const point_1: Vector2 = {
            x: point_0.x + this.drawObjects[dataObjectIndex].width,
            y: point_0.y
          };
          const point_2: Vector2 = JSON.parse(JSON.stringify(point_1));
          point_2.y -= this.drawObjects[dataObjectIndex].height;
          const point_3: Vector2 = JSON.parse(JSON.stringify(point_0));
          point_3.y -= this.drawObjects[dataObjectIndex].height;

          const startPointPosition = [
            point_0,
            point_1,
            point_2,
            point_3
          ];

          // Обновляем координаты всех точек объекта
          this.drawObjects[dataObjectIndex].points.forEach((p: Vector2, index: number) => {
            p.x = startPointPosition[index].x; // Новая X-координата
            p.y = startPointPosition[index].y; // Новая Y-координата
          });

        }

        this.parent.layers.startPointActiveObject.startPointRect.rotation = MathUtils.degToRad(dataObject.angleDegrees);
        this.parent.layers.startPointActiveObject.endPointRect.rotation = MathUtils.degToRad(dataObject.angleDegrees);

        // Перерисовываем объект с новыми координатами
        this.draw(id);

        // Активируем начальную точку объекта (если есть специальный слой для этого)
        this.parent.layers.startPointActiveObject.activate([this.drawObjects[dataObjectIndex].points[0], this.drawObjects[dataObjectIndex].points[1]]);
      }
    }

    e.stopPropagation(); // Предотвращаем всплытие события
  }
};