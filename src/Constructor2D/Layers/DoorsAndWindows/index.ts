//@ts-nocheck
import * as PIXI from 'pixi.js';
import { MathUtils } from "three";

import { useSchemeTransition } from "@/store/canvasMerge/schemeTransition";
import { useRoomState } from "@/store/appliction/useRoomState";

import {
  Vector2,
} from "@/types/constructor2d/interfaсes";

import {
  IConfig,
  IState,
  IDrawObjects,
  IArgumentDataAddObject,
  IDetachParams,
} from "./interfaces";

import {
  ObjectWall,
  IC2DRoom,
} from "./../Planner/interfaces";

import {
  rect,
  rectV2,
  drawLine,
  // drawCircle,
  drawArc
} from "./../../utils/Shape";

import {
  getDistanceBetweenVectors,
  rotatePointsAroundCenter,
  getMidpoint,
  offsetVectorBySegment,
  adjustSegmentLength,
  offsetVectorBySegmentNormal,
  roundToPrecision,
  getIntersectVectorLine,
  getAngleBetweenVectors,
  isPointOnSegment
} from "./../../utils/Math";

import { handlerDownEventGraphic } from "./methods/events/handlerDown";
import { handlerOverEventGraphic } from "./methods/events/handlerOver";
import { handlerOutEventGraphic } from "./methods/events/handlerOut";
import { handlerStageMouseUp } from "./methods/events/handlerStageMouseUp";
import { handlerStageMouseMove } from "./methods/events/handlerStageMouseMove";

const roomsStore = useSchemeTransition();
const roomState = useRoomState();

export default class DoorsAndWindows {

  private app: PIXI.Application;
  private parent: any;
  private container: PIXI.Container;

  private drawObjects: IDrawObjects[] = [];

  // конфиругация, значения по умолчанию
  private config: IConfig = {

    window: {
      width: 120,
      height: 30,
      lineWidth: 1,
      colors: {
        background: 0xFFFFFF,
        colorEdge: 0x131313,
        colorLine: 0x34A853,
      }
    },

    door: {
      width: 96,
      height: 30,
      lineWidth: 1,
      colors: {
        background: 0xFFFFFF,
        colorEdge: 0x131313,
        colorLine: 0x34A853,
      }
    },

    text: {
      text: "",
      style: {
        fontSize: 16,
        fill: 0x5D6069,
      },
    }

  };

  // состояние слоя
  public state: IState = {

    activeObject: null, // активный объект | id object
    activePointObject: null, // активная точка объекта | index точки объекта

    mouseLeft: null, // состояние левой кнопки мыши

    positionDown: {
      x: 0,
      y: 0,
    },

    oldAngleDegrees: 0,

    oldPosition: [],

  };

  private handlerDownEventGraphic: (e: PIXI.FederatedPointerEvent) => void;
  private handlerOverEventGraphic: (e: PIXI.FederatedPointerEvent) => void;
  private handlerOutEventGraphic: (e: PIXI.FederatedPointerEvent) => void;
  private handlerStageMouseUp: (e: PIXI.FederatedPointerEvent) => void;
  private handlerStageMouseMove: (e: PIXI.FederatedPointerEvent) => void;

  constructor(pixiApp: PIXI.Application, parent: any) {

    if (!pixiApp) throw new Error("PIXI.Application instance is required");

    this.app = pixiApp;
    this.parent = parent;
    this.container = new PIXI.Container();
    this.container.x = 30;
    this.container.y = 30;
    this.app.stage.addChild(this.container);

    this.handlerOverEventGraphic = handlerOverEventGraphic;
    this.handlerOutEventGraphic = handlerOutEventGraphic;
    this.handlerDownEventGraphic = handlerDownEventGraphic.bind(this);
    this.handlerStageMouseUp = handlerStageMouseUp.bind(this);
    this.handlerStageMouseMove = handlerStageMouseMove.bind(this);

    // рисуем графику
    this.init();

    // инициализируем события
    this.setupInteractions();

    // Подписываемся на pointerup/pointermove на stage один раз при создании слоя,
    // чтобы перетаскивание окон и дверей работало сразу после первой загрузки 2D
    // (в init() при пустых комнатах происходит ранний return и подписка не вешалась).
    this.app.stage
      .on("pointerup", this.handlerStageMouseUp)
      .on("pointermove", this.handlerStageMouseMove);

  }

  // Очистка всех объектов перед перезагрузкой
  public clear(): void {
    // Удаляем все объекты
    const objectsToRemove = [...this.drawObjects];
    objectsToRemove.forEach((obj) => {
      this.removeObject(obj.id, false);
    });

    // Очищаем массив
    this.drawObjects = [];
    this.state.activeObject = null;
    this.state.activePointObject = null;
  }

