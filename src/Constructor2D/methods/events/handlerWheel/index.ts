// import * as PIXI from "pixi.js";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

export function handlerWheel(this: any, e: WheelEvent): void {
  e.preventDefault();

  if (!this.state.mouse.right) {

    { // set scale

      let currentScale: number = this.config.scale;
      const scaleSpeed: number = this.config.speedScale;

      if (e.deltaY < 0) {
        currentScale += scaleSpeed;
      } else if (e.deltaY > 0) {
        currentScale -= scaleSpeed;
      }

      const ns = Math.min(
        Math.max(currentScale, this.config.minScale),
        this.config.maxScale
      );

      this.config.scale = ns;

      // Если scale меньше 1, inverseScale становится больше 1, и наоборот
      if (ns < 1) {
        this.config.inverseScale = 1 / ns;
      } else {
        this.config.inverseScale = ns === 1 ? 1 : 1 / ns;
      }

      this.layers.grid!.scale = this.config.scale; // обновляем сетку
      this.layers.halfRoom.scale = this.config.scale; // обновляем пол комнаты
      this.layers.rulers?.drawRulers(); // обновляем линейки
      this.layers.planner!.scale = this.config.scale; // обновляем сетку
      this.layers.doorsAndWindows!.scale = this.config.scale; // обновляем двери и окна
      this.layers.arrowRulerActiveObject!.scale = this.config.scale; // обновляем стрелки
      this.layers.startPointActiveObject!.scale = this.config.scale; // обновляем стрелки
      this.layers.dimensionDisplay!.scale = this.config.scale;

    }

  }
};