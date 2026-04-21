import * as PIXI from 'pixi.js';
import { Vector2 } from "@/types/constructor2d/interfaсes";

export interface IConfigWindowColors {
  background: number | string;
  colorEdge: number | string;
}
export interface IConfigDoorColors {
  background: number | string;
  colorEdge: number | string;
}
export interface IConfigWindow {
  width: number;
  height: number;
  lineWidth: number; // толщина линии
  colors: IConfigWindowColors;
}

export interface IConfigDoor {
  width: number;
  height: number;
  lineWidth: number; // толщина линии
  colors: IConfigDoorColors;
}

export interface IConfig {

  line: number;

  window: IConfigWindow;

  door: IConfigDoor;

  text: {
    text: string | number;
    style: {
      fontSize: number;
      fill: number | string;
    };
  }
  
};

export interface IState {
  activeObject: string | number | null; // активный объект (id объекта)
  activePointObject: number | null; // активная точка объекта
  mouseLeft: boolean; // состояние левой кнопки мыши
  positionDown: Vector2; // позиция клика на канвасе
  aldAngleDegrees: number;
  oldPosition: Vector2[]; // точки объекта при клике
}

export interface IObjectDrawContainers {
  root: PIXI.Container | null; // родительский контейнер для всех елементов объекта
  eventGraphic: PIXI.Graphics | null;
  body: PIXI.Graphics | null;
  line: PIXI.Graphics | null;
};

export interface IDrawObjectsBelongsToWall {
  id: string | number | null;
  distanceFromWallStart: number;
}

export interface IDrawObjects {
  id: string | number;
  name: "door" | "window";
  /** Проём вдоль стены (топ-вью), в тех же единицах, что и стены; в мм × 10 при выгрузке в 3D */
  width: number;
  /** Толщина символа на топ-вью (в 3D → глубина врезки), не путать с высотой проёма */
  height: number;
  /** Высота проёма «в человеческом смысле», мм/10 как у width (в 3D → size.height) */
  openingHeight: number;
  /** Расстояние от пола до низа проёма, мм/10 (для окон в 3D → position.y). */
  distanceFromFloor: number;
  points: Vector2[];
  heightDirection: -1 | 1;
  angleDegrees: number;
  updateTime: number;
  belongsToWall: IDrawObjectsBelongsToWall; // объект может принадлежать стене
  containers?: IObjectDrawContainers;
  roomId: string | number | null;
};

export interface IArgumentDataAddObject{
  position: Vector2;
  type: "window" | "door"; // тип объекта
};

export interface IDetachParams {
  type: "object" | "wall";
  id: string | number;
}