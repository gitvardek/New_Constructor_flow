import * as PIXI from "pixi.js";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

export function handlerMouseRightUp(this: any, e: PIXI.FederatedPointerEvent): void {
  e.preventDefault();
  
  this.state.mouse.right = false;

};