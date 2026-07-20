import * as PIXI from "pixi.js";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

export function handlerMouseOut(this: any, e: PIXI.FederatedPointerEvent): void {

  const graphic = e.currentTarget as PIXI.Graphics & { indexPoint: number };
  // const indexPoint = graphic.indexPoint;

  graphic.cursor = "defalut";

  if(!this.parent.state.mouse.left){
    this.app.stage.cursor = "default";
    this.startPointRect.visible = false;
    this.endPointRect.visible = false;
  }
  
}