  // инициализация слоя
  // вызывается в конструкторе при запуске приложения
  public init(publicUpdate: boolean = false): void {
    // Очищаем существующие данные перед загрузкой новых
    this.clear();

    const rooms = roomsStore.getAllData(); // получаем комнаты из стора

    // Получаем текущую активную комнату
    let currentRoomId = roomState.getRoomId;
    
    // Если текущей комнаты нет, устанавливаем первую комнату как текущую
    if (!currentRoomId && rooms.length > 0) {
      currentRoomId = rooms[0].id;
      roomState.setCurrentRoomId(currentRoomId);
    }

    // Нормализуем ID для сравнения
    const normalizeId = (value: string | number | null | undefined) => {
      return value !== null && value !== undefined ? String(value) : '';
    };
    const currentRoomIdNormalized = normalizeId(currentRoomId);

    // Фильтруем комнаты - обрабатываем только текущую активную комнату
    const roomsToProcess = rooms.filter((room: any) => {
      const roomIdNormalized = normalizeId(room.id);
      return roomIdNormalized === currentRoomIdNormalized;
    });

    if (roomsToProcess.length === 0) {
      console.warn('Текущая активная комната не найдена в данных для DoorsAndWindows');
      return;
    }

    // Обрабатываем только текущую активную комнату
    roomsToProcess.forEach((room: any) => {

      // получаем объекты комнат, в том числе двери и окна, исключая перегородки (166755)
      const dataObjsects = room.content.filter((item: any) => item.id !== 166755);

      dataObjsects.forEach((object: any) => { // добавляем объекты на холст

        console.log(object)

        const NameObjects: string | null = this.parent.IDObjects.find((item: { id: string | number; name: string; }) => item.id === object.id)?.name ?? null;
        if (!NameObjects) {
          console.warn(`Object with id ${object.id} not found in IDObjects`);
          return;
        }

        // находим стену к которой пренадлежит объект
        const objectPosition: Vector2 = {
          x: object.position.x / 10,
          y: object.position.z / 10
        };
        
        let getBelongsToWall: { id: number | string; point: Vector2 } | null =
          this.parent.layers.planner.getConnectionPointInPolygon(objectPosition);
        
        // Если не нашли стену через getConnectionPointInPolygon, ищем ближайшую по расстоянию
        if (!getBelongsToWall) {
          getBelongsToWall = this.findNearestWall(objectPosition, 50);
          if (getBelongsToWall) {
            console.log(`Wall not found by polygon check, using nearest wall (id: ${getBelongsToWall.id})`);
          }
        }
        
        const dataWall: Pick<ObjectWall, 'id' | 'name' | 'width' | 'height' | 'points' | 'heightDirection' | 'angleDegrees' | 'updateTime'> | null =
          getBelongsToWall
            ? JSON.parse(JSON.stringify((() => {
              const wall = this.parent.layers.planner.objectWalls.find((el: ObjectWall) => el.id === getBelongsToWall.id);
              if (!wall) return null;
              const { id, name, width, height, points, heightDirection, angleDegrees, updateTime } = wall;
              return { id, name, width, height, points, heightDirection, angleDegrees, updateTime };
            })()))
            : null;

        const id: number | string = NameObjects + "__" + MathUtils.generateUUID();

        const defaultOpeningPlan = NameObjects === "door" ? 210 : 150;
        const openingFrom3d =
          object.size?.height > 0 ? object.size.height / 10 : defaultOpeningPlan;
        const distanceFromFloorFrom3d =
          NameObjects === "window" && object.position?.y != null
            ? Math.max(0, object.position.y / 10 - openingFrom3d / 2)
            : 0;

        const dataObject: IDrawObjects = {
          id: id,
          name: NameObjects, // 'door' или 'window'
          width: object.size.width / 10,
          height: object.size.depth / 10,
          openingHeight: openingFrom3d,
          distanceFromFloor: distanceFromFloorFrom3d,
          heightDirection: -1, // по умолчанию
          angleDegrees: MathUtils.radToDeg(object.rotation._y),
          updateTime: Date.now(),
          belongsToWall: {
            id: getBelongsToWall?.id ?? null,
            distanceFromWallStart: 0, // расстояние от начала стены до объекта
          },
          containers: null, // инициализируем позже
          points: [], // инициализируем позже
          roomId: room.id,
        };

        const center: Vector2 = {
          x: object.position.x / 10,
          y: object.position.z / 10
        }
        const p0: Vector2 = {
          x: (object.position.x / 10) - (dataObject.width / 2),
          y: object.position.z / 10
        };
        const p1: Vector2 = {
          x: (object.position.x / 10) + (dataObject.width / 2),
          y: object.position.z / 10
        };

        // p0 и p1 повернуть вокруг center на угол object.rotation._y
        const points = rotatePointsAroundCenter([p0, p1], center, -dataObject.angleDegrees);

        dataObject.angleDegrees = getAngleBetweenVectors(
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
          dataObject.heightDirection * dataObject.height
        );

        const point3: Vector2 = offsetVectorBySegmentNormal(
          [
            points[0],
            points[1]
          ],
          points[0],
          dataObject.heightDirection * dataObject.height
        );

        points.push(point2, point3);

        // Если объект принадлежит стене, проецируем его на стену
        // (аналогично логике в updateObject), чтобы убрать смещение из 3D
        if (getBelongsToWall && dataWall) {
          // Обновляем свойства объекта на основе стены (как в updateObject)
          dataObject.height = dataWall.height;
          dataObject.heightDirection = dataWall.heightDirection;
          dataObject.angleDegrees = dataWall.angleDegrees;

          // Вычисляем расстояние от начала стены до проекции точки[0] на стену
          const projectedPoint0 = getIntersectVectorLine(
            [dataWall.points[0], dataWall.points[1]],
            points[0]
          );

          if (projectedPoint0) {
            // Вычисляем distanceFromWallStart от спроецированной точки
            dataObject.belongsToWall.distanceFromWallStart = getDistanceBetweenVectors(
              dataWall.points[0],
              projectedPoint0
            );

            // Используем ту же логику, что и в updateObject для корректного позиционирования
            const point_0: Vector2 = offsetVectorBySegment(
              [dataWall.points[0], dataWall.points[1]],
              dataWall.points[0],
              dataObject.belongsToWall.distanceFromWallStart
            );
            
            let point_1: Vector2 = {
              x: point_0.x + dataObject.width,
              y: point_0.y
            };
            
            let point_2: Vector2 = JSON.parse(JSON.stringify(point_1));
            point_2.y -= dataObject.height;
            
            let point_3: Vector2 = JSON.parse(JSON.stringify(point_0));
            point_3.y -= dataObject.height;

            // Поворачиваем точки вокруг point_0 на угол стены
            const objectPoints: Vector2[] = rotatePointsAroundCenter([
              point_0,
              point_1,
              point_2,
              point_3
            ], point_0, dataObject.angleDegrees);

            // Используем корректно позиционированные точки
            dataObject.points = objectPoints;
          } else {
            // Если проекция не удалась, используем исходные точки
            dataObject.belongsToWall.distanceFromWallStart = getDistanceBetweenVectors(
              dataWall.points[0],
              points[0]
            );
            dataObject.points = points;
          }
        } else {
          // Если объект не принадлежит стене, используем исходные точки
          dataObject.belongsToWall.distanceFromWallStart = 0;
          dataObject.points = points;
        }

        this.drawObjects.push(dataObject);

        // инициализация котейнеров объекта для рисования
        const result = this.createDrawContainers(id);

        if (result) {
          
          console.log(`Object ${id} initialized`);
          
          // рисуем объект на холсте
          this.draw(id);

        }

      });

    });

    // здесь убрали подписки обработчиков

    console.log('DoorsAndWindows layer initialized with', this.drawObjects.length, 'objects');

  }

