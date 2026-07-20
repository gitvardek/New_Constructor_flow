import { Vector2 } from "@/types/constructor2d/interfaсes";

export interface IConfig {
  scale: number;
  speedScale: number;
  minScale: number;
  maxScale: number;
  inverseScale: number;
  originOfCoordinates: Vector2;
};

export interface IState {
  mouse: {
    left: boolean;
    right: boolean;
    downCoordinates: Vector2;
  };
  keys: {
    ctrl: boolean;
    shift: boolean;
  };
  oldOriginOfCoordinates: Vector2;
};