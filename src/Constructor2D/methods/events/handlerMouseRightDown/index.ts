import * as PIXI from "pixi.js";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

export function handlerMouseRightDown(this: any, e: PIXI.FederatedPointerEvent): void {
  e.preventDefault();

  this.state.oldOriginOfCoordinates.x = this.config.originOfCoordinates.x;
  this.state.oldOriginOfCoordinates.y = this.config.originOfCoordinates.y;
  
  this.state.mouse.downCoordinates.x = e.global.x;
  this.state.mouse.downCoordinates.y = e.global.y;
  
  this.state.mouse.right = true;
};