  // добавляем объект в слой
  public addObject(data: IArgumentDataAddObject): void {
    /*
    * data.position = {x: 0, y: 0} - position cursor pointer
    * data.type = door | window - тип объекта
    */

    if (!data.type || !data.position) return;

    this.setActiveObject(null);

    // генерация id объекта
    const uuid: string = data.type + '__' + MathUtils.generateUUID();

    // опрелеляем координаты центра сцены и масшта/размер сцены
    const oc: Vector2 = this.parent.config.originOfCoordinates;
    const inverseScale: number = this.parent.config.inverseScale;

    // позиция курсора мыши на canvas'е
    const positionObjectX: number = (data.position.x - 30 - oc.x) * inverseScale;
    const positionObjectY: number = (data.position.y - 30 - oc.y) * inverseScale;
    const canvasPositionMouse: Vector2 = {
      x: positionObjectX,
      y: positionObjectY
    };

    // !!! 1 получить стену под курсором мыши
    const getBelongsToWall: { id: number | string; point: Vector2 } | null =
      this.parent.layers.planner.getConnectionPointInPolygon(canvasPositionMouse);
    const dataWall: Pick<ObjectWall, 'id' | 'name' | 'width' | 'height' | 'points' | 'heightDirection' | 'angleDegrees' | 'updateTime'> | null =
      getBelongsToWall
        ? JSON.parse(JSON.stringify((() => {
          const wall = this.parent.layers.planner.objectWalls.find((el: ObjectWall) => el.id === getBelongsToWall.id);
          if (!wall) return null;
          const { id, name, width, height, points, heightDirection, angleDegrees, updateTime } = wall;
          return { id, name, width, height, points, heightDirection, angleDegrees, updateTime };
        })()))
        : null;

    // !!! 2 получить ширину и высоту объекта относительно стены, если она есть. иначе из конфигурации
    const wallWidth: number = dataWall ? getDistanceBetweenVectors(dataWall?.points[0], dataWall?.points[1]) : this.config[data.type]?.width;
    const distanceFromWallStart: number = getBelongsToWall ? getDistanceBetweenVectors(dataWall?.points[0], getBelongsToWall.point) : 0;
    const objWidth: number = wallWidth > this.config[data.type]?.width ? this.config[data.type]?.width : wallWidth;
    const objHeight: number = dataWall?.height ?? this.config[data.type]?.height;
    const objHeightDirection: -1 | 1 = dataWall?.heightDirection ?? -1;

    // !!! 3 получить угол поворота стены, если она есть. иначе 0
    const objAngleDegrees: number = dataWall?.angleDegrees ?? 0; // угол поворота объекта в градусах

    // 1. определяем точки окна/двери | 4 точки
    let point_0: Vector2 | undefined = getBelongsToWall?.point ?? canvasPositionMouse;
    let point_1: Vector2 | undefined = {
      x: point_0.x + objWidth,
      y: point_0.y
    };
    let point_2: Vector2 | undefined = JSON.parse(JSON.stringify(point_1));
    point_2.y -= objHeight;
    let point_3: Vector2 | undefined = JSON.parse(JSON.stringify(point_0));
    point_3.y -= objHeight;

    let objectPoints: Vector2[] = rotatePointsAroundCenter([
      point_0,
      point_1,
      point_2,
      point_3
    ], point_0, objAngleDegrees);

    const objectData: IDrawObjects = {
      id: uuid,
      name: data.type,
      width: objWidth,
      height: objHeight,
      openingHeight: data.type === "door" ? 210 : 150,
      distanceFromFloor: data.type === "window" ? 90 : 0,
      heightDirection: objHeightDirection,
      angleDegrees: objAngleDegrees,
      updateTime: Date.now(),
      belongsToWall: {
        id: getBelongsToWall?.id ?? null, // объект не принадлежит стене
        distanceFromWallStart: distanceFromWallStart, // расстояние от начала стены до объекта
      },
      containers: null, // инициализируем позже
      points: objectPoints,
      roomId: null,
    };

    { // ищем комноту под курсором, чтобы установить roomId

      const rooms = this.parent.layers.planner.allRooms; // спиосок всех комнат
      let roomIdFound = false;

      // Сначала пытаемся определить комнату по точке объекта
      for (let i = 0, len = rooms.length; i < len; i++) {

        const pointInRoom: boolean = this.parent.layers.planner.isPointInRoom(rooms[i].id, objectPoints[0]);

        if (pointInRoom) {
          objectData.roomId = rooms[i].id;
          roomIdFound = true;
          console.log('>>> Объект находится внутри комнаты:', rooms[i].id);
          break;
        }

      }

      // Если не нашли комнату по точке и объект принадлежит стене, берем roomId из стены
      if (!roomIdFound && getBelongsToWall?.id) {
        const wall = this.parent.layers.planner.objectWalls.find((el: ObjectWall) => el.id === getBelongsToWall.id);
        if (wall && wall.roomId) {
          objectData.roomId = wall.roomId;
          console.log('>>> roomId взят из стены:', wall.roomId);
        }
      }

    }

    this.drawObjects.push(objectData);

    const addedObject = this.drawObjects.find(el => el.id === uuid);

    if (!addedObject) {
      console.error("Failed to add object", data);
      return;
    }

    // инициализация котейнеров объекта для рисования
    const result = this.createDrawContainers(addedObject.id);

    if (result) {

      this.parent.layers.planner?.deactiveWalls(); // деактивируем стены, если они были активны
      this.parent.layers.arrowRulerActiveObject?.clearGraphic();

      this.setActiveObject(addedObject.id); // устанавливаем активный объект и рисуем на холсте

      this.parent.layers.startPointActiveObject.activate([addedObject.points[0], addedObject.points[1]]);

    }

  }

