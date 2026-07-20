
//@ts-nocheck
import * as PIXI from 'pixi.js';
// import * as PIXI from 'pixi.js';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import {
  PlannerObject,
  Vector2
} from "@/types/constructor2d/interfaсes";

import { 
  getRectPoints,
  getRectPointsV2,
  getDistanceBetweenVectors,
  getAngleBetweenVectors
} from "@/Constructor2D-1__dump/utils/Math";

import { configWall } from "@/store/constructor2d/data/usePlannerData";

// import { useConstructor2DStore } from "@/store/constructor2d/store/useConstructor2DStore";

// const interactiveWallStore = useConstructor2DStore();

export const usePlanner2DStore = defineStore('planner2DStore', () => {
  const objects = ref<PlannerObject[]>([]);

  const addObj = (item: PlannerObject) => {
    
    // const points = getRectPoints(
    //   item.width,
    //   item.height,
    //   item.position,
    //   item.heightDirection,
    //   item.angleDegrees
    // );

    // item.points = points;
    
    // item.width = config.width;
    // item.height = config.height;
    
    objects.value.push(item);
    
  };

  const removeObj = (id: number | string) => {
    if (id) {
      const index = objects.value.findIndex(obj => obj.id === id);
      let obj = JSON.parse(JSON.stringify(objects.value[index])); // Копируем объект
      objects.value.splice(index, 1);

      if(obj.mergeWalls.wallPoint0){
        const objP0 = objects.value.find(o => o.id === obj.mergeWalls.wallPoint0);
        if(objP0){
          objP0.mergeWalls.wallPoint1 = null;
          // updatedObject(objP0.mergeWalls.wallPoint0);
        }
      }

      if(obj.mergeWalls.wallPoint1){
        const objP1 = objects.value.find(o => o.id === obj.mergeWalls.wallPoint1);
        if(objP1){
          objP1.mergeWalls.wallPoint0 = null;
          // updatedObject(objP1.mergeWalls.wallPoint1);
        }
      }

      obj = null;

    } else {
      console.warn(`Index ${index} is out of bounds.`);
    }
  };

  const updatedObject = (id: number | string) => {

    // Находим объект по id
    const targetObject = objects.value.find(obj => obj.id === id);

    if (!targetObject) {
      // console.warn(`Object с id ${id} не найден.`);
      return;
    }

    targetObject.updateTime = Date.now();
    // updatedMergeWalls(id);

  };

  const updatedMergeWalls = (rootWallID: number | string) => {

    objects.value.forEach((obj) => {
      // Исключаем объект с rootWallID
      if (obj.id !== rootWallID) {
        obj.updateTime = Date.now(); // Обновляем время изменения
      }
    });
    
  }

  const setNewPointPosition = (id: number | string, indexPoint: number, position: Vector2) => {

    // Находим объект по id
    const targetObject = objects.value.find(obj => obj.id === id);

    if (!targetObject) {
      console.warn(`Object с id ${id} не найден.`);
      return;
    }

    // Проверяем, что индекс точки корректен
    if (!targetObject.points || indexPoint < 0 || indexPoint >= targetObject.points.length) {
      console.warn(`Индекс точки ${indexPoint} выходит за границы массива.`);
      return;
    }

    const startPoint: Vector2 = indexPoint === 0 ? position : targetObject.points[0];
    const endPoint: Vector2 = indexPoint === 0 ? targetObject.points[1] : position;

    const distance = getDistanceBetweenVectors(startPoint, endPoint);

    targetObject.angleDegrees = getAngleBetweenVectors(
      startPoint, 
      {
        x: startPoint.x + distance,
        y: startPoint.y
      },
      endPoint //targetObject.points[1]
    );
    
    if(indexPoint === 0) targetObject.position = position;
    targetObject.width = distance;

    const points = getRectPointsV2(
      distance,
      targetObject.height,
      startPoint,
      endPoint,
      targetObject.heightDirection,
      targetObject.angleDegrees
    );

    // Обновляем точку
    targetObject.points[0] = startPoint;
    targetObject.points[1] = points[1];
    targetObject.points[2] = points[2];
    targetObject.points[3] = points[3];
    
  }

  // Добавляем геттер для получения объекта по id
  const getObjectById = computed(() => {
    return (id: number | string) => objects.value.find(obj => obj.id === id);
  });

  const getPointByPosition = computed(() => {
    return (position: Vector2, ignoreObject: number | string | null = null): { id: number; indexPoint: number } | null => {
      for (const obj of objects.value) {
        const ignore = (ignoreObject !== null && obj.id === ignoreObject) ? true : false;
        
        if (obj.points && !ignore) {
          for (let index = 0; index < 2; index++) {
            const point = obj.points[index];
            if (getDistanceBetweenVectors(point, position) < 10) {
              return { id: obj.id, indexPoint: index };
            }
          }
        }
      }
      return null;
    };
  });
  

  const getCountObjects = computed(() => objects.value.length);

  const getObjects = computed(() => objects.value);

  return {
    objects,
    
    addObj,
    removeObj,
    setNewPointPosition,

    updatedObject,
    updatedMergeWalls,
    
    getObjectById,
    getPointByPosition,
    getCountObjects,
    getObjects
  };
});