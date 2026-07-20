import * as PIXI from "pixi.js";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

import { Events } from '@/store/constructor2d/events';

export function handlerMouseUp(this: any, e: PIXI.FederatedPointerEvent): void {

  e.preventDefault();
  
  e.stopPropagation(); // Останавливаем всплытие события
  
  this.parent.state.mouse.left = false;

  // this.parent.layers.planner.updateRoomStore(null, true);

  { // отображаем форму редактирования стены
    const activeWallID = this.parent.layers.planner.state.activeWall;
    const activeWall = this.parent.layers.planner.objectWalls.find((el: { id: string }) => el.id === activeWallID);

    if(activeWall){
      this.parent.eventBus.emit(Events.C2D_SHOW_FORM_MODIFY_WALL, {
        width: Number(activeWall.width.toFixed(1))*10,
        height: Number(activeWall.height.toFixed(1))*10,
        position: {
          x: activeWall.points[0].x + this.parent.config.originOfCoordinates.x,
          y: activeWall.points[0].y + this.parent.config.originOfCoordinates.y
        }
      });
    }
  }

}