  public setActiveObject(id: string | number | null): void {

    const oldActiveObject = this.state.activeObject;

    if (oldActiveObject === id) return; // Если объект уже активен, ничего не делаем

    this.state.activeObject = id; // Устанавливаем новый активный объект
    this.state.activePointObject = id === null ? null : 0;

    if (oldActiveObject) this.draw(oldActiveObject); // убраем автиность объекта, если он был активен

    if (this.state.activeObject) {
      this.draw(this.state.activeObject); // Рисуем новый активный объект
    }

  }

  private findNearestWall(position: Vector2, maxDistance: number = 50): { id: number | string; point: Vector2 } | null {
    let nearestWall: { id: number | string; point: Vector2; distance: number } | null = null;

    const walls = this.parent.layers.planner.objectWalls;

    for (const wall of walls) {
      if (!wall.points || wall.points.length < 2) continue;

      // Получаем проекцию точки на линию стены
      const projection = getIntersectVectorLine(
        [wall.points[0], wall.points[1]],
        position
      );

      if (!projection) continue;

      // Проверяем, что проекция находится на сегменте стены
      if (!isPointOnSegment(wall.points[0], wall.points[1], projection)) continue;

      // Вычисляем расстояние от точки до проекции
      const distance = getDistanceBetweenVectors(position, projection);

      // Если расстояние в пределах допустимого и меньше текущего минимума
      if (distance <= maxDistance && (!nearestWall || distance < nearestWall.distance)) {
        nearestWall = {
          id: wall.id,
          point: projection,
          distance: distance
        };
      }
    }

    return nearestWall ? { id: nearestWall.id, point: nearestWall.point } : null;
  }

  // создаем контейнеры для визуализации cтены
  private createDrawContainers(id: string | number): number {

    const indexObject = this.drawObjects.findIndex(el => el.id === id);

    if (indexObject == -1) {
      console.error("Object not found for id:", id);
      return 0; // Возвращаем 0, если объект не найден
    }

    const dataObject = this.drawObjects[indexObject];
    if (!dataObject) {
      console.error("Object data not found for id:", id);
      return 0; // Возвращаем 0, если данные объекта не найдены
    }

    if (dataObject.containers) {
      console.warn("Containers already exist for this object:", id);
      return 0; // Возвращаем 0, если контейнеры уже существуют
    }

    // создаем контейнеры для рисования объекта
    dataObject.containers = {
      root: new PIXI.Container(), // родительский контейнер для всех елементов
      mainShape: new PIXI.Graphics(), // основная форма объекта
      line: new PIXI.Graphics(), // линии на объекте mainShape
      rightDistanceText: new PIXI.Text(this.config.text), // отображение размера до края стены
      leftDistanceText: new PIXI.Text(this.config.text), // отображение размера до края стены
      eventGraphic: new PIXI.Graphics(), // место для событий
    };

    if (dataObject.containers.eventGraphic) {
      dataObject.containers.eventGraphic.eventMode = 'static';
      (dataObject.containers.eventGraphic as PIXI.Graphics & { objectId?: string | number }).objectId = dataObject.id;

      // Изменяем курсор на pointer при наведении
      dataObject.containers.eventGraphic.on("mouseover", this.handlerOverEventGraphic);
      // Убираем курсор при уходе мыши
      dataObject.containers.eventGraphic.on("mouseout", this.handlerOutEventGraphic);
      // При клике делаем объект активным и перерисовываем
      dataObject.containers.eventGraphic.on("pointerdown", this.handlerDownEventGraphic);
    }

    if (!dataObject.containers?.root) {
      console.error("Failed to create root container for object:", id);
      return 0; // Возвращаем 0, если не удалось создать корневой контейнер
    }

    this.container.addChild(dataObject.containers.root);
    dataObject.containers.root.addChild(dataObject.containers.mainShape);
    dataObject.containers.root.addChild(dataObject.containers.line);
    dataObject.containers.root.addChild(dataObject.containers.rightDistanceText);
    dataObject.containers.root.addChild(dataObject.containers.leftDistanceText);
    dataObject.containers.root.addChild(dataObject.containers.eventGraphic);

    return 1; // Возвращаем 1, если контейнеры успешно созданы

  }

