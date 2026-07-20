//@ts-nocheck
import * as PIXI from 'pixi.js';

import {
  Vector2,
} from "@/types/constructor2d/interfaсes";

export interface IHalfRoomData {
  id: number | string;
  points: Vector2[];
};

export interface IConfig {
  half: {
    color: number | string;
  };
};

export interface IGraphics {
  id: number | string;
  graphic: PIXI.Graphics;
};

export interface IState {
  graphics: IGraphics[];
};

export interface IDateRoomLabel {
  id: number | string;
  label: string;
};