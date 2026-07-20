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
  this.clearGhostPreview();

  // [REMOVED: quantization] откат стены если не было snap-коммита
  // if (this.state.activeWall && this.state.dragRoomId != null && !this.state.hasAngleStepCommit) {
  //   const wall = this.objectWalls.find((w: ObjectWall) => w.id === this.state.activeWall);
  //   if (wall && this.state.oldPosition?.length >= 2) {
  //     wall.points[0] = { ...this.state.oldPosition[0] };
  //     wall.points[1] = { ...this.state.oldPosition[1] };
  //     wall.width = Math.hypot(wall.points[1].x - wall.points[0].x, wall.points[1].y - wall.points[0].y);
  //     if (wall.mergeWalls.wallPoint0) this.updateMergeWallProperties(0, wall.points[1], wall.mergeWalls.wallPoint0);
  //     if (wall.mergeWalls.wallPoint1) this.updateMergeWallProperties(1, wall.points[0], wall.mergeWalls.wallPoint1);
  //     const listRelatedWalls: (string | number)[] = this.getMergeWallsIDForUpdate(wall.id);
  //     this.drawListWalls(listRelatedWalls);
  //   }
  // }

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
