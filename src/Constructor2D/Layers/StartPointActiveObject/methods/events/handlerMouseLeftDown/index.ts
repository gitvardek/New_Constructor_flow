import * as PIXI from "pixi.js";
import { Vector2 } from "@/types/constructor2d/interfaсes";

import { Events } from '@/store/constructor2d/events';

export function handlerMouseLeftDown(this: any, e: PIXI.FederatedPointerEvent): void {

  const graphic = e.currentTarget as PIXI.Graphics & { indexPoint: number };
  const indexPoint = graphic.indexPoint;
  
  e.preventDefault();

  e.stopPropagation(); // Останавливаем всплытие события

  // if (e.ctrlKey || e.metaKey) {
  //   // если зажат ctrl/command то выравниваем стены, имеющие общую точку
  //   this.parent.layers.planner.arrangeWallsAt_90_DegreeAngle();
  //   return;
  // }
  
  if(indexPoint == 0){
    this.circleStartPoint.cursor = "pointer";
  }else if(indexPoint == 1){
    this.circleEndPoint.cursor = "pointer";
  }
  this.app.stage.cursor = "pointer";

  // эта переменная для того, чтобы потом корректно перемещать активную точку по холсту
  this.state.downActivePointerPosition = this.getPointerPosition(e.global.x, e.global.y);

  if(this.parent.layers.planner.state.activeWall){
    this.parent.layers.planner.state.activePointWall = indexPoint;
    this.parent.layers.doorsAndWindows.state.activePointObject = null;
  }else if(this.parent.layers.doorsAndWindows.state.activeObject){
    this.parent.layers.planner.state.activePointWall = null;
    this.parent.layers.doorsAndWindows.state.activePointObject = indexPoint;
  }
  this.parent.state.mouse.left = true;

  if(this.parent.layers.planner.state.activeWall){
    const dataWall: { id: string, points: Vector2[] } | undefined = 
      this.parent.layers.planner.objectWalls.find((el: { id: string }) => el.id === this.parent.layers.planner.state.activeWall);
    if(dataWall) this.parent.layers.arrowRulerActiveObject.draw(dataWall.points[indexPoint]);

    this.parent.eventBus.emit(Events.C2D_HIDE_FORM_MODIFY_WALL);
  }

};