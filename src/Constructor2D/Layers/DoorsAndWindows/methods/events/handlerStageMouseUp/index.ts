import * as PIXI from "pixi.js";

import {
  Vector2
} from "@/types/constructor2d/interfaсes";

import { IDrawObjects } from "./../../../interfaces";
import { ObjectWall } from "./../../../../Planner/interfaces";

export function handlerStageMouseUp(this: any, e: PIXI.FederatedPointerEvent): void {

  if(this.state.activeObject) {

    const drawObjectsIndex = this.drawObjects.findIndex((obj: IDrawObjects) => obj.id === this.state.activeObject);
    const drawObjects: IDrawObjects = this.drawObjects[drawObjectsIndex];

    if (drawObjectsIndex === -1 || !drawObjects) {
      return;
    }

    const objectPoints: Vector2[] = JSON.parse(JSON.stringify(drawObjects.points));

    // const originObject: Vector2 = getCenterOfPoints(objectPoints); // находим центр нового объекта
    
    const rooms = this.parent.layers.planner.allRooms; // спиосок всех комнат
    let roomIdFound = false;

    // Сначала пытаемся определить комнату по точке объекта
    for (let i = 0, len = rooms.length; i < len; i++) {

      const pointInRoom: boolean = this.parent.layers.planner.isPointInRoom(rooms[i].id, objectPoints[0]);

      if (pointInRoom) {
        this.drawObjects[drawObjectsIndex].roomId = rooms[i].id;
        roomIdFound = true;
        console.log('>>> Объект находится внутри комнаты:', rooms[i].id);
        break;
      }

    }

    // Если не нашли комнату по точке и объект принадлежит стене, берем roomId из стены
    if (!roomIdFound && drawObjects.belongsToWall?.id) {
      const wall = this.parent.layers.planner.objectWalls.find((el: ObjectWall) => el.id === drawObjects.belongsToWall.id);
      if (wall && wall.roomId) {
        this.drawObjects[drawObjectsIndex].roomId = wall.roomId;
        console.log('>>> roomId взят из стены при отпускании мыши:', wall.roomId);
      } else {
        // Если стена не найдена или у стены нет roomId, устанавливаем null
        this.drawObjects[drawObjectsIndex].roomId = null;
      }
    } else if (!roomIdFound) {
      // Если не нашли комнату и объект не принадлежит стене
      this.drawObjects[drawObjectsIndex].roomId = null;
    }

  }
    
  this.state.mouseLeft = false;
  this.state.oldPosition = [];
  this.state.positionDown = {x: 0, y: 0};

  e.stopPropagation(); // Останавливаем всплытие события

};