  // рисуем объект на холсте
  public draw(id: number | string): void {

    const obj: IDrawObjects | undefined = this.drawObjects.find(el => el.id === id);
    if (!obj) {
      console.error("Object not found for id:", id);
      return; // Если объект не найден, выходим из функции
    }

    // Получить контейнеры pixi.js из объекта для его визуализации
    const containers = obj.containers;
    const points = JSON.parse(JSON.stringify(obj.points));
    const idWall = obj.belongsToWall.id;

    const widthObj = getDistanceBetweenVectors(points[0], points[1]);
    const heightObj = getDistanceBetweenVectors(points[0], points[3]);

    if (containers?.mainShape) {
      containers.mainShape.clear();
      rect(
        containers.mainShape,
        {
          points: points,
          heightDirection: obj.heightDirection,
          color: this.config[obj.name].colors.background,
          // colorEdge: this.config[obj.name].colors.colorEdge,
          // widthEdge: this.config[obj.name].lineWidth
        }
      );
    }

    // рисуем линии на объекте
    if (containers?.line) {
      containers.line.clear();

      { // рисуем зеленые линии
        const line_0: Vector2[] = drawLine(
          // graphics: PIXI.Graphics,
          containers.line,
          // startPoint: Vector2,
          points[0],
          // width: number, // Длина стрелки
          widthObj,
          // angleDegrees: number, // Угол направления стрелки в градусах
          obj.angleDegrees,
          // color: number | string = 0x000000, // Цвет стрелки
          this.config[obj.name].colors.colorLine,
          // lineWidth: number = 1, // Толщина линии
          1,
          // clearGraphics: boolean = false, // Флаг: очищать графику или нет
          true, // не очищаем графику
          // stepNormal: number = 0 // смещение линии по нормали
          obj.heightDirection * (heightObj / 2) + 5 // смещение линии по нормали
        );
        const line_1: Vector2[] = drawLine(
          // graphics: PIXI.Graphics,
          containers.line,
          // startPoint: Vector2,
          points[0],
          // width: number, // Длина стрелки
          widthObj,
          // angleDegrees: number, // Угол направления стрелки в градусах
          obj.angleDegrees,
          // color: number | string = 0x000000, // Цвет стрелки
          this.config[obj.name].colors.colorLine,
          // lineWidth: number = 1, // Толщина линии
          1,
          // clearGraphics: boolean = false, // Флаг: очищать графику или нет
          false, // не очищаем графику
          // stepNormal: number = 0 // смещение линии по нормали
          obj.heightDirection * (heightObj / 2) - 5 // смещение линии по нормали
        );
        drawLine(
          // graphics: PIXI.Graphics,
          containers.line,
          // startPoint: Vector2,
          getMidpoint(line_0[0], line_0[1]),
          // width: number, // Длина стрелки
          0,
          // angleDegrees: number, // Угол направления стрелки в градусах
          0,
          // color: number | string = 0x000000, // Цвет стрелки
          this.config[obj.name].colors.colorLine,
          // lineWidth: number = 1, // Толщина линии
          1,
          // clearGraphics: boolean = false, // Флаг: очищать графику или нет
          false, // не очищаем графику
          // stepNormal: number = 0 // смещение линии по нормали
          0, // смещение линии по нормали
          // endPoint: Vector2,
          getMidpoint(line_1[0], line_1[1]),
        );

        if (obj.name === 'door') {
          drawLine(
            // graphics: PIXI.Graphics,
            containers.line,
            // startPoint: Vector2,
            points[0],
            // width: number, // Длина стрелки
            widthObj,
            // angleDegrees: number, // Угол направления стрелки в градусах
            obj.angleDegrees + 45,
            // color: number | string = 0x000000, // Цвет стрелки
            this.config[obj.name].colors.colorLine,
            // lineWidth: number = 1, // Толщина линии
            3,
            // clearGraphics: boolean = false, // Флаг: очищать графику или нет
            false, // не очищаем графику
            // stepNormal: number = 0 // смещение линии по нормали
            0 // смещение линии по нормали
          );
        }
      }

      { // рисуем зеленую арку
        if (obj.name === 'door') {
          drawArc(
            // graphics: PIXI.Graphics,
            containers.line,
            // center: Vector2,
            points[0],
            // radius: number, // Радиус дуги
            widthObj - 10, // радиус дуги
            // startAngleDegrees: number = 0, // Начальный угол в градусах
            obj.angleDegrees, // Начальный угол в градусах          
            // endAngleDegrees: number = 360, // Конечный угол в градусах
            obj.angleDegrees + 45, // Конечный угол в градусах
            // color: number | string = 0x000000, // Цвет дуги
            this.config[obj.name].colors.colorLine, // Цвет дуги
            // lineWidth: number = 1, // Толщина линии
            1, // Толщина линии
            // clearGraphics: boolean = false // Флаг: очищать графику или нет
            false, // не очищаем графику
          );
        }
      }

      containers.rightDistanceText.visible = false;
      containers.rightDistanceText.text = '';
      containers.leftDistanceText.visible = false;
      containers.leftDistanceText.text = '';

      if (this.state.activeObject && idWall) { // рисуем зеленые линейки справа и слева от объекта до краёв стены, если объект принадлежит стене

        const pointsWall: Vector2[] = this.parent.layers.planner.getWallProperty(idWall, 'points');

        // левая линия
        drawLine(
          // graphics: PIXI.Graphics,
          containers.line,
          // startPoint: Vector2,
          pointsWall[0],
          // width: number, // Длина стрелки
          0,
          // angleDegrees: number, // Угол направления стрелки в градусах
          0,
          // color: number | string = 0x000000, // Цвет стрелки
          this.config[obj.name].colors.colorLine,
          // lineWidth: number = 1, // Толщина линии
          2,
          // clearGraphics: boolean = false, // Флаг: очищать графику или нет
          false, // не очищаем графику
          // stepNormal: number = 0 // смещение линии по нормали
          0, // смещение линии по нормали
          // endPoint: Vector2,
          points[0],
        );

        const leftDist: number = roundToPrecision(
          getDistanceBetweenVectors(pointsWall[0], points[0]) * 10,
          0,
        );
        if (leftDist) {
          const leftTextPosition: Vector2 = offsetVectorBySegmentNormal(
            [pointsWall[0], points[0]],
            getMidpoint(pointsWall[0], points[0]),
            12
          );
          containers.leftDistanceText.visible = true;
          containers.leftDistanceText.text = leftDist;
          containers.leftDistanceText.pivot =
            (containers.leftDistanceText.width / 2, containers.leftDistanceText.height / 2);
          containers.leftDistanceText.x = leftTextPosition.x;
          containers.leftDistanceText.y = leftTextPosition.y;
          containers.leftDistanceText.rotation = MathUtils.degToRad(obj.angleDegrees);
        }

        // правая линия
        drawLine(
          // graphics: PIXI.Graphics,
          containers.line,
          // startPoint: Vector2,
          points[1],
          // width: number, // Длина стрелки
          0,
          // angleDegrees: number, // Угол направления стрелки в градусах
          0,
          // color: number | string = 0x000000, // Цвет стрелки
          this.config[obj.name].colors.colorLine,
          // lineWidth: number = 1, // Толщина линии
          2,
          // clearGraphics: boolean = false, // Флаг: очищать графику или нет
          false, // не очищаем графику
          // stepNormal: number = 0 // смещение линии по нормали
          0, // смещение линии по нормали
          // endPoint: Vector2,
          pointsWall[1],
        );

        const rightDist: number =
          roundToPrecision(
            getDistanceBetweenVectors(pointsWall[1], points[1]) * 10,
            0,
          )
        if (rightDist) {
          const rightTextPosition: Vector2 = offsetVectorBySegmentNormal(
            [points[1], pointsWall[1]],
            getMidpoint(pointsWall[1], points[1]),
            12
          );
          containers.rightDistanceText.visible = true;
          containers.rightDistanceText.text = rightDist;
          containers.rightDistanceText.pivot =
            (containers.rightDistanceText.width / 2, containers.rightDistanceText.height / 2);
          containers.rightDistanceText.x = rightTextPosition.x;
          containers.rightDistanceText.y = rightTextPosition.y;
          containers.rightDistanceText.rotation = MathUtils.degToRad(obj.angleDegrees);
        }

      }

      { // рисуем черную рамку отдельными линиями вокруг объекта
        drawLine(
          // graphics: PIXI.Graphics,
          containers.line,
          // startPoint: Vector2,
          points[0],
          // width: number, // Длина стрелки
          0,
          // angleDegrees: number, // Угол направления стрелки в градусах
          0,
          // color: number | string = 0x000000, // Цвет стрелки
          this.config[obj.name].colors.colorEdge,
          // lineWidth: number = 1, // Толщина линии
          2,
          // clearGraphics: boolean = false, // Флаг: очищать графику или нет
          false, // не очищаем графику
          // stepNormal: number = 0 // смещение линии по нормали
          0, // смещение линии по нормали
          // endPoint: Vector2,
          points[1],
        );
        drawLine(
          // graphics: PIXI.Graphics,
          containers.line,
          // startPoint: Vector2,
          points[1],
          // width: number, // Длина стрелки
          0,
          // angleDegrees: number, // Угол направления стрелки в градусах
          0,
          // color: number | string = 0x000000, // Цвет стрелки
          this.config[obj.name].colors.colorEdge,
          // lineWidth: number = 1, // Толщина линии
          1,
          // clearGraphics: boolean = false, // Флаг: очищать графику или нет
          false, // не очищаем графику
          // stepNormal: number = 0 // смещение линии по нормали
          0, // смещение линии по нормали
          // endPoint: Vector2,
          points[2],
        );
        drawLine(
          // graphics: PIXI.Graphics,
          containers.line,
          // startPoint: Vector2,
          points[2],
          // width: number, // Длина стрелки
          0,
          // angleDegrees: number, // Угол направления стрелки в градусах
          0,
          // color: number | string = 0x000000, // Цвет стрелки
          this.config[obj.name].colors.colorEdge,
          // lineWidth: number = 1, // Толщина линии
          1,
          // clearGraphics: boolean = false, // Флаг: очищать графику или нет
          false, // не очищаем графику
          // stepNormal: number = 0 // смещение линии по нормали
          0, // смещение линии по нормали
          // endPoint: Vector2,
          points[3],
        );
        drawLine(
          // graphics: PIXI.Graphics,
          containers.line,
          // startPoint: Vector2,
          points[3],
          // width: number, // Длина стрелки
          0,
          // angleDegrees: number, // Угол направления стрелки в градусах
          0,
          // color: number | string = 0x000000, // Цвет стрелки
          this.config[obj.name].colors.colorEdge,
          // lineWidth: number = 1, // Толщина линии
          1,
          // clearGraphics: boolean = false, // Флаг: очищать графику или нет
          false, // не очищаем графику
          // stepNormal: number = 0 // смещение линии по нормали
          0, // смещение линии по нормали
          // endPoint: Vector2,
          points[0],
        );
      }

      if (containers.eventGraphic) {
        rect(
          containers.eventGraphic,
          {
            points: obj.points,
            heightDirection: obj.heightDirection,
            color: "rgba(255,0,0,0)" //configWall.color.background // Цвет заливки
          }
        );
      }

    }

  }

