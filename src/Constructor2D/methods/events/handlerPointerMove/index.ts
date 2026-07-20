import * as PIXI from "pixi.js";
import { calculateMouseDistanceByAxes } from "./../../../utils/Math";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

export function handlerPointerMove(this: any, e: PIXI.FederatedPointerEvent): void {

  e.preventDefault();

  if (this.state.mouse.right) {

    // рассчитываем расстояние между точкой клика правой кнопкой мыши и курсором
    const { distanceX, distanceY } = calculateMouseDistanceByAxes(
      {
        x: e.global.x,
        y: e.global.y,
      },
      this.state.mouse.downCoordinates
    );

    const newX = this.state.oldOriginOfCoordinates.x - distanceX;
    const newY = this.state.oldOriginOfCoordinates.y - distanceY;

    this.config.originOfCoordinates.x = newX <= 0 ? newX : 0;
    this.config.originOfCoordinates.y = newY <= 0 ? newY : 0;

    this.layers.grid?.drawGrid(); // обновляем сетку
    this.layers.halfRoom.updateScenePosition(); // обновляем пол комнаты
    this.layers.rulers?.drawRulers(); // обновляем линейки
    this.layers.planner!.updateScenePosition(); // обновляем слой с объектами
    this.layers.doorsAndWindows!.updateScenePosition(); // обновляем слой с дверями и окнами
    this.layers.arrowRulerActiveObject!.updateScenePosition(); // обновляем слой со стрелками от активной точки
    this.layers.startPointActiveObject!.updateScenePosition(); // обновляем слой со стрелками от активной точки
    this.layers.dimensionDisplay!.updateScenePosition();
    
  }

};