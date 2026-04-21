import * as PIXI from 'pixi.js';
import {
  Vector2,
} from "@/types/constructor2d/interfaсes";

type GraphicsOrNull = PIXI.Graphics | null;

export interface ObjectWallContainers {
  root: PIXI.Container | null; // родительский контейнер для всех елементов стены
  eventGraphic: GraphicsOrNull;
  maskWall: GraphicsOrNull;
  bodyWall: GraphicsOrNull;
  lineWall: GraphicsOrNull;
  startPoint: GraphicsOrNull;
  endPoint: GraphicsOrNull;
  normalIndicator: GraphicsOrNull;
  textWallWidth: PIXI.Text | null; // гирина стены
  containerTextRulerWall: PIXI.Container | null;
  textRulerWall: PIXI.Text | null; // длина стены
  rulerWall: GraphicsOrNull;
};

export interface ObjectWall {
  id: string | number;
  name: string;
  width: number;
  height: number;
  points: Vector2[];
  heightDirection: -1 | 1;
  angleDegrees: number;
  updateTime: number;
  mergeWalls: {
    wallPoint0: string | number | null;
    wallPoint1: string | number | null;
  };
  containers?: ObjectWallContainers;
  roomId: number | string | null;
};

export interface ConfigWall {
  width: number;
  height: number;
  heightDirection: -1 | 1; // направление толщины стены
  angleDegrees: number; // + вращение по часовой стрелке, - против часовой стрелки
  color: {
    background: number | string;
    bodyLine: number | string;
    borderLine: number | string;
    line76deg: number | string;
    arrowLineWall: number | string;
    arrowHeadLineWall: number | string;
    arrowHead: number | string;
    green: number | string;
    mediumBlue: number | string;
    tapeLineColor: number | string;
  };
};

export interface Config {
  wall: ConfigWall;
};

export interface State {
  activeWall: null | string | number;
  activePointWall: null | 0 | 1;
  mouseLeft: boolean;
  positionDown: Vector2;
  oldPosition: Vector2[];
};

export interface ArgumentDataAddWall {
  position: Vector2;
  type: "wall" | "wall_vertical" | "dividing_wall";
};

export interface MergeWalls {
  wallPoint0: number | string | null;
  wallPoint1: number | string | null;
};

export interface HoverPointObject { 
  id: number | string; 
  indexPoint: number 
};

export interface IC2DRoom {
  id: string | number;
  label: string;
  description: string;
};