  public updateObject(idWall: number | string): void {

    this.drawObjects.forEach((obj: IDrawObjects) => {
      if (obj.belongsToWall.id === idWall) {

        // Получаем данные стены
        const dataWall: Pick<ObjectWall, 'id' | 'name' | 'width' | 'height' | 'points' | 'heightDirection' | 'angleDegrees' | 'updateTime'> | null =
          JSON.parse(JSON.stringify((() => {
            const wall = this.parent.layers.planner.objectWalls.find((el: ObjectWall) => el.id === idWall);
            if (!wall) return null;
            const { id, name, width, height, points, heightDirection, angleDegrees, updateTime } = wall;
            return { id, name, width, height, points, heightDirection, angleDegrees, updateTime };
          })()));

        if (!dataWall) {
          console.error("Wall not found for id:", idWall);
          return;
        }

        const points: Vector2[] = dataWall.points;
        const objPoints: Vector2[] = JSON.parse(JSON.stringify(obj.points));
        // obj.width;
        obj.height = dataWall.height;
        obj.angleDegrees = dataWall.angleDegrees;
        obj.updateTime = Date.now();

        const point_0: Vector2 = offsetVectorBySegment(
          [points[0], points[1]],
          points[0],
          obj.belongsToWall.distanceFromWallStart
        );
        let point_1: Vector2 | undefined = {
          x: point_0.x + obj.width,
          y: point_0.y
        };
        let point_2: Vector2 | undefined = JSON.parse(JSON.stringify(point_1));
        point_2.y -= obj.height;
        let point_3: Vector2 | undefined = JSON.parse(JSON.stringify(point_0));
        point_3.y -= obj.height;

        const objectPoints: Vector2[] = rotatePointsAroundCenter([
          point_0,
          point_1,
          point_2,
          point_3
        ], point_0, obj.angleDegrees);

        obj.points[0] = objectPoints[0];
        obj.points[1] = objectPoints[1];
        obj.points[2] = objectPoints[2];
        obj.points[3] = objectPoints[3];

        this.draw(obj.id);

      }
    });

  }

