import * as PIXI from "pixi.js";
// import Planner from "./../../../index";
import {
  ObjectWall
} from "./../../../interfaces";
import {
  Vector2
} from "@/types/constructor2d/interfaсes";

import {
  getCenterOfPoints
} from "./../../../../../utils/Math";

export function handlerStageMouseUp(this: any, e: PIXI.FederatedPointerEvent): void {

  if(this.state.activeWall) {

    const wallDataIndex = this.objectWalls.findIndex((w: ObjectWall) => w.id === this.state.activeWall);
    const wallData: ObjectWall = this.objectWalls[wallDataIndex];
    const wallType: string = wallData.name;

    if (wallType === 'dividing_wall') {

      const wallPoints: Vector2[] = JSON.parse(JSON.stringify(wallData.points));

      const originObject: Vector2 = getCenterOfPoints(wallPoints); // находим центр нового объекта

      if (originObject) {

        const rooms = this.allRooms; // спиосок всех комнат

        for (let i = 0, len = rooms.length; i < len; i++) {

          const pointInRoom: boolean = this.isPointInRoom(rooms[i].id, originObject);

          this.objectWalls[wallDataIndex].roomId = pointInRoom ? rooms[i].id : null;

          if (pointInRoom) {
            console.log('>>> Объект находится внутри комнаты:', rooms[i].id);
            break;
          }

        }

      } else {
        console.error("Origin object is not defined.");
      }

    }

  }

  this.state.mouseLeft = false;
  this.state.oldPosition = [];
  this.state.positionDown = { x: 0, y: 0 };

  e.stopPropagation(); // Останавливаем всплытие события

};