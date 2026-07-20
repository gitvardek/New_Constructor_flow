import * as PIXI from "pixi.js";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

export function handlerMouseMove(this: any, e: PIXI.FederatedPointerEvent): void {

  e.preventDefault();

  e.stopPropagation(); // Останавливаем всплытие события

  const indexPointWall = this.parent.layers.planner.state.activePointWall;
  const indexPointObject = this.parent.layers.doorsAndWindows.state.activePointObject;

  if (
    this.parent.state.mouse.left &&
    (indexPointWall !== null || indexPointObject !== null)
  ) {

    // получаем позицию указателя мыши относительно сцены
    const __position = this.getPointerPosition(e.global.x, e.global.y);

    // получаем новую позицию активной точки объекта и меняем 
    // позицию индикатора активной точки в зависимости от положения объектов в сцене
    const position = this.updatePositionIndicatorPoint(__position);

    // перерисовываем угол между стенами
    this.drawAngleBetweenWalls();

    // перерисовываем стену
    if(indexPointWall !== null) this.parent.layers.planner.updateWallPoint(position);

    // перерисовываем объект
    if(indexPointObject !== null) this.parent.layers.doorsAndWindows.updateObjectPoint(position);


  }
  
}