  public updateObjectPoint(position: Vector2, __indexPoint: 0 | 1 | null = null): void {

    const indexPoint: number = __indexPoint !== null ? __indexPoint : this.state.activePointObject;
    const dataObjectIndex: number = this.drawObjects.findIndex(el => el.id === this.state.activeObject);

    if (dataObjectIndex == -1) {
      console.error("Object not found for id:", this.state.activeObject);
      return; // Если объект не найден, выходим из функции
    }

    const dataObject: IDrawObjects | undefined = this.drawObjects[dataObjectIndex];

    if (!dataObject.points[indexPoint]) {
      console.error("Invalid point index:", indexPoint);
      return; // Если индекс точки некорректен, выходим из функции
    }

    // получаем height объекта
    const heightObj: number = dataObject.height;

    const points: Vector2[] = JSON.parse(JSON.stringify(dataObject.points));

    // Изменяет длину отрезка, перемещая точку A или B вдоль линии
    // и возвращает новую позицию точки, которую нужно переместить
    const p = adjustSegmentLength(
      [dataObject.points[0], dataObject.points[1]], // линия отрезка
      indexPoint, // индекс точки, которую нужно переместить
      position, // позиция мыши
    );

    const point_0: Vector2 = indexPoint === 0 ? p : points[0];
    const point_1: Vector2 = indexPoint === 1 ? p : points[1];
    const point_2: Vector2 = offsetVectorBySegmentNormal([point_0, point_1], point_1, heightObj * dataObject.heightDirection);
    const point_3: Vector2 = offsetVectorBySegmentNormal([point_0, point_1], point_0, heightObj * dataObject.heightDirection);

    dataObject.width = getDistanceBetweenVectors(point_0, point_1);

    dataObject.points = [
      point_0,
      point_1,
      point_2,
      point_3
    ];

    this.draw(dataObject.id);

  }

  public getDrawObjectById(id: string | number): IDrawObjects | undefined {
    return this.drawObjects.find((el) => el.id === id);
  }

  /**
   * Ширина и высота проёма в мм для 3D (глубина/толщина на топ-вью не меняются).
   */
  public applyOpeningDimensionsMm(
    objectId: string | number,
    widthMm: number,
    openingHeightMm: number,
    distanceFromFloorMm?: number,
  ): boolean {
    const obj = this.drawObjects.find((el) => el.id === objectId);
    if (!obj || (obj.name !== "door" && obj.name !== "window")) return false;

    const minMm = 200;
    const wMm = Math.max(minMm, widthMm);
    const hMm = Math.max(minMm, openingHeightMm);
    const floorDistanceMm = Math.max(0, distanceFromFloorMm ?? 0);
    const wPlan = wMm / 10;
    const hPlan = hMm / 10;

    obj.openingHeight = hPlan;
    obj.distanceFromFloor = floorDistanceMm / 10;
    obj.updateTime = Date.now();

    const wallId = obj.belongsToWall?.id;
    if (wallId != null) {
      const wall = this.parent.layers.planner.objectWalls.find(
        (w: ObjectWall) => w.id === wallId,
      );
      if (wall?.points?.length >= 2) {
        const wallLen = getDistanceBetweenVectors(wall.points[0], wall.points[1]);
        const eps = 0.02;
        const minPlan = minMm / 10;
        const maxW = Math.max(minPlan, wallLen - eps);
        const clampedW = Math.min(Math.max(minPlan, wPlan), maxW);

        const oldCenterAlong =
          obj.belongsToWall.distanceFromWallStart + obj.width / 2;
        let newStart = oldCenterAlong - clampedW / 2;
        newStart = Math.max(0, Math.min(newStart, wallLen - clampedW));

        obj.width = clampedW;
        obj.belongsToWall.distanceFromWallStart = newStart;
        this.updateObject(wallId);
      }
    } else {
      const p0 = obj.points[0];
      const p1 = obj.points[1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) {
        this.draw(obj.id);
      } else {
        const ux = dx / len;
        const uy = dy / len;
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        const minPlan = minMm / 10;
        const effectiveW = Math.min(Math.max(minPlan, wPlan), len - 0.02);
        const half = effectiveW / 2;
        const newP0 = { x: midX - ux * half, y: midY - uy * half };
        const newP1 = { x: midX + ux * half, y: midY + uy * half };
        const point_2 = offsetVectorBySegmentNormal(
          [newP0, newP1],
          newP1,
          obj.height * obj.heightDirection,
        );
        const point_3 = offsetVectorBySegmentNormal(
          [newP0, newP1],
          newP0,
          obj.height * obj.heightDirection,
        );
        obj.points = [newP0, newP1, point_2, point_3];
        obj.width = effectiveW;
        this.draw(obj.id);
      }
    }

    this.parent.updateRoomStore();
    return true;
  }

