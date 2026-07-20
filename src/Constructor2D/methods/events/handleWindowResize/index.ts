// import * as PIXI from "pixi.js";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

export function handleWindowResize(this: any): void {
  
  if (this.app2d) {
    this.app2d.renderer.resize(this.container.clientWidth, this.container.clientHeight);
    if(this.layers.rulers) this.layers.rulers.drawRulers();
    if(this.layers.grid) this.layers.grid.drawGrid();
  } 

};