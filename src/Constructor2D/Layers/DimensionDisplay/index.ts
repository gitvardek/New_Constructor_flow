//@ts-nocheck
import * as PIXI from 'pixi.js';
import { MathUtils } from "three";

import { ObjectWall } from './../Planner/interfaces';
import { IDrawObjects } from './../DoorsAndWindows/interfaces';

import {
  drawShape,
  drawLine,
} from "../../utils/Shape";

import {
  getDistanceBetweenVectors,
  rotatePoint,
  getIntersectVectorLine,
  offsetVectorBySegmentNormal,
  offsetVectorBySegment,
  getMidpoint,
} from './../../utils/Math';

/*
* Менеджер отображения размеров стены и ее объектов
* 
* @class DimensionDisplay
* @description Отвечает за отображение размеров стены и ее объектов (окон, дверей, радиаторов)
*/
export default class DimensionDisplay {

  private app: PIXI.Application;
  private parent: any;
  public container: PIXI.Container;

  private linesGraphics: PIXI.Graphics; // объект для линий на холсте
  private textSizeLines: PIXI.Text[];

  private activeWallId: string | null = null;

  constructor(pixiApp: PIXI.Application, parent: any) {
    if (!pixiApp) throw new Error("PIXI.Application instance is required");

    this.app = pixiApp;
    this.parent = parent;
    this.container = new PIXI.Container();
    this.container.position.set(30, 30);
    this.app.stage.addChild(this.container);

    this.linesGraphics = new PIXI.Graphics();
    this.textSizeLines = [];

    this.container.addChild(this.linesGraphics);

  }

  public show(
    wallId: string
  ): void {

    this.clearAll();

    this.activeWallId = wallId;

    const dataWalls: ObjectWall[] = this.parent.layers.planner.objectWalls;

    this.linesGraphics.visible = true;

    dataWalls.forEach((dataWall: ObjectWall) => {

      const step: number = 30; // отступ от стены по нормали для отображения линии и текста

      if (dataWall.id === this.activeWallId) { // если стена активная

        let stepActiveWall: number = step; // отступ от стены по нормали для отображения линии и текста

        { // 1. Размер радиаторов отопления и растояний между наими и краями стены
        }

        { // 2. Размер окон и растояний между наими и краями стены

          const objects: IDrawObjects[] = this.parent.layers.doorsAndWindows.drawObjects
            .filter((obj: IDrawObjects) => obj.belongsToWall.id === this.activeWallId);

          if (objects.length > 0) {

            // Получаем отсортированные объекты
            const sortedObjects = this.sortObjectsAlongWall(
              objects,
              [dataWall.points[0], dataWall.points[1]]
            );

            // список точек линии, которую нужно нарисовать
            const linePoints: Vector2[] = [
              dataWall.points[0],
              ...sortedObjects.flatMap(obj =>
                obj.points && obj.points.length >= 2
                  ? [obj.points[0], obj.points[1]]
                  : []
              ),
              dataWall.points[1]
            ];

            { // рисуем линию

              const lineDrawPoints = drawLine(
                this.linesGraphics,
                {
                  x: dataWall.points[0].x,
                  y: dataWall.points[0].y,
                },
                dataWall.width,
                dataWall.angleDegrees, // Угол направления стрелки в градусах
                this.parent.layers.planner.config.wall.color.arrowHead,
                0.6, // Толщина линии
                false,
                (dataWall.height + stepActiveWall) * dataWall.heightDirection
              );

              { // рисуем косые метки начала и конца объектов и краев стен

                linePoints.forEach((_v: Vector2, index: number) => {

                  const v: Vecctor2 = getIntersectVectorLine(lineDrawPoints, _v);

                  if (index > 0) {
                    this.drawText(
                      [
                        getIntersectVectorLine(lineDrawPoints, linePoints[index - 1]),
                        v
                      ],
                      dataWall.heightDirection,
                      dataWall.angleDegrees
                    );
                  }

                  // Вычисляем точки p0 и p1 со смещением 8
                  const p0: Vector2 = { x: v.x - 5, y: v.y };
                  const p1: Vector2 = { x: v.x + 5, y: v.y };

                  const rotatedP0 = rotatePoint(p0, v, dataWall.angleDegrees + 100);
                  const rotatedP1 = rotatePoint(p1, v, dataWall.angleDegrees + 100);

                  drawShape(
                    this.linesGraphics,
                    [
                      rotatedP0,
                      rotatedP1
                    ], // Массив точек для контура
                    {
                      stroke: this.parent.layers.planner.config.wall.color.arrowHead
                    },
                    0.6 // Толщина линии
                  );

                });

              }

            }

            stepActiveWall += 30; // обновляем отступ от стены

          }

        }

        { // 3. Размер стены

          const linePoints = drawLine(
            this.linesGraphics,
            {
              x: dataWall.points[0].x,
              y: dataWall.points[0].y,
            },
            dataWall.width,
            dataWall.angleDegrees, // Угол направления стрелки в градусах
            this.parent.layers.planner.config.wall.color.arrowHead,
            0.6, // Толщина линии
            false,
            (dataWall.height + stepActiveWall) * dataWall.heightDirection
          );

          for (let i = 0, len = linePoints.length; i < len; i++) { // граница линии начальной точки

            // Вычисляем точки p0 и p1 со смещением 8
            const p0: Vector2 = { x: linePoints[i].x - 5, y: linePoints[i].y };
            const p1: Vector2 = { x: linePoints[i].x + 5, y: linePoints[i].y };

            const rotatedP0 = rotatePoint(p0, linePoints[i], dataWall.angleDegrees + 100);
            const rotatedP1 = rotatePoint(p1, linePoints[i], dataWall.angleDegrees + 100);

            drawShape(
              this.linesGraphics,
              [
                rotatedP0,
                rotatedP1
              ], // Массив точек для контура
              {
                stroke: this.parent.layers.planner.config.wall.color.arrowHead
              },
              0.6 // Толщина линии
            );

          }

          this.drawText(linePoints, dataWall.heightDirection, dataWall.angleDegrees);

        }

      } else { // другие стены

        const linePoints = drawLine(
          this.linesGraphics,
          {
            x: dataWall.points[0].x,
            y: dataWall.points[0].y,
          },
          dataWall.width,
          dataWall.angleDegrees, // Угол направления стрелки в градусах
          this.parent.layers.planner.config.wall.color.arrowHead,
          0.6, // Толщина линии
          false,
          (dataWall.height + step) * dataWall.heightDirection
        );

        for (let i = 0, len = linePoints.length; i < len; i++) { // граница линии начальной точки

          // Вычисляем точки p0 и p1 со смещением 8
          const p0: Vector2 = { x: linePoints[i].x - 5, y: linePoints[i].y };
          const p1: Vector2 = { x: linePoints[i].x + 5, y: linePoints[i].y };

          const rotatedP0 = rotatePoint(p0, linePoints[i], dataWall.angleDegrees + 100);
          const rotatedP1 = rotatePoint(p1, linePoints[i], dataWall.angleDegrees + 100);

          drawShape(
            this.linesGraphics,
            [
              rotatedP0,
              rotatedP1
            ], // Массив точек для контура
            {
              stroke: this.parent.layers.planner.config.wall.color.arrowHead
            },
            0.6 // Толщина линии
          );

        }

        this.drawText(linePoints, dataWall.heightDirection, dataWall.angleDegrees);

      }

    });

  }

