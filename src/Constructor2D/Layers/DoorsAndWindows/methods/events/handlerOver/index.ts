import * as PIXI from "pixi.js";
// import Planner from "./../../../index";

export function handlerOverEventGraphic(/*this: Planner, */e: PIXI.FederatedPointerEvent): void {

  const target = e.currentTarget as PIXI.Graphics;
  target.cursor = "pointer";
  
};