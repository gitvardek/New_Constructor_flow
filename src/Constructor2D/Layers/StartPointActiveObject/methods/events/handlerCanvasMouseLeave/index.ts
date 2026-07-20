// import * as PIXI from "pixi.js";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

export function handlerCanvasMouseLeave(this: any, e: MouseEvent): void {

  e.preventDefault();
  this.parent.state.mouse.left = false;
  this.circleStartPoint.cursor = "defalut";
  this.endPointRect.cursor = "defalut";
  this.app.stage.cursor = "default";
  this.startPointRect.visible = false;
  this.endPointRect.visible = false;
  
}