import { MathUtils } from "three";
import * as PIXI from "pixi.js";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

export function handlerMouseOver(this: any, e: PIXI.FederatedPointerEvent): void {

  const graphic = e.currentTarget as PIXI.Graphics & { indexPoint: number };
  const indexPoint = graphic.indexPoint;

  graphic.cursor = "pointer";
  this.app.stage.cursor = "pointer";

  if(!this.parent.state.mouse.left){
    const dataWall: { id: string, angleDegrees: number } | undefined = 
      this.parent.layers.planner.objectWalls.find((el: { id: string }) => el.id === this.parent.layers.planner.state.activeWall);
    if(dataWall){
      if(indexPoint == 0){
        this.startPointRect.rotation = MathUtils.degToRad(dataWall.angleDegrees);
      }else if(indexPoint == 1){
        this.endPointRect.rotation = MathUtils.degToRad(dataWall.angleDegrees);
      }
    }
  }
  
  if(indexPoint == 0){
    this.startPointRect.visible = true;
    this.endPointRect.visible = false;
  }else if(indexPoint == 1){
    this.startPointRect.visible = false;
    this.endPointRect.visible = true;
  }

};