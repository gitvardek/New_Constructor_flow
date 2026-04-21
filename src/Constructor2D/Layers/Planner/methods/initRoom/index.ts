//@ts-nocheck
import * as PIXI from 'pixi.js';
import { MathUtils } from "three";

import { useSchemeTransition } from "@/store/canvasMerge/schemeTransition";
import { useRoomState } from "@/store/appliction/useRoomState";

import {
  rotatePointsAroundCenter,
  offsetVectorBySegmentNormal,
  getAngleBetweenVectors,
  getDistanceBetweenVectors,
} from "./../../../../utils/Math/index";

import {
  ObjectWall,
} from "./../../interfaces";

import {
  drawCircle
} from "./../../../../utils/Shape/index";

import { Vector2 } from "@/types/constructor2d/interfaсes";

const roomsStore = useSchemeTransition();
const roomState = useRoomState();

export function initRoom(this: any): (0 | 1) {

  const rooms = roomsStore.getAllData();
  
  if (!rooms || rooms.length === 0) {
    return 0;
  }

  let currentRoomId = roomState.getRoomId;
  
  if (!currentRoomId && rooms.length > 0) {
    currentRoomId = rooms[0].id;
    roomState.setCurrentRoomId(currentRoomId);
  }

  const normalizeId = (value: string | number | null | undefined) => {
    return value !== null && value !== undefined ? String(value) : '';
  };
  const currentRoomIdNormalized = normalizeId(currentRoomId);

  const roomsToProcess = rooms.filter(room => {
    const roomIdNormalized = normalizeId(room.id);
    return roomIdNormalized === currentRoomIdNormalized;
  });

  if (roomsToProcess.length === 0) {
    console.warn('Текущая активная комната не найдена в данных');
    return 0;
  }

  // Обрабатываем только текущую активную комнату
  for (let i = 0, len = roomsToProcess.length; i < len; i++) {

    const room = roomsToProcess[i];

    this.addRoom(room.id, room.label, room.description);

    const dataRoomWalls = room.params.walls;
    const dataDividingWall = room.content.filter((item: any) => item.id === 166755); // перегородки

    // for(let i=0, len=dataDividingWall.length; i<len; i++) { // если перегородка
    //   const roomWallData = dataDividingWall[i];

    //   const wallData: ObjectWall = {
    //     id: roomWallData.uuid,
    //     name: "dividing_wall",
    //     width: roomWallData.size.width / 10,
    //     height: roomWallData.size.depth / 10,
    //     heightDirection: this.config.wall.heightDirection,
    //     angleDegrees: MathUtils.radToDeg(roomWallData.rotation._y),
    //     updateTime: Date.now(),
    //     mergeWalls: {
    //       wallPoint0: null,
    //       wallPoint1: null
    //     },
    //     points: [],
    //     roomId: room.id
    //   };

    //   // высчитываем начальную точку стены относительно длины
    //   const center: Vector2 = {
    //     x: roomWallData.position.x / 10,
    //     y: roomWallData.position.z / 10
    //   }
    //   const p0: Vector2 = {
    //     x: (roomWallData.position.x / 10) - (wallData.width / 2),
    //     y: roomWallData.position.z / 10
    //   };
    //   const p1: Vector2 = {
    //     x: (roomWallData.position.x / 10) + (wallData.width / 2),
    //     y: roomWallData.position.z / 10
    //   };

    //   // p0 и p1 повернуть вокруг center на угол roomWallData.rotation._y
    //   const points = rotatePointsAroundCenter([p0, p1], center, -wallData.angleDegrees);

    //   // обновить угол наклона стены
    //   wallData.angleDegrees = getAngleBetweenVectors(
    //     points[0],
    //     {
    //       x: points[0].x + 300,
    //       y: points[0].y
    //     },
    //     points[1]
    //   );

    //   const point2: Vector2 = offsetVectorBySegmentNormal(
    //     [
    //       points[0],
    //       points[1]
    //     ],
    //     points[1],
    //     wallData.heightDirection * wallData.height
    //   );

    //   const point3: Vector2 = offsetVectorBySegmentNormal(
    //     [
    //       points[0],
    //       points[1]
    //     ],
    //     points[0],
    //     wallData.heightDirection * wallData.height
    //   );

    //   points.push(point2, point3);

    //   wallData.points = points;
      
    //   this.objectWalls.push(wallData);
    // }

    for(let i=0, len=dataRoomWalls.length; i<len; i++) { // если стена

      const roomWallData = dataRoomWalls[i];

      const wallData: ObjectWall = {
        id: roomWallData.id,
        name: "wall",
        width: roomWallData.width / 10,
        height: roomWallData.depth / 10,
        heightDirection: this.config.wall.heightDirection,
        angleDegrees: MathUtils.radToDeg(roomWallData.rotation._y),
        updateTime: Date.now(),
        mergeWalls: {
          wallPoint0: null,
          wallPoint1: null
        },
        points: [],
        roomId: room.id
      };

      // высчитываем начальную точку стены относительно длины
      const center: Vector2 = {
        x: roomWallData.position.x / 10,
        y: roomWallData.position.z / 10
      }
      const p0: Vector2 = {
        x: (roomWallData.position.x / 10) - (wallData.width / 2),
        y: roomWallData.position.z / 10
      };
      const p1: Vector2 = {
        x: (roomWallData.position.x / 10) + (wallData.width / 2),
        y: roomWallData.position.z / 10
      };

      // p0 и p1 повернуть вокруг center на угол roomWallData.rotation._y
      const points = rotatePointsAroundCenter([p0, p1], center, -wallData.angleDegrees);

      // обновить угол наклона стены
      wallData.angleDegrees = getAngleBetweenVectors(
        points[0],
        {
          x: points[0].x + 300,
          y: points[0].y
        },
        points[1]
      );

      const point2: Vector2 = offsetVectorBySegmentNormal(
        [
          points[0],
          points[1]
        ],
        points[1],
        wallData.heightDirection * wallData.height
      );

      const point3: Vector2 = offsetVectorBySegmentNormal(
        [
          points[0],
          points[1]
        ],
        points[0],
        wallData.heightDirection * wallData.height
      );

      points.push(point2, point3);

      wallData.points = points;
      
      this.objectWalls.push(wallData);
      
    }

    for(let i=0, len=this.objectWalls.length; i<len; i++) { // создаем точки стен для соединения

      const wall = this.objectWalls[i];

      const wallPoint0 = this.getPointByPosition.bind(this)(wall.points[0], wall.id);

      wall.mergeWalls.wallPoint1 = wallPoint0?.id ?? null;

      const wallPoint1  = this.getPointByPosition.bind(this)(wall.points[1], wall.id);

      wall.mergeWalls.wallPoint0 = wallPoint1?.id ?? null;
      
    }
    
  }
  
  return 1;

};