  public setupInteractions(): void {
  }

  public updateScenePosition(): void {

    this.container!.x = this.parent.config.originOfCoordinates.x + 30;
    this.container!.y = this.parent.config.originOfCoordinates.y + 30;

  }

  public set scale(v: number) {
    this.container!.scale.set(v);
  }

  public destroy(): void {

    this.drawObjects.forEach((obj: IDrawObjects) => this.removeObject(obj.id));

    this.app.stage
      .off("pointerup", this.handlerStageMouseUp)
      .off("pointermove", this.handlerStageMouseMove);

    // Удаление контейнера
    if (this.container) {
      this.container.destroy({
        children: true,     // Удалить дочерние элементы (если это Container)
        texture: false,     // Удалить текстуру (если она есть)
        baseTexture: false, // Удалить базовую текстуру (если есть)
      });
      this.app.stage.removeChild(this.container);
    }

    this.container = null!;
    this.app = null!;

  }

  // Открепить объект от стены
  public detachFromWall(dataSearch: IDetachParams): void {

    const objs = (dataSearch.type === "wall" && dataSearch.id)
      ? this.drawObjects.filter(el => el.belongsToWall?.id === dataSearch.id) || []
      : ((dataSearch.type === "object" && dataSearch.id)
        ? this.drawObjects.find(el => el.id === dataSearch.id) || []
        : []
      );

    if (!objs || objs.length === 0) return;

    for (const obj of objs) {
      obj.belongsToWall = {
        id: null,
        distanceFromWallStart: 0,
      };

      // obj.angleDegrees = 0;
      this.draw(obj.id);
    }

  }

  public removeObject(__id: string | number | null = null, updateStore: boolean = false): void {

    const id: string | number | null = __id ?? this.state.activeObject;

    if (!id) {
      const error = new Error("OBJECT_REMOVAL_FAILED: Missing object identifier");
      error.code = "ERR_MISSING_ID";
      error.details = {
        receivedId: __id,
        activeObject: this.state.activeObject,
        timestamp: new Date().toISOString()
      };
      console.error(error);
      return;
    }

    this.state.activeObject = null;
    this.state.activePointObject = null;

    const indexObject = this.drawObjects.findIndex(el => el.id === id);

    if (indexObject === -1) {
      console.error("Object not found for id:", id);
      return; // Если объект не найден, выходим из функции
    }

    const dataObject = this.drawObjects[indexObject];
    if (!dataObject) {
      console.error("Object data not found for id:", id);
      return; // Если данные объекта не найдены, выходим из функции
    }

    if (dataObject.containers) {

      // Удаляем все графики из контейнеров
      for (const key in dataObject.containers) {

        if (key === 'root') continue; // Пропускаем корневой контейнер

        const graphic = dataObject.containers[key];

        // отвязываем события от графики
        if (key === "eventGraphic" && graphic instanceof PIXI.Graphics) {
          graphic
            .off("mouseover", this.handlerOverEventGraphic)
            .off("mouseout", this.handlerOutEventGraphic)
            .off("pointerdown", this.handlerDownEventGraphic);
        }

        if (graphic && typeof graphic.destroy === "function") {
          graphic.destroy({
            texture: false,     // Удалить текстуру (если она есть)
            baseTexture: false, // Удалить базовую текстуру (если есть)
          });
        }

        // Убираем из контейнера, если графика существует
        if (dataObject.containers.root && dataObject.containers.root.children.includes(graphic)) dataObject.containers.root.removeChild(graphic);

        dataObject.containers[key] = null!; // Обнуляем ссылку на графику

      }

      // удаляем контейнер root
      try {
        if (dataObject.containers.root && typeof dataObject.containers.root.destroy === "function") {
          dataObject.containers.root.destroy({
            children: true,     // Удалить дочерние элементы (если это Container)
            texture: false,     // Удалить текстуру (если она есть)
            baseTexture: false, // Удалить базовую текстуру (если есть)
          });
        }
        if (
          this.container &&
          this.container.children.includes(dataObject.containers.root)
        ) {
          this.container.removeChild(dataObject.containers.root);
        }
        dataObject.containers.root = null!;
      } catch (error) {
        console.warn(`Failed to destroy graphic: root`, error);
      }

      // Обнуляем ссылки на контейнеры
      dataObject.containers = null;

    }

    // Удаляем объект из массива
    this.drawObjects.splice(indexObject, 1);

    this.parent.layers.startPointActiveObject?.activate(false);

    if(updateStore) this.parent.updateRoomStore();

  }

};