  private drawText(
    linePoints: Vector2[] = [],
    heightDirection: 1 | -1 = 1,
    angleDegrees: number = 0
  ): void {

    let textElement: PIXI.Text | undefined = this.textSizeLines.find((el: PIXI.Text) => !el.visible);

    // если нет скртого элемента, то создаешь и добавляес в список новый
    if (!textElement) {

      textElement = new PIXI.Text({
        text: "",
        style: {
          fontSize: 16,
          fill: 0x5D6069,
        },
      });

      this.textSizeLines.push(textElement);

      this.container.addChild(textElement);

    } else {

      textElement.visible = true;

    }

    const distance: number = getDistanceBetweenVectors(linePoints[0], linePoints[1]);

    textElement.text = (Number(distance.toFixed(1)) * 10).toString() + " мм";

    const pointText = offsetVectorBySegmentNormal(
      [linePoints[0], linePoints[1]],
      offsetVectorBySegment(
        [linePoints[0], linePoints[1]],
        getMidpoint(linePoints[0], linePoints[1]),
        -textElement.width / 2
      ),
      18 * heightDirection
    );

    textElement.x = pointText.x;
    textElement.y = pointText.y;

    textElement.pivot.x = 0.5;
    textElement.pivot.y = 0.5;

    textElement.rotation = MathUtils.degToRad(angleDegrees);

  }

  /**
   * Сортирует объекты вдоль стены по расстоянию от начала стены
   * @param objects Массив объектов для сортировки
   * @param wallPoints Точки стены [начало, конец]
   * @returns Отсортированный массив объектов
   */
  private sortObjectsAlongWall(
    objects: IDrawObjects[],
    wallPoints: [Vector2, Vector2]
  ): IDrawObjects[] {
    // Создаем массив с объектами и их расстояниями
    const objectsWithDistances = objects.map(obj => ({
      obj,
      distance: getDistanceBetweenVectors(wallPoints[0], obj.points[0])
    }));

    // Сортируем по расстоянию
    objectsWithDistances.sort((a, b) => a.distance - b.distance);

    // Возвращаем только объекты
    return objectsWithDistances.map(item => item.obj);
  }

  private clearAll(): void {

    if (!this.container) return;

    // 1. Очищаем Graphics вручную (если есть)
    this.linesGraphics.clear();
    this.linesGraphics.visible = false;

    this.textSizeLines.forEach((el: PIXI.Text) => {
      el.text = '';
      el.visible = false;
    });

  }

  public hide(): void {

    this.activeWallId = null;
    this.clearAll();

  }

  public updateScenePosition(): void {

    this.container!.x = this.parent.config.originOfCoordinates.x + 30;
    this.container!.y = this.parent.config.originOfCoordinates.y + 30;

  }

  public set scale(v: number) {
    this.container!.scale.set(v);
  }

  public destroy(): void {

    this.container.removeChildren();
    this.container.destroy({ children: true });

    // уничтожение менеджера отображения размеров
    this.app = null;

  }

};
