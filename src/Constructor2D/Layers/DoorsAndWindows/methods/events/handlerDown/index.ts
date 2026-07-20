import { MathUtils } from "three";
import * as PIXI from "pixi.js";
import { Events } from "@/store/constructor2d/events";

import {
  IDrawObjects,
} from "./../../../interfaces";

export function handlerDownEventGraphic(this: any, e: PIXI.FederatedPointerEvent): void {

  const target = e.currentTarget as PIXI.Graphics & { objectId?: string | number };
  const id = target.objectId;

  if(!id){
    console.error(`Ошибка: объект с id ${id} не найден или некорректен.`);
    e.stopPropagation(); // Останавливаем всплытие события
    return;
  }

  const dataObjectEarly: IDrawObjects | undefined = this.drawObjects.find((el: IDrawObjects) => el.id === id);

  if (e.button === 2 && dataObjectEarly && (dataObjectEarly.name === "door" || dataObjectEarly.name === "window")) {
    this.parent.eventBus.emit(Events.C2D_HIDE_WALL_CONTEXT_MENU);
    const canvas = this.app.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const domX = rect.left + e.global.x;
    const domY = rect.top + e.global.y;
    setTimeout(() => {
      this.parent.eventBus.emit(Events.C2D_SHOW_WALL_CONTEXT_MENU, {
        x: domX,
        y: domY,
        context: {
          kind: dataObjectEarly.name,
          openingId: id,
        },
      });
    }, 0);
    e.stopPropagation();
    try {
      e.preventDefault();
    } catch {
      /* ignore */
    }
    return;
  }

  if (e.button == 0){

    const dataObject: IDrawObjects | undefined = dataObjectEarly;
    
    if(!dataObject){
      console.error(`Error: object with id ${id} not found in drawObjects.`);
      return;
    }

    this.setActiveObject(null);

    this.state.mouseLeft = true;

    // const prevActiveObject = this.state.activeWall;

    if( this.parent.layers.planner && this.parent.layers.planner.state.activeWall ){
      this.parent.layers.planner?.deactiveWalls();
      this.parent.layers.arrowRulerActiveObject?.clearGraphic();
      this.parent.layers.dimensionDisplay.hide();
    }

    this.state.oldPosition = JSON.parse(JSON.stringify(dataObject.points));
    this.state.oldAngleDegrees = dataObject.angleDegrees;

    this.state.positionDown.x = e.global.x;
    this.state.positionDown.y = e.global.y;
    
    this.setActiveObject(id);

    // рендеринг активных точек
    this.parent.layers.startPointActiveObject.activate(
      [
        dataObject?.points[0],
        dataObject?.points[1]
      ], 
      this.state.activePointObject
    );


    this.parent.layers.startPointActiveObject.startPointRect.rotation = MathUtils.degToRad(dataObject.angleDegrees);
    this.parent.layers.startPointActiveObject.endPointRect.rotation = MathUtils.degToRad(dataObject.angleDegrees);
    
  }
  
  e.stopPropagation(); // Останавливаем всплытие события
  
};