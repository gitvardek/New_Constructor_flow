import { Vector2 } from "@/types/constructor2d/interfaсes";

export interface Config {

  fontSize: number;
  colorText: number | string;
  colorRect: number | string;
  colorCircle: number | string;
  colorAngleArc: number | string;
  
};

export interface State {

  downActivePointerPosition: Vector2;
  
};