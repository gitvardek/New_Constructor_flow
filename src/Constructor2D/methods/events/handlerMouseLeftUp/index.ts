import * as PIXI from "pixi.js";

export function handlerMouseLeftUp(this: any, e: PIXI.FederatedPointerEvent): void {
  e.preventDefault();

  if (!this.app2d) return;
  
  if (e.button !== 0) return;

  // при отпускании левой кнопки мыши, происходит обновление стора
  this.updateRoomStore();

};