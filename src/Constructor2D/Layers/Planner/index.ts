//@ts-nocheck
import * as PIXI from 'pixi.js';
import { MathUtils } from "three";

import { useSchemeTransition } from "@/store/canvasMerge/schemeTransition";

import { useRoomValidationStore } from '@/store/constructor2d/store/useRoomValidationStore'

import { Vector2 } from '@/types/constructor2d/interfaсes';

import { Events } from '@/store/constructor2d/events';

import {
  ObjectWall,
  ObjectWallContainers,
  Config,
  State,
  ArgumentDataAddWall,
  MergeWalls,
  HoverPointObject,
  IC2DRoom,
  GhostWallPreview,
} from "./interfaces";

import { IDrawObjects } from "./../DoorsAndWindows/interfaces";

import {
  offsetVectorBySegmentNormal,
  // rotatePointsAroundCenter,
  rotatePoint,
  getDistanceBetweenVectors,
  offsetVectorBySegment,
  getMidpoint,
  getAngleBetweenVectors,
  getIntersectionPoint,
  adjustP1ForPerpendicularity,
  doesVectorIntersectSegment,
  isPointInPolygon,
  getIntersectVectorLine,
  adjustSegmentLength,
  findRayLineIntersection,
  isPointNearLine,
  isPointInPolygon,
  getCenterOfPoints,
} from "@/Constructor2D/utils/Math";

import {
  rect,
  drawVerticalLines,
  drawDashedOutline,
  drawArrow,
  drawArrowHead,
  drawShape,
  drawCircle,
  drawLine,
} from "../../utils/Shape";

import { handlerOverEventGraphic } from "./methods/events/handlerOver/index";
import { handlerOutEventGraphic } from "./methods/events/handlerOut/index";
import { handlerDownEventGraphic } from "./methods/events/handlerDown/index";
import { handlerStageMouseUp } from "./methods/events/handlerStageMouseUp/index";
import { handlerStageMouseMove } from "./methods/events/handlerStageMouseMove/index";
import { eventModifyWall } from "./methods/events/eventModifyWall/index";
import { eventRemoveWall } from "./methods/events/eventRemoveWall/index";

import { initRoom } from "./methods/initRoom/index";
import {
  ExactRoomGeometry,
  ExactRoomModel,
  buildClosingWallGeometry,
  extractExactRoomModel,
  insertExactWallBeforeClosing,
  rebuildExactRoomGeometry,
  updateExactWallDisplayAngle,
  updateExactWallLength,
  computeClosingWallCornerAngleDeg,
  validateExactRoomModel,
} from "@/Constructor2D/exactCore";

export default class Planner {

  private app: PIXI.Application;
  private parent: any;
  public container: PIXI.Container;

  private activeObjectGraphic: PIXI.Graphics;
  private ghostPreviewGraphic: PIXI.Graphics;

  private objectWalls: ObjectWall[] = [];

  public roomsMap = new Map<string | number, IC2DRoom>();

  private static readonly EXACT_EPSILON = 1e-6;
  private wallPoint0AngleOverrides = new Map<string, { incomingDir: Vector2; angleDeg: number }>();

  // private roomStore = useSchemeTransition();

  public config: Config = {

    wall: {
      width: 150,
      height: 30,
      heightDirection: -1, // направление толщины стены
      angleDegrees: 180, // + вращение по часовой стрелке, - против часовой стрелки
      color: {
        background: 0xffffff,
        bodyLine: 0x131313,
        borderLine: 0x131313,
        line76deg: 0xA3A9B5,
        arrowLineWall: 0xDA444C,
        arrowHeadLineWall: 0xB19F53,
        arrowHead: 0xB6887E,
        green: 0x8BDE84,
        mediumBlue: 0x4285F4,
        tapeLineColor: 0x5D6069
      }
    }

  }

  private isSameId(a: string | number | null | undefined, b: string | number | null | undefined): boolean {
    return a != null && b != null && String(a) === String(b);
  }

  private getRoomContourWalls(roomId: string | number): ObjectWall[] {
    return this.objectWalls.filter(
      (wall: ObjectWall) => this.isSameId(wall.roomId, roomId) && wall.name !== 'dividing_wall',
    );
  }

  private getWallDisplayLabel(idWall: string | number): string | null {
    const wall = this.objectWalls.find((item: ObjectWall) => this.isSameId(item.id, idWall));
    if (!wall || wall.roomId == null) return null;

    const orderedWalls = this.getOrderedChain(wall.roomId);
    const wallIndex = orderedWalls.findIndex((item: ObjectWall) => this.isSameId(item.id, idWall));

    if (wallIndex === -1) return null;
    return `С${wallIndex + 1}`;
  }

  private getNormalizedVector(from: Vector2, to: Vector2): Vector2 | null {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < Planner.EXACT_EPSILON) return null;
    return {
      x: dx / length,
      y: dy / length,
    };
  }

  // Returns a canonical room order: all editable walls in contour order, closing wall last.
  public getOrderedChain(roomId: string | number): ObjectWall[] {
    const roomWalls = this.getRoomContourWalls(roomId);
    if (roomWalls.length === 0) return [];

    const wallMap = new Map<string, ObjectWall>();
    roomWalls.forEach((wall: ObjectWall) => wallMap.set(String(wall.id), wall));

    const closingWall = roomWalls.find((wall: ObjectWall) => wall.isClosing) ?? roomWalls[roomWalls.length - 1];
    if (!closingWall) return roomWalls;

    const ordered: ObjectWall[] = [];
    const visited = new Set<string>();
    let currentId = closingWall.mergeWalls.wallPoint0;

    while (currentId != null) {
      const key = String(currentId);
      if (visited.has(key) || key === String(closingWall.id)) break;

      const wall = wallMap.get(key);
      if (!wall || wall.isClosing) break;

      ordered.push(wall);
      visited.add(key);
      currentId = wall.mergeWalls.wallPoint0;
    }

    if (ordered.length === 0) {
      const fallback = roomWalls.filter((wall: ObjectWall) => !wall.isClosing);
      ordered.push(...fallback);
    }

    ordered.push(closingWall);
    return ordered;
  }

  public getExactRoomModel(roomId: string | number): ExactRoomModel | null {
    const orderedWalls = this.getOrderedChain(roomId);

    try {
      return extractExactRoomModel(orderedWalls);
    } catch (error) {
      console.warn("Failed to extract exact room model:", error);
      return null;
    }
  }

  public rebuildExactRoomGeometry(roomId: string | number): ExactRoomGeometry | null {
    const model = this.getExactRoomModel(roomId);
    if (!model) return null;

    try {
      return rebuildExactRoomGeometry(model);
    } catch (error) {
      console.warn("Failed to rebuild exact room geometry:", error);
      return null;
    }
  }

  public buildExactClosingWallGeometry(roomId: string | number): ReturnType<typeof buildClosingWallGeometry> {
    const model = this.getExactRoomModel(roomId);
    if (!model) return null;

    const regularGeometry = rebuildExactRoomGeometry(model).regularWalls;

    try {
      return buildClosingWallGeometry(model, regularGeometry);
    } catch (error) {
      console.warn("Failed to build exact closing wall geometry:", error);
      return null;
    }
  }

  public commitExactRoomGeometry(roomId: string | number, geometry: ExactRoomGeometry): boolean {
    if (!geometry || geometry.roomId == null || !this.isSameId(geometry.roomId, roomId)) {
      return false;
    }

    const applyLineGeometryToWall = (
      wallId: string | number,
      line: { point0: Vector2; point1: Vector2; width: number; angleDegrees: number },
    ): boolean => {
      const wall = this.objectWalls.find((item: ObjectWall) => this.isSameId(item.id, wallId));
      if (!wall) return false;

      wall.points = this.calculatePositionPointsWall(
        line.point0,
        line.point1,
        wall.height,
        wall.heightDirection,
      );
      wall.width = line.width;
      wall.angleDegrees = line.angleDegrees;
      return true;
    };

    const updatedWallIds = new Set<string | number>();

    geometry.regularWalls.forEach((line) => {
      const ok = applyLineGeometryToWall(line.wallId, line);
      if (ok) updatedWallIds.add(line.wallId);
    });

    if (geometry.closingWall) {
      const ok = applyLineGeometryToWall(geometry.closingWall.wallId, geometry.closingWall);
      if (ok) updatedWallIds.add(geometry.closingWall.wallId);
    }

    if (updatedWallIds.size === 0) {
      return false;
    }

    this.clearWallAngleOverrides();

    updatedWallIds.forEach((wallId) => {
      this.drawWall(wallId);
    });

    this.redrawHalfRoom();

    return true;
  }

  // Snapshot context for exact wall edits so angle/length logic can rely on stable topology.
  public getExactWallEditContext(wallId: string | number): {
    roomId: string | number;
    orderedWalls: ObjectWall[];
    editableWalls: ObjectWall[];
    wall: ObjectWall;
    wallIndex: number;
    previousWall: ObjectWall | null;
    nextWall: ObjectWall | null;
    tailWalls: ObjectWall[];
    closingWall: ObjectWall | null;
    point0: Vector2;
    point1: Vector2;
    wallLength: number;
    incomingDir: Vector2 | null;
  } | null {
    const wall = this.objectWalls.find((item: ObjectWall) => this.isSameId(item.id, wallId));
    if (!wall || wall.roomId == null || wall.isClosing) return null;

    const orderedWalls = this.getOrderedChain(wall.roomId);
    const editableWalls = orderedWalls.filter((item: ObjectWall) => !item.isClosing);
    const wallIndex = editableWalls.findIndex((item: ObjectWall) => this.isSameId(item.id, wallId));
    if (wallIndex === -1) return null;

    const previousWall = wallIndex > 0 ? editableWalls[wallIndex - 1] : orderedWalls[orderedWalls.length - 1] ?? null;
    const nextWall = wallIndex < editableWalls.length - 1 ? editableWalls[wallIndex + 1] : null;
    const tailWalls = editableWalls.slice(wallIndex + 1);
    const closingWall = orderedWalls.find((item: ObjectWall) => item.isClosing) ?? null;

    const point0: Vector2 = { x: wall.points[0].x, y: wall.points[0].y };
    const point1: Vector2 = { x: wall.points[1].x, y: wall.points[1].y };
    const wallLength = getDistanceBetweenVectors(point0, point1);

    let incomingDir: Vector2 | null = null;
    if (previousWall) {
      incomingDir = this.getNormalizedVector(previousWall.points[0], previousWall.points[1]);
    }

    return {
      roomId: wall.roomId,
      orderedWalls,
      editableWalls,
      wall,
      wallIndex,
      previousWall,
      nextWall,
      tailWalls,
      closingWall,
      point0,
      point1,
      wallLength,
      incomingDir,
    };
  }

  private getIncomingReferencePoint(pivot: Vector2, incomingDir: Vector2, distance: number): Vector2 {
    const referenceDistance = Math.max(distance, 100);
    return {
      x: pivot.x - incomingDir.x * referenceDistance,
      y: pivot.y - incomingDir.y * referenceDistance,
    };
  }

  public getWallPoint0AngleGeometry(wallId: string | number): {
    point0Reference: Vector2;
    point1Pivot: Vector2;
    point2WallEnd: Vector2;
    currentAngleDeg: number;
    incomingDir: Vector2 | null;
  } | null {
    const context = this.getExactWallEditContext(wallId);
    if (!context) {
      const wall = this.objectWalls.find((item: ObjectWall) => this.isSameId(item.id, wallId));
      if (!wall || !wall.mergeWalls.wallPoint1) return null;

      const previousWall = this.objectWalls.find((item: ObjectWall) => this.isSameId(item.id, wall.mergeWalls.wallPoint1));
      if (!previousWall) return null;

      const point1Pivot = { x: wall.points[0].x, y: wall.points[0].y };
      const point2WallEnd = { x: wall.points[1].x, y: wall.points[1].y };
      const point0Reference = { x: previousWall.points[0].x, y: previousWall.points[0].y };

      return {
        point0Reference,
        point1Pivot,
        point2WallEnd,
        currentAngleDeg: this.getDisplayedCornerAngleDeg(point0Reference, point1Pivot, point2WallEnd),
        incomingDir: this.getNormalizedVector(previousWall.points[0], previousWall.points[1]),
      };
    }

    const override = this.wallPoint0AngleOverrides.get(String(wallId));
    const effectiveIncomingDir =
      context.previousWall?.isClosing && override?.incomingDir
        ? override.incomingDir
        : context.incomingDir;
    const point0Reference = effectiveIncomingDir
      ? this.getIncomingReferencePoint(context.point0, effectiveIncomingDir, context.wallLength)
      : (context.previousWall ? { ...context.previousWall.points[0] } : { x: context.point0.x - 100, y: context.point0.y });
    const currentAngleDeg =
      context.previousWall?.isClosing && override?.angleDeg != null
        ? override.angleDeg
        : this.getDisplayedCornerAngleDeg(point0Reference, context.point0, context.point1);

    return {
      point0Reference,
      point1Pivot: { ...context.point0 },
      point2WallEnd: { ...context.point1 },
      currentAngleDeg,
      incomingDir: effectiveIncomingDir,
    };
  }

  public isWallPoint0AngleEditable(wallId: string | number): boolean {
    const wall = this.objectWalls.find((item: ObjectWall) => this.isSameId(item.id, wallId));
    if (!wall || wall.isClosing) return false;
    const context = this.getExactWallEditContext(wallId);
    return context?.incomingDir != null;
  }

  public clearWallAngleOverrides(): void {
    this.wallPoint0AngleOverrides.clear();
  }

  public state: State = {

    activeWall: null, // null | string | number
    activePointWall: null, // null | 0 | 1

    mouseLeft: false, // left mouse button
    positionDown: { // позиция курсора, когда нажали кнопку мыши
      x: 0,
      y: 0
    },
    oldPosition: [],
<<<<<<< HEAD
    dragRoomId: null,
    dragAngleStepDeg: 1,
    dragLastCommittedAngles: null,
    hasAngleStepCommit: false
=======
>>>>>>> 4e3dbf34f155bd0d488801828cee0d61107f5b07

  }

  // events
  private handlerOverEventGraphic: (e: PIXI.FederatedPointerEvent) => void;
  private handlerOutEventGraphic: (e: PIXI.FederatedPointerEvent) => void;
  private handlerDownEventGraphic: (e: PIXI.FederatedPointerEvent) => void;
  private handlerStageMouseUp: (e: PIXI.FederatedPointerEvent) => void;
  private handlerStageMouseMove: (e: PIXI.FederatedPointerEvent) => void;
  private eventModifyWall: (data: { width: number, height: number }) => void;
  private eventRemoveWall: () => void;

  private initRoom: () => (0 | 1);

  private roomValidationStore = useRoomValidationStore()

  constructor(pixiApp: PIXI.Application, parent: any) {
    if (!pixiApp) throw new Error("PIXI.Application instance is required");

    this.app = pixiApp;
    this.parent = parent;
    this.container = new PIXI.Container();
    this.container.position.set(30, 30);
    this.app.stage.addChild(this.container);

    this.activeObjectGraphic = new PIXI.Graphics();
    this.app.stage.addChild(this.activeObjectGraphic);
    this.ghostPreviewGraphic = new PIXI.Graphics();
    this.container.addChild(this.ghostPreviewGraphic);

    // event methods
    this.handlerOverEventGraphic = handlerOverEventGraphic;
    this.handlerOutEventGraphic = handlerOutEventGraphic;
    this.handlerDownEventGraphic = handlerDownEventGraphic.bind(this);
    this.handlerStageMouseUp = handlerStageMouseUp.bind(this);
    this.handlerStageMouseMove = handlerStageMouseMove.bind(this);
    this.eventModifyWall = eventModifyWall.bind(this);
    this.eventRemoveWall = eventRemoveWall.bind(this);

    // managers
    // this.dimensionDisplay = new DimensionDisplay( // отображения размеров стены с размерам приналежащих к стене объектов
    //   this.parent
    // );

    this.parent.eventBus.on(Events.C2D_MODIFY_WALL, this.eventModifyWall);
    this.parent.eventBus.on(Events.C2D_REMOVE_WALL, this.eventRemoveWall);

    this.initRoom = initRoom.bind(this);

    this.init();
  }

  // Очистка всех стен и комнат перед перезагрузкой
  public clear(): void {
    this.clearGhostPreview();
    // Очищаем разметку размеров стен
    this.parent?.layers?.dimensionDisplay?.hide();
    // Очищаем активные точки стен (синие точки с углом)
    this.parent?.layers?.startPointActiveObject?.activate(false);
    this.parent?.layers?.arrowRulerActiveObject?.clearGraphic();
    
    // Очищаем графику всех стен
    this.objectWalls.forEach((drawObject) => {
      const containers = drawObject.containers;

      if (containers) {
        for (const key in containers) {
          if (
            key === "root" ||
            key === "containerTextRulerWall" ||
            key === "textRulerWall"
          ) continue;

          const graphic = containers[key];

          if (graphic && typeof graphic.destroy === "function") {
            try {
              if (key === "eventGraphic" && graphic instanceof PIXI.Graphics) {
                graphic
                  .off("mouseover", this.handlerOverEventGraphic)
                  .off("mouseout", this.handlerOutEventGraphic)
                  .off("pointerdown", this.handlerDownEventGraphic);
              }

              if (!graphic.destroyed) {
                graphic.destroy({
                  texture: false,
                  baseTexture: false,
                });
              }

              if (containers.root && containers.root.children.includes(graphic)) {
                containers.root.removeChild(graphic);
              }

              containers[key as keyof ObjectWallContainers] = null!;
            } catch (error) {
              console.warn(`Failed to destroy graphic: ${key}`, error);
            }
          }
        }

        // Удаляем textRulerWall
        try {
          if (containers.textRulerWall && typeof containers.textRulerWall.destroy === "function") {
            containers.textRulerWall.destroy(true);
          }
          if (
            containers.containerTextRulerWall &&
            containers.containerTextRulerWall.children.includes(containers.textRulerWall)
          ) {
            containers.containerTextRulerWall.removeChild(containers.textRulerWall);
          }
          containers.textRulerWall = null!;
        } catch (error) {
          console.warn(`Failed to destroy textRulerWall`, error);
        }

        // Удаляем containerTextRulerWall
        try {
          if (containers.containerTextRulerWall && typeof containers.containerTextRulerWall.destroy === "function") {
            containers.containerTextRulerWall.destroy(true);
          }
          if (
            containers.root &&
            containers.root.children.includes(containers.containerTextRulerWall)
          ) {
            containers.root.removeChild(containers.containerTextRulerWall);
          }
          containers.containerTextRulerWall = null!;
        } catch (error) {
          console.warn(`Failed to destroy containerTextRulerWall`, error);
        }

        // Удаляем root контейнер
        try {
          if (containers.root && typeof containers.root.destroy === "function") {
            containers.root.destroy({
              children: true,
              texture: false,
              baseTexture: false,
            });
          }
          if (
            this.container &&
            this.container.children.includes(containers.root)
          ) {
            this.container.removeChild(containers.root);
          }
          containers.root = null!;
        } catch (error) {
          console.warn(`Failed to destroy root`, error);
        }
      }
    });

    // Очищаем массивы и карты
    this.objectWalls = [];
    this.roomsMap.clear();
    this.state.activeWall = null;
    this.state.activePointWall = null;

    // Очищаем слой пола комнаты (серая область)
    if (this.parent?.layers?.halfRoom) {
      this.parent.layers.halfRoom.removeHalfRoom();
    }
  }

  // инициализация объектов для визуализации при запуске приложения
  public init(publicUpdate: boolean = false): void {
    // Очищаем существующие данные перед загрузкой новых
    this.clear();

    const result = this.initRoom();

    if (result) {

      const objs = this.objectWalls;
      if (objs.length > 0) {
        for (let i = 0, len = objs.length; i < len; i++) {
          const id = objs[i].id;
          // создаем контейнеры для визуализации стены
          const result = this.createDrawContainers(id);
          // визуализируем объект
          if (result) {
            this.drawWall(id);
          }
        }
      }

    }

    this.redrawHalfRoom();

    if(!publicUpdate){
      this.app.stage
        .on("pointerup", this.handlerStageMouseUp)
        .on("mousemove", this.handlerStageMouseMove);
    }

    console.log('Planner initialized with', this.objectWalls.length, 'walls');

  }

  private checkAndCreateRoomFromConnectedWalls()
  // добавление новой комнаты
  public addRoom(
    id: string | number | null = null, 
    label: string | null = null, 
    description: string = ''
  ): string {

    const rId: string | number = id ? id : MathUtils.generateUUID();

    if (this.roomsMap.has(rId)) {
      throw new Error(`Room with ID ${rId} already exists`);
    }

    const countRooms: number = this.roomsMap.size;

    this.roomsMap.set(rId, {
      id: rId,
      label: label ?? `Комната ${countRooms + 1}`,
      description: description,
    });

    return rId;

  }

  // Получение комнаты по ID
  public getRoom(id: string | number) {

    if (!id) return undefined;

    return this.roomsMap.get(id);

  }

  // удаление комнаты по ID
  public removeRoom(id: string | number): boolean {

    if (!this.roomsMap.has(id)) {
      console.error(`Room with ID ${id} does not exist`);
      return false;
    }

    this.roomsMap.delete(id);

    return true;

  }

  // получение всех комнат
  get allRooms(): IC2DRoom[] {

    return Array.from(this.roomsMap.values());

  }

  private calculatePositionPointsWall(point0: Vector2, point1: Vector2, height: number, heightDirection: -1 | 1): [Vector2, Vector2, Vector2, Vector2] {

    let point2: Vector2 = offsetVectorBySegmentNormal(
      [point0, point1],
      point1,
      height * heightDirection
    );
    let point3: Vector2 = offsetVectorBySegmentNormal(
      [point0, point1],
      point0,
      height * heightDirection
    );

    return [
      point0,
      point1,
      point2,
      point3
    ];

  }

  // добавление стены в класс Planner при пересаскивании из меню с помощью drag and drop
  public addWall(data: ArgumentDataAddWall): void {

    /*
    * data.position = {x: 0, y: 0} - position cursor pointer
    * data.type = wall | wall_vertical
    */

    if (!data.type || !data.position) return;

    // генерация id объекта
    const uuid: string = data.type + '__' + MathUtils.generateUUID();

    // 1. создаем данные стены
    const oc: Vector2 = this.parent.config.originOfCoordinates;
    const inverseScale: number = this.parent.config.inverseScale;

    // позиция курсора мыши на canvas'е
    const positionObjectX: number = (data.position.x - 30 - oc.x) * inverseScale;
    const positionObjectY: number = (data.position.y - 30 - oc.y) * inverseScale;
    const canvasPositionMouse: Vector2 = {
      x: positionObjectX,
      y: positionObjectY
    };

    let linePoint_0: Vector2 | undefined = canvasPositionMouse;
    let linePoint_1: Vector2 | undefined = {
      x: canvasPositionMouse.x + this.config.wall.width,
      y: canvasPositionMouse.y
    };

    if (data.type === 'wall_vertical') {
      linePoint_0 = canvasPositionMouse;
      linePoint_1 = {
        x: canvasPositionMouse.x,
        y: canvasPositionMouse.y + this.config.wall.width
      }
    }

    // ищем точку стены под курсором
    let hoverPointObject: HoverPointObject | null;
    if (data.type === 'dividing_wall') { // внутренняя стена
      /*
      * определяем точку к которой конектится внутренняя стена
      */
      hoverPointObject = this.getConnectionPointInPolygon({
        x: positionObjectX,
        y: positionObjectY
      }); // id, point

    } else {
      hoverPointObject = this.getPointByPosition({
        x: positionObjectX,
        y: positionObjectY
      });
    }

    // стена под курсором
    let wallUnderCursor: ObjectWall | undefined = hoverPointObject ? this.objectWalls.find(el => el.id === hoverPointObject.id) : undefined;

    if (data.type === 'dividing_wall' && hoverPointObject) {
      wallUnderCursor = this.objectWalls.find(el => el.id === hoverPointObject.id);
      if (wallUnderCursor) {
        linePoint_0 = hoverPointObject.point;
        linePoint_1 = offsetVectorBySegmentNormal(
          [
            wallUnderCursor.points[0],
            wallUnderCursor.points[1]
          ],
          hoverPointObject.point,
          -this.config.wall.width * wallUnderCursor.heightDirection
        );
      }
    }

    let angleDegreesConnectWall: number = 0;
    let directionX: number = 1;
    let directionY: number = 1;

    if (hoverPointObject) {

      const hoverDataWall: ObjectWall | undefined = this.objectWalls.find((el: ObjectWall) => el.id === hoverPointObject.id);

      if (hoverDataWall) {

        const hoverPoints: Vector2[] = hoverDataWall.points;
        angleDegreesConnectWall = hoverDataWall.angleDegrees;

        if (hoverPointObject.indexPoint == 0 && hoverDataWall.mergeWalls.wallPoint1 === null) {

          if (data.type === 'wall_vertical') { // направление стены относительно к присоединяемой под углом 90 градусов

            linePoint_0 = offsetVectorBySegmentNormal(
              [hoverPoints[0], hoverPoints[1]],
              hoverPoints[0],
              (this.parent.state.keys.shift ? this.config.wall.width : -this.config.wall.width) * this.config.wall.heightDirection
            );
            linePoint_1 = hoverPoints[0];

          } else if (data.type === 'wall') { // направдение стены относительно к присоединяемой под углом 0 градусов, то есть ее продолжает

            linePoint_0 = offsetVectorBySegment(
              [hoverPoints[0], hoverPoints[1]],
              hoverPoints[0],
              -this.config.wall.width
            );
            linePoint_1 = hoverPoints[0];

          }

        } else if (hoverPointObject.indexPoint == 1 && hoverDataWall.mergeWalls.wallPoint0 === null) {

          if (data.type === 'wall_vertical') { // направление стены относительно к присоединяемой под углом 90 градусов

            linePoint_0 = hoverPoints[1];
            linePoint_1 = offsetVectorBySegmentNormal(
              [hoverPoints[0], hoverPoints[1]],
              hoverPoints[1],
              (this.parent.state.keys.shift ? this.config.wall.width : -this.config.wall.width) * this.config.wall.heightDirection
            );

          } else if (data.type === 'wall') { // направление стены относительно к присоединяемой под углом 0 градусов, то есть ее продолжает

            linePoint_0 = hoverPoints[1];
            linePoint_1 = offsetVectorBySegment(
              [hoverPoints[0], hoverPoints[1]],
              hoverPoints[1],
              this.config.wall.width
            );

          }

        }

      }

    }

    if (linePoint_0.x < 0) linePoint_0.x = 0;
    if (linePoint_0.y < 0) linePoint_0.y = 0;
    if (linePoint_1.x < 0) linePoint_1.x = 0;
    if (linePoint_1.y < 0) linePoint_1.y = 0;

    let point2: Vector2 = offsetVectorBySegmentNormal(
      [linePoint_0, linePoint_1],
      linePoint_1,
      this.config.wall.height * this.config.wall.heightDirection
    );
    let point3: Vector2 = offsetVectorBySegmentNormal(
      [linePoint_0, linePoint_1],
      linePoint_0,
      this.config.wall.height * this.config.wall.heightDirection
    );

    let pointsWall: Vector2[] = [
      linePoint_0,
      linePoint_1,
      point2,
      point3
    ];

    // обновить угол наклона стены
    const angleDegrees = getAngleBetweenVectors(
      pointsWall[0],
      {
        x: pointsWall[0].x + 300,
        y: pointsWall[0].y
      },
      pointsWall[1]
    );

    let mergeWalls: MergeWalls = {
      wallPoint0: null, // 0 точка другой стены
      wallPoint1: null  // 1 точка другой стены
    };

    if (hoverPointObject) {

      if (hoverPointObject.indexPoint == 0) {
        const otherMergeWallID: number = this.objectWalls.findIndex(el => el.id === hoverPointObject.id);
        if (otherMergeWallID != -1 && this.objectWalls[otherMergeWallID].mergeWalls.wallPoint1 === null) {
          mergeWalls.wallPoint0 = hoverPointObject.id; // 0 точка другой стены hoverPointObject.id
          this.objectWalls[otherMergeWallID].mergeWalls.wallPoint1 = uuid;
        }
      }

      if (hoverPointObject.indexPoint == 1) {
        const otherMergeWallID: number = this.objectWalls.findIndex(el => el.id === hoverPointObject.id);
        if (otherMergeWallID != -1 && this.objectWalls[otherMergeWallID].mergeWalls.wallPoint0 === null) {
          mergeWalls.wallPoint1 = hoverPointObject.id; // 1 точка другой стены hoverPointObject.id
          this.objectWalls[otherMergeWallID].mergeWalls.wallPoint0 = uuid;
        }
      }

    }

    const wallData: ObjectWall = {
      id: uuid,
      name: data.type,
      width: this.config.wall.width,
      height: this.config.wall.height,
      heightDirection: this.config.wall.heightDirection,
      angleDegrees: angleDegrees,
      updateTime: Date.now(),
      mergeWalls: mergeWalls,
      points: pointsWall,
      roomId: null,
    };

    if (wallUnderCursor) { // определение комнаты для стены

      wallData.roomId = wallUnderCursor.roomId;

    } else { // создаем комнату

      if (data.type !== 'dividing_wall') {

        // вызываем метод создания комнаты
        const rId: number | string = this.addRoom();

        if (!rId) {
          throw new Error("Failed to create a new room"); // throw error
        }

        wallData.roomId = rId;

      } else { // определяем, находится ли перегородка внутри какой-то комнаты или нет

        const rooms = this.allRooms; // спиосок всех комнат

        if(!rooms || rooms.length === 0){
          console.log('No rooms available for processing');
        }
        
        const originObject: Vector2 = getCenterOfPoints(wallData.points); // находим центр нового объекта

        if (!originObject) {
          console.error("Origin object is not defined.");
        } else {

          for (let i = 0, len = rooms.length; i < len; i++) {

            const pointInRoom: boolean = this.isPointInRoom(rooms[i].id, originObject);

            if (pointInRoom) {
              console.log('>>> Объект находится внутри комнаты');
              wallData.roomId = rooms[i].id;
              break;
            }

          }
          
        }

      }

    }

    console.log('all rooms:', this.allRooms);

    // 2. добавляем данные стены в this.objectWalls
    if (wallData.mergeWalls.wallPoint0) {

      const indexMergeWall = this.objectWalls.findIndex((el: ObjectWall) => el.id === wallData.mergeWalls.wallPoint0);
      if (indexMergeWall != -1) {
        this.objectWalls.splice(indexMergeWall, 0, wallData);
      }

    } else if (wallData.mergeWalls.wallPoint1) {

      const indexMergeWall = this.objectWalls.findIndex((el: ObjectWall) => el.id === wallData.mergeWalls.wallPoint1);
      if (indexMergeWall != -1) {
        this.objectWalls.splice(indexMergeWall + 1, 0, wallData);
      }

    } else {
      this.objectWalls.push(wallData);
    }
    // this.updateRoomStore(wallData.id, (wallData.mergeWalls.wallPoint0 || wallData.mergeWalls.wallPoint1 ? true : false));

    // 3. получаем из this.objectWalls добавленный объект и берем id
    const addedwall = this.objectWalls.find(el => el.id === uuid);
    const id = addedwall?.id;

    if (id) {

      // создаем контейнеры для визуализации стены
      const result = this.createDrawContainers(id);

      if (result) {
        const prevActiveObject = this.state.activeWall;
        this.state.activePointWall = 0;
        this.state.activeWall = id;
        if (prevActiveObject) {

          // если прошлая активная стена не соединяется с добавленной, то ее перерисовываем
          if (
            wallData.mergeWalls.wallPoint0 !== prevActiveObject &&
            wallData.mergeWalls.wallPoint1 !== prevActiveObject
          ) {
            this.drawWall(prevActiveObject);
          }

          const listRelatedWalls: (string | number)[] = this.getMergeWallsIDForUpdate(id);

          // визуализация списка стен и доабвляемая в списке
          this.drawListWalls(listRelatedWalls);


        } else {
          if (data.type === 'dividing_wall') {
            this.drawWall(id);
          } else {
            this.redrawAllObjects();
          }
        }
        this.parent.layers.startPointActiveObject.activate([pointsWall[0], pointsWall[1]]);
        this.parent.layers.arrowRulerActiveObject.draw(pointsWall[0]);

        this.parent.layers.startPointActiveObject.circleStartPoint.cursor = "pointer";
        this.app.stage.cursor = "pointer";

        this.parent.layers.startPointActiveObject.startPointRect.rotation = MathUtils.degToRad(wallData.angleDegrees);
        this.parent.layers.startPointActiveObject.endPointRect.rotation = MathUtils.degToRad(wallData.angleDegrees);

        if (data.type !== 'dividing_wall') this.redrawHalfRoom();

        // отображаем форму модификации стены
        this.parent.eventBus.emit(Events.C2D_SHOW_FORM_MODIFY_WALL, {
          width: addedwall.width * 10,
          height: addedwall.height * 10,
          position: {
            x: addedwall.points[0].x + this.parent.config.originOfCoordinates.x,
            y: addedwall.points[0].y + this.parent.config.originOfCoordinates.y
          }
        });

      }

    }

  }

  public isPointInRoom(roomId: number | string, targetPoint: Vector2): boolean {

    const isSameId = (a: string | number | null | undefined, b: string | number | null | undefined) => {
      if (a === undefined || a === null || b === undefined || b === null) return false;
      return String(a) === String(b);
    };

    // Проверка входных параметров
    if (!roomId || !targetPoint) {
      throw new Error(`Invalid parameters: roomId(${roomId}) and targetPoint(${JSON.stringify(targetPoint)}) are required`);
    }

    const polygonPoints: Vector2[] = this.getRoomContour(roomId);

    // 5. Проверка принадлежности точки
    return isPointInPolygon(polygonPoints, targetPoint);

  }

  public getRoomContour(roomId: number | string): Vector2[] {

    const isSameId = (a: string | number | null | undefined, b: string | number | null | undefined) => {
      if (a === undefined || a === null || b === undefined || b === null) return false;
      return String(a) === String(b);
    };

    // Настройки точности
    const precision = 2;
    const pointKey = (p: Vector2): string => `${p.x.toFixed(precision)},${p.y.toFixed(precision)}`;

    // Сбор стен комнаты
    const roomWalls = this.objectWalls.filter(
      (wall) => isSameId(wall.roomId, roomId) && wall.name !== 'dividing_wall' && wall.points?.length >= 4
    );

    if (roomWalls.length === 0) {
      return [];
    }
    
    // Если стен меньше двух, возвращаем точки как есть
    if (roomWalls.length < 2) {
      const wall = roomWalls[0];
      if (!wall.points || wall.points.length < 2) return [];
      return [wall.points[0], wall.points[1]];
    }

    const wallMap = new Map<string | number, ObjectWall>();
    roomWalls.forEach(wall => wallMap.set(wall.id, wall));

    // Функция для получения внутренней границы стены (контур комнаты проходит по внутренней стороне стен)
    // Используем точки 2 и 3, которые находятся на внутренней стороне стены относительно heightDirection
    const getInnerEdge = (wall: ObjectWall): [Vector2, Vector2] => {
      // Стена имеет 4 точки:
      // points[0], points[1] - основные точки стены (начало и конец)
      // points[2], points[3] - точки на противоположной стороне от основной линии
      // Внутренняя сторона стены - это сторона, обращенная внутрь комнаты
      // Для heightDirection = 1: внутренняя сторона - points[3] -> points[2]
      // Для heightDirection = -1: внутренняя сторона - points[0] -> points[1]
      // Но на практике, для правильного построения контура нужно использовать points[3] -> points[2]
      // так как они всегда находятся на внутренней стороне относительно основной линии
      if (wall.heightDirection === 1) {
        return [wall.points[3], wall.points[2]];
      } else {
        // Для heightDirection = -1 внутренняя сторона - это основная линия
        return [wall.points[0], wall.points[1]];
      }
    };

    // Функция для получения продолжения линии (для поиска пересечений при вогнутых углах)
    const extendLine = (edge: [Vector2, Vector2], extendBy: number = 10000): [Vector2, Vector2] => {
      const [p1, p2] = edge;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return edge;
      
      const unitX = dx / len;
      const unitY = dy / len;
      
      return [
        { x: p1.x - unitX * extendBy, y: p1.y - unitY * extendBy },
        { x: p2.x + unitX * extendBy, y: p2.y + unitY * extendBy }
      ];
    };

    // Собираем все углы комнаты: для каждой пары соединенных стен находим точку пересечения их внутренних границ
    const wallCorners = new Map<string | number, Vector2[]>(); // wallId -> [corner1, corner2]
    
    for (const wall of roomWalls) {
      const [wallStart, wallEnd] = getInnerEdge(wall);
      const wallEdge = [wallStart, wallEnd] as [Vector2, Vector2];
      const extendedWallEdge = extendLine(wallEdge);
      const corners: Vector2[] = [];
      
      // Проверяем соединение через wallPoint0 (точка 0 стены соединена с другой стеной)
      if (wall.mergeWalls.wallPoint0) {
        const connectedWall = wallMap.get(wall.mergeWalls.wallPoint0);
        if (connectedWall) {
          const [connStart, connEnd] = getInnerEdge(connectedWall);
          const connEdge = [connStart, connEnd] as [Vector2, Vector2];
          const extendedConnEdge = extendLine(connEdge);
          
          const intersection = getIntersectionPoint(extendedWallEdge, extendedConnEdge);
          if (intersection) {
            corners.push(intersection);
          }
        }
      }
      
      // Проверяем соединение через wallPoint1 (точка 1 стены соединена с другой стеной)
      if (wall.mergeWalls.wallPoint1) {
        const connectedWall = wallMap.get(wall.mergeWalls.wallPoint1);
        if (connectedWall) {
          const [connStart, connEnd] = getInnerEdge(connectedWall);
          const connEdge = [connStart, connEnd] as [Vector2, Vector2];
          const extendedConnEdge = extendLine(connEdge);
          
          const intersection = getIntersectionPoint(extendedWallEdge, extendedConnEdge);
          if (intersection) {
            const key = pointKey(intersection);
            // Проверяем, не добавили ли мы уже этот угол
            const exists = corners.some(c => pointKey(c) === key);
            if (!exists) {
              corners.push(intersection);
            }
          }
        }
      }
      
      // Если не нашли углы через соединения, используем конечные точки стены
      if (corners.length === 0) {
        corners.push(wallStart, wallEnd);
      }
      
      wallCorners.set(wall.id, corners);
    }

    // Строим контур, обходя стены и используя найденные углы
    const visitedWalls = new Set<string | number>();
    const contour: Vector2[] = [];
    
    // Начинаем с первой стены
    let currentWall = roomWalls[0];
    let [innerStart, innerEnd] = getInnerEdge(currentWall);
    let currentPoint: Vector2 = innerStart;
    const startPoint: Vector2 = innerStart;

    while (currentWall && !visitedWalls.has(currentWall.id)) {
      visitedWalls.add(currentWall.id);
      
      // Добавляем текущую точку в контур
      const currentKey = pointKey(currentPoint);
      const lastKey = contour.length > 0 ? pointKey(contour[contour.length - 1]) : '';
      if (currentKey !== lastKey) {
        contour.push({ ...currentPoint });
      }

      // Проверяем, не вернулись ли мы к начальной точке
      if (contour.length > 2 && currentKey === pointKey(startPoint)) {
        break;
      }

      // Определяем следующую стену
      const currentPointKey = pointKey(currentPoint);
      const innerStartKey = pointKey(innerStart);
      const innerEndKey = pointKey(innerEnd);
      
      const connectedWallId = currentPointKey === innerStartKey 
        ? currentWall.mergeWalls.wallPoint1 
        : currentWall.mergeWalls.wallPoint0;

      let nextWall: ObjectWall | undefined;

      if (connectedWallId) {
        nextWall = wallMap.get(connectedWallId);
        if (nextWall) {
          // Ищем угол между этими стенами (пересечение продолжений внутренних границ)
          const [nextStart, nextEnd] = getInnerEdge(nextWall);
          const currentEdge = [innerStart, innerEnd] as [Vector2, Vector2];
          const nextEdge = [nextStart, nextEnd] as [Vector2, Vector2];
          const extendedCurrent = extendLine(currentEdge);
          const extendedNext = extendLine(nextEdge);
          
          // Ищем пересечение продолжений - это может быть угол комнаты
          const intersection = getIntersectionPoint(extendedCurrent, extendedNext);
          if (intersection) {
            // Проверяем, находится ли точка пересечения в разумных пределах от стен
            // Вычисляем минимальное расстояние от точки пересечения до текущей и следующей стены
            const distToCurrentStart = getDistanceBetweenVectors(intersection, innerStart);
            const distToCurrentEnd = getDistanceBetweenVectors(intersection, innerEnd);
            const distToNextStart = getDistanceBetweenVectors(intersection, nextStart);
            const distToNextEnd = getDistanceBetweenVectors(intersection, nextEnd);
            
            // Находим минимальное расстояние до любой точки стен
            const minDistToCurrent = Math.min(distToCurrentStart, distToCurrentEnd);
            const minDistToNext = Math.min(distToNextStart, distToNextEnd);
            const minDist = Math.min(minDistToCurrent, minDistToNext);
            
            // Используем точку пересечения только если она находится близко к стенам
            // (в пределах 2-3 длин стен, чтобы учесть вогнутые углы, но не слишком далекие точки)
            const maxWallLength = Math.max(
              getDistanceBetweenVectors(innerStart, innerEnd),
              getDistanceBetweenVectors(nextStart, nextEnd)
            );
            const maxAllowedDist = maxWallLength * 3; // Максимальное допустимое расстояние
            
            if (minDist <= maxAllowedDist) {
              // Точка пересечения находится в разумных пределах - используем её как угол
              const cornerKey = pointKey(intersection);
              const lastKey = contour.length > 0 ? pointKey(contour[contour.length - 1]) : '';
              
              if (cornerKey !== lastKey) {
                contour.push({ ...intersection });
              }
              currentPoint = intersection;
              
              // Определяем следующую точку на следующей стене
              if (distToNextStart > distToNextEnd) {
                currentPoint = nextStart;
              } else {
                currentPoint = nextEnd;
              }
            } else {
              // Точка пересечения слишком далеко - используем реальную точку соединения
              const currentEndPoint = currentPointKey === innerStartKey ? innerEnd : innerStart;
              const distToNextStart2 = getDistanceBetweenVectors(currentEndPoint, nextStart);
              const distToNextEnd2 = getDistanceBetweenVectors(currentEndPoint, nextEnd);
              
              if (distToNextStart2 < distToNextEnd2) {
                currentPoint = nextEnd;
              } else {
                currentPoint = nextStart;
              }
            }
          } else {
            // Если нет пересечения, используем конечную точку текущей стены
            const currentEndPoint = currentPointKey === innerStartKey ? innerEnd : innerStart;
            const distToNextStart = getDistanceBetweenVectors(currentEndPoint, nextStart);
            const distToNextEnd = getDistanceBetweenVectors(currentEndPoint, nextEnd);
            
            if (distToNextStart < distToNextEnd) {
              currentPoint = nextEnd;
            } else {
              currentPoint = nextStart;
            }
          }
        }
      }

      // Если не нашли через mergeWalls, ищем по совпадению координат
      if (!nextWall) {
        const currentEndPoint = currentPointKey === innerStartKey ? innerEnd : innerStart;
        
        for (const wall of roomWalls) {
          if (wall.id === currentWall.id || visitedWalls.has(wall.id)) continue;
          
          const [wallStart, wallEnd] = getInnerEdge(wall);
          const wallStartKey = pointKey(wallStart);
          const wallEndKey = pointKey(wallEnd);
          
          if (pointKey(currentEndPoint) === wallStartKey || pointKey(currentEndPoint) === wallEndKey) {
            nextWall = wall;
            
            // Ищем угол между стенами
            const currentEdge = [innerStart, innerEnd] as [Vector2, Vector2];
            const nextEdge = [wallStart, wallEnd] as [Vector2, Vector2];
            const extendedCurrent = extendLine(currentEdge);
            const extendedNext = extendLine(nextEdge);
            
            const intersection = getIntersectionPoint(extendedCurrent, extendedNext);
            if (intersection) {
              // Проверяем, находится ли точка пересечения в разумных пределах от стен
              const distToCurrentStart = getDistanceBetweenVectors(intersection, innerStart);
              const distToCurrentEnd = getDistanceBetweenVectors(intersection, innerEnd);
              const distToNextStart = getDistanceBetweenVectors(intersection, wallStart);
              const distToNextEnd = getDistanceBetweenVectors(intersection, wallEnd);
              
              const minDistToCurrent = Math.min(distToCurrentStart, distToCurrentEnd);
              const minDistToNext = Math.min(distToNextStart, distToNextEnd);
              const minDist = Math.min(minDistToCurrent, minDistToNext);
              
              const maxWallLength = Math.max(
                getDistanceBetweenVectors(innerStart, innerEnd),
                getDistanceBetweenVectors(wallStart, wallEnd)
              );
              const maxAllowedDist = maxWallLength * 3;
              
              if (minDist <= maxAllowedDist) {
                const cornerKey = pointKey(intersection);
                const lastKey = contour.length > 0 ? pointKey(contour[contour.length - 1]) : '';
                
                if (cornerKey !== lastKey) {
                  contour.push({ ...intersection });
                }
                currentPoint = intersection;
              }
            }
            
            // Определяем следующую точку
            if (pointKey(currentEndPoint) === wallStartKey) {
              currentPoint = wallEnd;
            } else {
              currentPoint = wallStart;
            }
            break;
          }
        }
      }

      if (nextWall) {
        currentWall = nextWall;
        [innerStart, innerEnd] = getInnerEdge(currentWall);
      } else {
        // Если не нашли следующую стену, добавляем конечную точку
        const endPoint = currentPointKey === innerStartKey ? innerEnd : innerStart;
        const endKey = pointKey(endPoint);
        const lastPointKey = contour.length > 0 ? pointKey(contour[contour.length - 1]) : '';
        
        if (endKey !== lastPointKey) {
          contour.push({ ...endPoint });
        }
        break;
      }
    }

    // Убираем дубликат начальной точки
    if (contour.length > 2 && pointKey(contour[0]) === pointKey(contour[contour.length - 1])) {
      contour.pop();
    }

    // Если контур получился слишком коротким, возвращаем все уникальные точки
    if (contour.length < 3) {
      const allPoints: Vector2[] = [];
      const uniquePoints = new Map<string, Vector2>();
      roomWalls.forEach(wall => {
        const [wallStart, wallEnd] = getInnerEdge(wall);
        const key0 = pointKey(wallStart);
        const key1 = pointKey(wallEnd);
        if (!uniquePoints.has(key0)) {
          uniquePoints.set(key0, wallStart);
          allPoints.push(wallStart);
        }
        if (!uniquePoints.has(key1)) {
          uniquePoints.set(key1, wallEnd);
          allPoints.push(wallEnd);
        }
      });
      return allPoints;
    }

    return contour;

  }

  /*
  public updateRoomStore(id: number | string | null = null, mergeWall: boolean = false): void {

    if (!id) id = this.state.activeWall;

    if (!id) return;

    let wallData = this.objectWalls.find((el: ObjectWall) => el.id === id);
    if (wallData) {
      const { containers, ...wallDataWithoutContainers } = wallData;
      wallData = wallDataWithoutContainers;
    }

    if (wallData) {

      wallData = JSON.parse(JSON.stringify(wallData));

      if (mergeWall) {
        if (wallData?.mergeWalls.wallPoint0) {
          this.updateRoomStore(wallData?.mergeWalls.wallPoint0);
        }

        if (wallData?.mergeWalls.wallPoint1) {
          this.updateRoomStore(wallData?.mergeWalls.wallPoint1);
        }
      }

      this.roomStore.setWall({
        idRoom: this.roomStore.getSchemeTransitionData[0].id,
        wall: wallData
      });

    }

  }
  */

  // функция получения списка присоединенных стен для их обновления
  private getMergeWallsIDForUpdate(id: string | number): (string | number)[] {

    const wallData = this.objectWalls.find((el: ObjectWall) => el.id === id);
    if (!wallData) return [];

    const listRelatedWalls: (string | number)[] = [];
    listRelatedWalls.push(id);

    // найти связанные с добавляемой другие стены
    if (wallData.mergeWalls.wallPoint0) {
      listRelatedWalls.push(wallData.mergeWalls.wallPoint0);
      const otherMergeWall: ObjectWall | undefined = this.objectWalls.find(el => el.id === wallData.mergeWalls.wallPoint0);
      if (otherMergeWall && otherMergeWall.mergeWalls.wallPoint0) {
        const exist: number = listRelatedWalls.findIndex((id: string | number) => id === otherMergeWall.mergeWalls.wallPoint0);
        if (exist == -1) listRelatedWalls.push(otherMergeWall.mergeWalls.wallPoint0);
      }
    }
    if (wallData.mergeWalls.wallPoint1) {
      listRelatedWalls.push(wallData.mergeWalls.wallPoint1);
      const otherMergeWall: ObjectWall | undefined = this.objectWalls.find(el => el.id === wallData.mergeWalls.wallPoint1);
      if (otherMergeWall && otherMergeWall.mergeWalls.wallPoint1) {
        const exist: number = listRelatedWalls.findIndex((id: string | number) => id === otherMergeWall.mergeWalls.wallPoint1);
        if (exist == -1) listRelatedWalls.push(otherMergeWall.mergeWalls.wallPoint1);
      }
    }

    return listRelatedWalls;

  }

  // создаем контейнеры для визуализации cтены
  private createDrawContainers(id: string | number): number {

    const indexWall = this.objectWalls.findIndex(el => el.id === id);

    if (indexWall != -1) {

      const dataWall = this.objectWalls[indexWall];
      if (!dataWall) return 0;

      if (!dataWall.containers) {

        // создаем контейнеры
        dataWall.containers = {
          root: new PIXI.Container(),
          maskWall: new PIXI.Graphics(),
          bodyWall: new PIXI.Graphics(),
          lineWall: new PIXI.Graphics(),
          startPoint: new PIXI.Graphics(),
          endPoint: new PIXI.Graphics(),
          normalIndicator: new PIXI.Graphics(),
          textWallWidth: new PIXI.Text(),
          // dimensionDisplay: new PIXI.Container(), // контейнер для отображения размеров стены и ее объектов
          // rulerWall: new PIXI.Graphics(),
          // containerTextRulerWall: new PIXI.Container(),
          // textRulerWall: new PIXI.Text({
          //   text: "",
          //   style: {
          //     fontSize: 16,
          //     fill: 0x5D6069,
          //   },
          // }),
          eventGraphic: new PIXI.Graphics(),
        };

        if (dataWall.containers.root) this.container.addChild(dataWall.containers.root);

        // if (dataWall.containers.containerTextRulerWall && dataWall.containers.textRulerWall) {
          // dataWall.containers.containerTextRulerWall.addChild(dataWall.containers.textRulerWall);
        // }

        if (dataWall.containers.eventGraphic) {
          dataWall.containers.eventGraphic.eventMode = 'static';
          (dataWall.containers.eventGraphic as PIXI.Graphics & { wallId?: string | number }).wallId = dataWall.id;

          // Изменяем курсор на pointer при наведении
          dataWall.containers.eventGraphic.on("mouseover", this.handlerOverEventGraphic);
          // Убираем курсор при уходе мыши
          dataWall.containers.eventGraphic.on("mouseout", this.handlerOutEventGraphic);
          // При клике делаем объект активным и перерисовываем
          dataWall.containers.eventGraphic.on("pointerdown", this.handlerDownEventGraphic);
        }

        if (dataWall.containers.root) {
          if (dataWall.containers.maskWall) dataWall.containers.root.addChild(dataWall.containers.maskWall);
          if (dataWall.containers.bodyWall) dataWall.containers.root.addChild(dataWall.containers.bodyWall);
          if (dataWall.containers.lineWall) dataWall.containers.root.addChild(dataWall.containers.lineWall);
          if (dataWall.containers.startPoint) dataWall.containers.root.addChild(dataWall.containers.startPoint);
          if (dataWall.containers.endPoint) dataWall.containers.root.addChild(dataWall.containers.endPoint);
          if (dataWall.containers.normalIndicator) dataWall.containers.root.addChild(dataWall.containers.normalIndicator);
          if (dataWall.containers.textWallWidth) dataWall.containers.root.addChild(dataWall.containers.textWallWidth);
          if (dataWall.containers.dimensionDisplay) dataWall.containers.root.addChild(dataWall.containers.dimensionDisplay);
          // if (dataWall.containers.containerTextRulerWall) dataWall.containers.root.addChild(dataWall.containers.containerTextRulerWall);
          if (dataWall.containers.eventGraphic) dataWall.containers.root.addChild(dataWall.containers.eventGraphic);
        }

      }

      return 1;

    } else {

      return 0;

    }

  }

  // рисуем стену
  public drawWall(idWall: string | number): void {

    const obj: ObjectWall | undefined = this.objectWalls.find(el => el.id === idWall);
    if (!obj) return;

    // Получить контейнеры из объекта
    const containers = obj.containers;
    const points = JSON.parse(JSON.stringify(obj.points));
    const mergeWalls = obj.mergeWalls;

    // обновляем окно и двери в стене, если они есть
    if (this.parent.layers.doorsAndWindows) this.parent.layers.doorsAndWindows.updateObject(obj.id);

    { // рассчитываем новые координаты точек 2 и 3, если есть присоединенная стена

      if (obj.name === 'dividing_wall') {

        { // определяем находится ли точка _p0 на линии другой стены

          let pnl: Vector2 | null = null;
          let line: [Vector2, Vector2] | null = null;

          for (let i = 0, len = this.objectWalls.length; i < len; i++) {

            const wall: ObjectWall = this.objectWalls[i];

            if (wall.id === obj.id) continue; // пропускаем текущую стену

            pnl = isPointNearLine([wall.points[0], wall.points[1]], points[0], 1);

            if (wall.name === 'dividing_wall' && !pnl) {
              pnl = isPointNearLine([wall.points[2], wall.points[3]], points[0], 1);
              if (pnl) line = [wall.points[2], wall.points[3]];
            } else if (pnl) {
              line = [wall.points[0], wall.points[1]];
            }

            if (pnl) break;

          }

          if (line) {
            // если _p0 находится на линии другой стены, то находим точку _p3
            const pointIntLine: Vector2 | null = findRayLineIntersection(line[0], line[1], points[2], points[3]);
            if (pointIntLine) points[3] = pointIntLine;
          }

        }

        { // определяем находится ли точка _p1 на линии другой стены

          let pnl: Vector2 | null = null;
          let line: [Vector2, Vector2] | null = null;

          for (let i = 0, len = this.objectWalls.length; i < len; i++) {

            const wall: ObjectWall = this.objectWalls[i];

            if (wall.id === obj.id) continue; // пропускаем текущую стену

            pnl = isPointNearLine([wall.points[0], wall.points[1]], points[1], 1);

            if (wall.name === 'dividing_wall' && !pnl) {
              pnl = isPointNearLine([wall.points[2], wall.points[3]], points[1], 1);
              if (pnl) line = [wall.points[2], wall.points[3]];
            } else if (pnl) {
              line = [wall.points[0], wall.points[1]];
            }

            if (pnl) break;

          }

          if (line) {
            // если _p1 находится на линии другой стены, то находим точку _p2
            const pointIntLine: Vector2 | null = findRayLineIntersection(line[0], line[1], points[3], points[2]);
            if (pointIntLine) points[2] = pointIntLine;
          }

        }

      } else {

        if (mergeWalls.wallPoint0) {

          const otherWall: ObjectWall | undefined = this.objectWalls.find(el => el.id === mergeWalls.wallPoint0);

          if (otherWall) {

            const __p0 = obj.points[0];
            const __p1 = otherWall.points[0];
            const __p2 = otherWall.points[1];

            const vAngle = -getAngleBetweenVectors(__p1, __p0, __p2);
            const degTextAngle = vAngle < 0 ? 360 + vAngle : vAngle;

            if (degTextAngle > 35) {
              const activeWallHeight = obj.height;
              const mergeWallHeight = otherWall.height;

              if (activeWallHeight === mergeWallHeight) { // если толщина стен одинаковая

                const pointsOtherWall: Vector2[] = JSON.parse(JSON.stringify(otherWall.points));

                const line_0: [Vector2, Vector2] = [points[2], points[3]];
                const line_1: [Vector2, Vector2] = [pointsOtherWall[2], pointsOtherWall[3]];

                const intersectionPoint: Vector2 | null = getIntersectionPoint(line_0, line_1);

                if (intersectionPoint) {
                  points[2] = intersectionPoint;
                }

              } else if (activeWallHeight > mergeWallHeight) { // если толщина активной стены больше

                const isIntersect = doesVectorIntersectSegment(
                  [
                    obj.points[1],
                    obj.points[2]
                  ],
                  [
                    otherWall.points[2],
                    otherWall.points[3]
                  ]
                );
                if (isIntersect) {
                  isIntersect.x = Math.round(isIntersect.x * 100) / 100;
                  isIntersect.y = Math.round(isIntersect.y * 100) / 100;
                }

                if (!isIntersect) {
                  const pointsOtherWall: Vector2[] = JSON.parse(JSON.stringify(otherWall.points));

                  const line_0: [Vector2, Vector2] = [points[2], points[3]];
                  const line_1: [Vector2, Vector2] = [pointsOtherWall[2], pointsOtherWall[3]];

                  const intersectionPoint: Vector2 | null = getIntersectionPoint(line_0, line_1);

                  if (intersectionPoint) {
                    points[2] = intersectionPoint;
                  }
                }

              } else if (activeWallHeight < mergeWallHeight) { // если толщина активной стены меньше

                const isIntersect = doesVectorIntersectSegment(
                  [
                    otherWall.points[0],
                    otherWall.points[3]
                  ],
                  [
                    obj.points[3],
                    obj.points[2]
                  ]
                );

                if (isIntersect) {
                  points[2] = isIntersect;
                } else {
                  const pointsOtherWall: Vector2[] = JSON.parse(JSON.stringify(otherWall.points));

                  const line_0: [Vector2, Vector2] = [points[2], points[3]];
                  const line_1: [Vector2, Vector2] = [pointsOtherWall[2], pointsOtherWall[3]];

                  const intersectionPoint: Vector2 | null = getIntersectionPoint(line_0, line_1);

                  if (intersectionPoint) {
                    points[2] = intersectionPoint;
                  }
                }

              }
            }

          } else {

            mergeWalls.wallPoint0 = null;

          }

        }

        if (mergeWalls.wallPoint1) {

          const otherWall: ObjectWall | undefined = this.objectWalls.find(el => el.id === mergeWalls.wallPoint1);

          if (otherWall) {

            const __p0 = otherWall.points[0];
            const __p1 = obj.points[0];
            const __p2 = obj.points[1];

            const vAngle = -getAngleBetweenVectors(__p1, __p0, __p2);
            const degTextAngle = vAngle < 0 ? 360 + vAngle : vAngle;

            if (degTextAngle > 35) {
              const activeWallHeight = obj.height;
              const mergeWallHeight = otherWall.height;

              if (activeWallHeight === mergeWallHeight) { // если толщина стен одинаковая

                const pointsOtherWall: Vector2[] = JSON.parse(JSON.stringify(otherWall.points));

                const line_0: [Vector2, Vector2] = [points[2], points[3]];
                const line_1: [Vector2, Vector2] = [pointsOtherWall[2], pointsOtherWall[3]];

                const intersectionPoint: Vector2 | null = getIntersectionPoint(line_0, line_1);

                if (intersectionPoint) {
                  points[3] = intersectionPoint;
                }

              } else if (activeWallHeight > mergeWallHeight) { // если толщина активной стены больше

                const isIntersect = doesVectorIntersectSegment(
                  [
                    obj.points[0],
                    obj.points[3]
                  ],
                  [
                    otherWall.points[3],
                    otherWall.points[2]
                  ]
                );

                if (!isIntersect) {
                  const pointsOtherWall: Vector2[] = JSON.parse(JSON.stringify(otherWall.points));

                  const line_0: [Vector2, Vector2] = [points[2], points[3]];
                  const line_1: [Vector2, Vector2] = [pointsOtherWall[2], pointsOtherWall[3]];

                  const intersectionPoint: Vector2 | null = getIntersectionPoint(line_0, line_1);

                  if (intersectionPoint) {
                    points[3] = intersectionPoint;
                  }
                }

              } else if (activeWallHeight < mergeWallHeight) { // если толщина активной стены меньше

                const isIntersect = doesVectorIntersectSegment(
                  [
                    otherWall.points[1],
                    otherWall.points[2]
                  ],
                  [
                    obj.points[2],
                    obj.points[3]
                  ]
                );

                if (isIntersect) {
                  points[3] = isIntersect;
                } else {
                  const pointsOtherWall: Vector2[] = JSON.parse(JSON.stringify(otherWall.points));

                  const line_0: [Vector2, Vector2] = [points[2], points[3]];
                  const line_1: [Vector2, Vector2] = [pointsOtherWall[2], pointsOtherWall[3]];

                  const intersectionPoint: Vector2 | null = getIntersectionPoint(line_0, line_1);

                  if (intersectionPoint) {
                    points[3] = intersectionPoint;
                  }
                }

              }
            }

          } else {

            mergeWalls.wallPoint1 = null;

          }

        }

      }

    }

    const activeWallID = this.state.activeWall === obj.id ? true : false;

    if (points && containers) {

      // рисуем маску для wallBody
      if (containers.maskWall) {
        rect(
          containers.maskWall,
          {
            points: points,
            heightDirection: obj.heightDirection,
            color: "rgba(255,0,0,0.3)" //configWall.color.background // Цвет заливки
          }
        );
      }

      // рисуем тело стены
      if (containers.bodyWall) {

        rect(
          containers.bodyWall,
          {
            points: points,
            heightDirection: obj.heightDirection,
            color: obj.isClosing ? 0xF0F0F0 : 0xFFFFFF,
          }
        );

        drawVerticalLines(
          containers.bodyWall, // graphics
          points[0], // startPoint
          obj.width, // width
          obj.height, // height
          20, // spacing
          obj.heightDirection, // heightDirection
          this.config.wall.color.line76deg, // Цвет линий
          1, // Толщина линий
          obj.angleDegrees,
          false
        );

        if (containers.maskWall) containers.bodyWall.mask = containers.maskWall;

        // если эта стена активная, то рисуем пунктирную рамку, иначе сплошной линией
        if (activeWallID && obj.name !== 'dividing_wall') {
          // рисуем пунктирную рамку стены
          drawDashedOutline(containers.bodyWall, points);
        } else {
          // рисуем сплошную линию
          drawShape(containers.bodyWall, points, obj.isClosing ? { stroke: 0x9E9E9E } : {}, (obj.name === 'dividing_wall' ? 4 : 1));
        }

      }

      // рисуем стрелку-вектор стены
      if (containers.lineWall) {

        if (activeWallID) {

          drawArrow(
            containers.lineWall,
            points[0],
            obj.width,
            obj.angleDegrees, // Угол направления стрелки в градусах
            {
              line: this.config.wall.color.arrowLineWall, // Цвет стрелки
              head: this.config.wall.color.arrowHeadLineWall
            },
            2, // Толщина линии
            12, // Размер треугольника (основание и высота)
            true
          );

          // рисуем указатель внутренне стороны стены (стрелка без линии)
          drawArrowHead(
            containers.lineWall,
            points[0], // позиция начала стены
            obj.width * 0.3, // расстояние по x от начала obj.points[0], где нужно нарисовать стрелку
            0, //obj.height, // number | расстояние по y от начала obj.points[0], где нужно нарисовать стрелку
            { axis: "y", value: (obj.heightDirection === 1 ? 1 : -1) }, // направление стрелки {axis: x | y, value: 1 | -1}
            obj.angleDegrees, // Угол направления стрелки в градусах относительно obj.points[0]
            this.config.wall.color.arrowHead, // Цвет стрелки
            12, // Размер треугольника (основание и высота)
            false // не очищаем графику
          );

          // рисуем указатель начала стены (стрелка без линии)
          drawArrowHead(
            containers.lineWall,
            points[0], // позиция начала стены
            0, // расстояние по x от начала obj.points[0], где нужно нарисовать стрелку
            (obj.heightDirection === 1 ? obj.height : -obj.height), // number | расстояние по y от начала obj.points[0], где нужно нарисовать стрелку
            { axis: "y", value: (obj.heightDirection === -1 ? 1 : -1) }, // направление стрелки {axis: x | y, value: 1 | -1}
            obj.angleDegrees, // Угол направления стрелки в градусах относительно obj.points[0]
            this.config.wall.color.arrowHead, // Цвет стрелки
            12, // Размер треугольника (основание и высота)
            false // не очищаем графику
          );

          // рисуем указатель конца стены (стрелка без линии)
          drawArrowHead(
            containers.lineWall,
            points[0], // позиция начала стены
            obj.width, // расстояние по x от начала data.points[0], где нужно нарисовать стрелку
            (obj.heightDirection === 1 ? obj.height : -obj.height), // number | расстояние по y от начала obj.points[0], где нужно нарисовать стрелку
            { axis: "y", value: (obj.heightDirection === -1 ? 1 : -1) }, // направление стрелки {axis: x | y, value: 1 | -1}
            obj.angleDegrees, // Угол направления стрелки в градусах относительно data.points[0]
            this.config.wall.color.arrowHead, // Цвет стрелки
            12, // Размер треугольника (основание и высота)
            false // не очищаем графику
          );

          drawArrowHead(
            containers.lineWall,
            points[0], // позиция начала стены
            obj.width * 0.4, // расстояние по x от начала obj.points[0], где нужно нарисовать стрелку
            0, // number | расстояние по y от начала obj.points[0], где нужно нарисовать стрелку
            { axis: "y", value: (obj.heightDirection === -1 ? 1 : -1) }, // направление стрелки {axis: x | y, value: 1 | -1}
            obj.angleDegrees, // Угол направления стрелки в градусах относительно obj.points[0]
            this.config.wall.color.green, // Цвет стрелки
            12, // Размер треугольника (основание и высота)
            false // не очищаем графику
          );

          drawArrowHead(
            containers.lineWall,
            points[0], // позиция начала стены
            obj.width * 0.4, // расстояние по x от начала obj.points[0], где нужно нарисовать стрелку
            (obj.heightDirection === -1 ? -obj.height : obj.height), // number | расстояние по y от начала obj.points[0], где нужно нарисовать стрелку
            { axis: "y", value: (obj.heightDirection === 1 ? 1 : -1) }, // направление стрелки {axis: x | y, value: 1 | -1}
            obj.angleDegrees, // Угол направления стрелки в градусах относительно obj.points[0]
            this.config.wall.color.green, // Цвет стрелки
            12, // Размер треугольника (основание и высота)
            false // не очищаем графику
          );

        } else {

          // containers.lineWall.clear(); // Очистка предыдущего содержимого
          if (obj.name !== 'dividing_wall') {
            drawLine(
              containers.lineWall,
              points[0],
              obj.width,
              obj.angleDegrees,
              obj.isClosing ? 0x9E9E9E : this.config.wall.color.bodyLine,
              2,
              true
            );
          } else {
            containers.lineWall.clear();
          }

        }

      }

      if (containers.textWallWidth) {
        const wallDisplayLabel = this.getWallDisplayLabel(obj.id);
        if (wallDisplayLabel) {
          const centerPoint = getMidpoint(points[0], points[1]);
          containers.textWallWidth.text = wallDisplayLabel;
          containers.textWallWidth.style = new PIXI.TextStyle({
            fontSize: 13,
            fill: 0x2F5D50,
            fontWeight: '600',
          });
          containers.textWallWidth.alpha = 1;
          containers.textWallWidth.anchor.set(0.5);
          containers.textWallWidth.position.set(centerPoint.x, centerPoint.y);
        } else {
          containers.textWallWidth.text = "";
        }
      }

      if(activeWallID) this.parent.layers.dimensionDisplay.show(this.state.activeWall);

      if (containers.eventGraphic) {
        rect(
          containers.eventGraphic,
          {
            points: obj.points,
            heightDirection: obj.heightDirection,
            color: "rgba(255,0,0,0)" //configWall.color.background // Цвет заливки
          }
        );

        // // объект для показа центра стены для теста
        // const centerObject = getCenterOfPoints(data.points);
        // drawCircle(
        //   containers.eventGraphic,
        //   centerObject,
        //   10, 
        //   "rgba(0,100,0,1)"
        // );

      }

    } else {
      return;
    }

  }

  public redrawHalfRoom(): void {

    const roomsHalf = [];

    const rooms = this.allRooms;

    let hasRoomWithMoreThan3Points = false

    rooms.forEach((room, index) => {

      const polygonPoints: Vector2[] = this.getRoomContour(room.id);

      const roomData = JSON.parse(JSON.stringify(room));
      roomData.points = polygonPoints;

      if(polygonPoints.length > 2){
        roomsHalf.push(roomData);
      }

      if(polygonPoints.length > 2){
        hasRoomWithMoreThan3Points = true
      }
      
    });

    this.roomValidationStore.setHasValidRoom(hasRoomWithMoreThan3Points)

    if (roomsHalf.length != 0) {

      this.parent.layers.halfRoom.drawHalfRoom(roomsHalf);

    } else {
      this.parent.layers.halfRoom.removeHalfRoom();
      this.roomValidationStore.setHasValidRoom(false)
    }

  }

  public drawListWalls(list: (number | string)[]): void {

    list.forEach((id: string | number) => {

      this.drawWall(id);

    });

    this.redrawHalfRoom();

  }

  /**
   * Находит точку соединения внутри полигона по заданной позиции.
   *
   * Проходит по списку объектов стен (`this.objectWalls`) и проверяет, находится ли переданная позиция `position`
   * внутри какого-либо полигона, определённого точками стены, игнорируя объект с id `ignoreObject`, если он указан.
   * Если позиция находится внутри полигона, вычисляет точку пересечения между позицией и первым ребром полигона
   * с помощью `getIntersectVectorLine` и возвращает id соответствующего объекта и точку пересечения.
   *
   * @param position - Позиция, для которой ищется пересечение с полигонами.
   * @param ignoreObject - (Необязательно) id объекта, который нужно игнорировать при поиске.
   * @returns Объект с id найденного полигона и точкой пересечения, либо `null`, если пересечение не найдено.
   *
   * @remarks
   * - Функция предполагает, что `this.objectWalls` — массив объектов с полями `id` и `points`.
   * - Для геометрических вычислений используются вспомогательные функции `isPointInPolygon` и `getIntersectVectorLine`.
   * - Для пересечения берётся только первое ребро полигона (`obj.points[0]` — `obj.points[1]`).
   *
   * @example
   * ```typescript
   * const result = getConnectionPointInPolygon(new Vector2(10, 20), 'wall-1');
   * if (result) {
   *   console.log(`Соединено со стеной ${result.id} в точке`, result.point);
   * }
   * ```
   */
  private getConnectionPointInPolygon(
    position: Vector2,
    ignoreObject: number | string | null = null
  ): { id: number | string; point: Vector2 } | null {

    let pointConnect: { id: number | string; indexPoint: number; point: Vector2 } | null = null;

    for (const obj of this.objectWalls) {
      const ignore = (ignoreObject !== null && obj.id === ignoreObject) ? true : false;

      if (obj.points && !ignore) {

        const result = isPointInPolygon(obj.points, position);

        if (result) {

          pointConnect = {};
          pointConnect.id = obj.id;
          pointConnect.point = getIntersectVectorLine([
            obj.points[0], obj.points[1]
          ], position);

          break;

        }

      }

    }

    return pointConnect;

  }

  // поискт совпадающей точки с координатами аргумента
  private getPointByPosition(
    position: Vector2,
    ignoreObject: number | string | null = null
  ): { id: number | string; indexPoint: number } | null {

    for (const obj of this.objectWalls) {

      if (obj.name === 'dividing_wall') continue; // пропускаем перегородки

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

  }

  public updateWallPoint(position: Vector2, __indexPoint: 0 | 1 | null = null): void {

    const indexPoint = __indexPoint !== null ? __indexPoint : this.state.activePointWall;
    const indexDataWall = this.objectWalls.findIndex(el => el.id === this.state.activeWall);

    if (indexDataWall == -1) return;

    const dataWall = this.objectWalls[indexDataWall];

    this.clearWallAngleOverrides();

    if (dataWall.name === 'dividing_wall') { // если это перегородка

      const newPoint = position;

      const newPoints = this.calculatePositionPointsWall(
        (indexPoint == 0 ? newPoint : dataWall.points[0]),
        (indexPoint == 1 ? newPoint : dataWall.points[1]),
        dataWall.height,
        dataWall.heightDirection
      );
      if (!this.canApplyWallPointMoveWithAcuteLimit(dataWall, newPoints)) return;

      // обновить угол наклона стены
      dataWall.angleDegrees = getAngleBetweenVectors(
        newPoints[0],
        {
          x: newPoints[0].x + 300,
          y: newPoints[0].y
        },
        newPoints[1]
      );

      dataWall.width = getDistanceBetweenVectors(
        newPoints[0],
        newPoints[1]
      );

      dataWall.points = newPoints;

      if (indexPoint !== null) {
        this.parent.layers.arrowRulerActiveObject.draw(dataWall.points[indexPoint]);
        if (indexPoint == 0) this.parent.layers.startPointActiveObject.startPointRect.rotation = MathUtils.degToRad(dataWall.angleDegrees);
        if (indexPoint == 1) this.parent.layers.startPointActiveObject.endPointRect.rotation = MathUtils.degToRad(dataWall.angleDegrees);
      }

      this.drawWall(dataWall.id);

    } else {

      // ищем точку стены под курсором
      const hoverPointObject:
        HoverPointObject | null =
        this.getPointByPosition(position, dataWall.id);

      if (hoverPointObject) { // если есть точка другой стены под курсором

        // получаем данные стены на которую навели (точка стены 0 или 1)
        const connectWall = this.objectWalls.find((el: ObjectWall) => el.id === hoverPointObject.id);

        if (connectWall) { // если стена найдена и данные получены

          if (indexPoint == 0) { // если точка 0 под курсором

            /*
            Если стена под курсором не имеет присоединённой стены к точке 0,
            и индекс точки под курсором этой стены равен 1
            */
            if (connectWall.mergeWalls.wallPoint0 === null && hoverPointObject.indexPoint == 1) {

              connectWall.mergeWalls.wallPoint0 = dataWall.id;
              dataWall.mergeWalls.wallPoint1 = connectWall.id;

            }

          } else if (indexPoint == 1) { // если точка 1 под курсором

            /*
            Если стена под курсором не имеет присоединённой стены к точке 1,
            и индекс точки под курсором этой стены равен 0
            */
            if (connectWall.mergeWalls.wallPoint1 === null && hoverPointObject.indexPoint == 0) {

              connectWall.mergeWalls.wallPoint1 = dataWall.id;
              dataWall.mergeWalls.wallPoint0 = connectWall.id;

            }

          }

          /*
          * 1. При перемещении точки стены (возможно соединенной с другими стенами) на свободную точку другой стены:
          *    - Удаляем исходную комнату (к которой принадлежала перемещаемая стена)
          *    - Переносим все связанные стены в комнату, содержащую целевую точку под курсором
          *
          * 2. Проверка принадлежности стен к одной цепочке:
          *    2.1 Если перемещаемая стена и целевая точка принадлежат одной цепочке стен:
          *        - Оставляем без изменений (не допускаем соединения стены с самой собой)
          *    2.2 Если принадлежат разным цепочкам:
          *        - Выполняем удаление исходной комнаты и обновление roomId для всех стен цепочки
          */
          if (dataWall.roomId !== connectWall.roomId) {
            // Сохраняем ID комнаты для удаления ДО изменения roomId
            const roomToRemove = dataWall.roomId;
            
            // Обновляем roomId для всех стен
            this.objectWalls.forEach(wall => {
                if (wall.roomId === dataWall.roomId) {
                    wall.roomId = connectWall.roomId;
                }
            });
            
            // Удаляем комнату только если она ещё существует
            if (this.roomsMap.has(roomToRemove)) {
                this.removeRoom(roomToRemove);
            }
            
            dataWall.roomId = connectWall.roomId;
        } 

        } else {

          console.error('Connected wall not found for hoverPointObject:', hoverPointObject);

        }

      }

      const newPoints = this.calculatePositionPointsWall(
        (indexPoint == 0 ? position : dataWall.points[0]),
        (indexPoint == 1 ? position : dataWall.points[1]),
        dataWall.height,
        dataWall.heightDirection
      );
      if (!this.canApplyWallPointMoveWithAcuteLimit(dataWall, newPoints)) return;

      // обновить угол наклона стены
      dataWall.angleDegrees = getAngleBetweenVectors(
        newPoints[0],
        {
          x: newPoints[0].x + 300,
          y: newPoints[0].y
        },
        newPoints[1]
      );

      dataWall.width = getDistanceBetweenVectors(
        newPoints[0],
        newPoints[1]
      );

      dataWall.points = newPoints;

      if (indexPoint !== null) {
        this.parent.layers.arrowRulerActiveObject.draw(dataWall.points[indexPoint]);
        if (indexPoint == 0) this.parent.layers.startPointActiveObject.startPointRect.rotation = MathUtils.degToRad(dataWall.angleDegrees);
        if (indexPoint == 1) this.parent.layers.startPointActiveObject.endPointRect.rotation = MathUtils.degToRad(dataWall.angleDegrees);
      }

      if (dataWall.mergeWalls.wallPoint0) this.updateMergeWallProperties(0, newPoints[1], dataWall.mergeWalls.wallPoint0);
      if (dataWall.mergeWalls.wallPoint1) this.updateMergeWallProperties(1, newPoints[0], dataWall.mergeWalls.wallPoint1);

      const listRelatedWalls: (string | number)[] = this.getMergeWallsIDForUpdate(dataWall.id);
      this.drawListWalls(listRelatedWalls);

    }

  }

  private updateMergeWallProperties(indexPoint: number, position: Vector2, idWall: string | number): void {

    const indexDataOtherWall: number = this.objectWalls.findIndex((el: ObjectWall) => el.id === idWall);
    if (indexDataOtherWall != -1) {
      const dataOtherWall = this.objectWalls[indexDataOtherWall];

      // меняем позицию точки
      dataOtherWall.points[indexPoint] = position;
      dataOtherWall.points = this.calculatePositionPointsWall(
        dataOtherWall.points[0],
        dataOtherWall.points[1],
        dataOtherWall.height,
        dataOtherWall.heightDirection
      );

      // меняем длину стены
      dataOtherWall.width = getDistanceBetweenVectors(
        dataOtherWall.points[0],
        dataOtherWall.points[1]
      );

      // меняем угол поворота
      dataOtherWall.angleDegrees = getAngleBetweenVectors(
        dataOtherWall.points[0],
        {
          x: dataOtherWall.points[0].x + 300,
          y: dataOtherWall.points[0].y
        },
        dataOtherWall.points[1]
      );

    }

  }

  public redrawAllObjects(): void {

    this.objectWalls.forEach((obj: ObjectWall) => {

      switch (obj.name) {
        case 'wall':
        case 'wall_vertical':
        case 'dividing_wall':
          this.drawWall(obj.id);
          break;

        default:
          break;
      }

    });

  }

  // расположение 2-х стен под углом 90 градусов
  public arrangeWallsAt_90_DegreeAngle(): void {

    if (this.state.activeWall !== null && this.state.activePointWall !== null) {

      const indexWall = this.objectWalls.findIndex(el => el.id === this.state.activeWall);

      if (indexWall != -1) {

        const dataWall = this.objectWalls[indexWall];
        if (!dataWall) return;

        if (this.state.activePointWall == 0) {

          if (!dataWall.mergeWalls.wallPoint1) return;

          const indexMergeWall = this.objectWalls.findIndex(el => el.id === dataWall.mergeWalls.wallPoint1);
          if (indexMergeWall == -1) return;

          const dataMergeWall = this.objectWalls[indexMergeWall];

          const p0 = dataMergeWall.points[0];
          const p1 = dataWall.points[0];
          const p2 = dataWall.points[1];

          const newP1 = adjustP1ForPerpendicularity(p0, p1, p2);

          this.updateWallPoint(newP1);

          this.parent.layers.startPointActiveObject.updatePositionIndicatorPoint(newP1);
          this.parent.layers.startPointActiveObject.drawAngleBetweenWalls();

          /* helper
          const graphic = new PIXI.Graphics();
          this.container.addChild(graphic);

          drawCircle(
            graphic,
            newP1,
            10, 
            "rgba(0,100,0,1)"
          );
          */

        } else if (this.state.activePointWall == 1) {

          if (!dataWall.mergeWalls.wallPoint0) return;

          const indexMergeWall = this.objectWalls.findIndex(el => el.id === dataWall.mergeWalls.wallPoint0);
          if (indexMergeWall == -1) return;

          const dataMergeWall = this.objectWalls[indexMergeWall];

          const p0 = dataWall.points[0];
          const p1 = dataWall.points[1];
          const p2 = dataMergeWall.points[1];

          const newP0 = adjustP1ForPerpendicularity(p0, p1, p2);

          this.updateWallPoint(newP0);

          this.parent.layers.startPointActiveObject.updatePositionIndicatorPoint(newP0);
          this.parent.layers.startPointActiveObject.drawAngleBetweenWalls();

        }

      }

    }

  }

  private normalizeAngle360(angle: number): number {
    const normalized = angle % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }

  private circularDiff(a: number, b: number): number {
    const d = Math.abs(this.normalizeAngle360(a) - this.normalizeAngle360(b));
    return Math.min(d, 360 - d);
  }

  private getDisplayedCornerAngleDeg(p0: Vector2, p1: Vector2, p2: Vector2): number {
    const vAngle = -getAngleBetweenVectors(p1, p0, p2);
    return vAngle < 0 ? 360 + vAngle : vAngle;
  }

  private getCornerAngleByMerge(
    wall: ObjectWall,
    points: [Vector2, Vector2, Vector2, Vector2] | Vector2[],
    side: 0 | 1,
  ): number | null {
    if (side === 1) {
      const mergeId = wall.mergeWalls.wallPoint1;
      if (!mergeId) return null;
      const mergeWall = this.objectWalls.find((el) => el.id === mergeId);
      if (!mergeWall) return null;
      return this.getDisplayedCornerAngleDeg(mergeWall.points[0], points[0], points[1]);
    }
    const mergeId = wall.mergeWalls.wallPoint0;
    if (!mergeId) return null;
    const mergeWall = this.objectWalls.find((el) => el.id === mergeId);
    if (!mergeWall) return null;
    return this.getDisplayedCornerAngleDeg(mergeWall.points[1], points[1], points[0]);
  }

  private canApplyWallPointMoveWithAcuteLimit(
    wall: ObjectWall,
    newPoints: [Vector2, Vector2, Vector2, Vector2],
  ): boolean {
    const minBlockDeg = 0;
    const oldPoints = wall.points;
    const sides: (0 | 1)[] = [0, 1];
    for (const side of sides) {
      const oldAngle = this.getCornerAngleByMerge(wall, oldPoints, side);
      const newAngle = this.getCornerAngleByMerge(wall, newPoints, side);
      if (oldAngle === null || newAngle === null) continue;
      if (newAngle < minBlockDeg && newAngle < oldAngle) {
        return false;
      }
    }
    if (!this.canApplyRoomAnglesLimitBySimulation(wall, newPoints, minBlockDeg)) {
      return false;
    }
    return true;
  }

  private normalizeCornerAngleDeg(angle: number): number {
    const normalized = this.normalizeAngle360(angle);
    return normalized > 180 ? 360 - normalized : normalized;
  }

  public clearGhostPreview(): void {
    if (this.ghostPreviewGraphic) {
      this.ghostPreviewGraphic.clear();
    }
  }

  public drawGhostPreview(previewWalls: GhostWallPreview[]): void {
    if (!this.ghostPreviewGraphic) return;
    this.ghostPreviewGraphic.clear();
    this.ghostPreviewGraphic.alpha = 0.9;
    previewWalls.forEach((wall) => {
      const pts = wall.points;
      if (!pts || pts.length < 4) return;
      this.ghostPreviewGraphic.lineStyle(2, 0x4f7cff, 0.95);
      this.ghostPreviewGraphic.beginFill(0x4f7cff, 0.16);
      this.ghostPreviewGraphic.moveTo(pts[0].x, pts[0].y);
      this.ghostPreviewGraphic.lineTo(pts[1].x, pts[1].y);
      this.ghostPreviewGraphic.lineTo(pts[2].x, pts[2].y);
      this.ghostPreviewGraphic.lineTo(pts[3].x, pts[3].y);
      this.ghostPreviewGraphic.closePath();
      this.ghostPreviewGraphic.endFill();
    });
  }

  public getWallMoveSimulationResult(
    wallId: string | number,
    nextPoint0: Vector2,
    nextPoint1: Vector2,
  ): { nextAngles: number[] | null; previewWalls: GhostWallPreview[] } | null {
    const wall = this.objectWalls.find((el) => el.id === wallId);
    if (!wall || wall.roomId == null) return null;
    const newPoints = this.calculatePositionPointsWall(
      nextPoint0,
      nextPoint1,
      wall.height,
      wall.heightDirection,
    );
    if (!this.canApplyWallPointMoveWithAcuteLimit(wall, newPoints)) return null;

    const affectedIds = this.getMergeWallsIDForUpdate(wall.id);
    if (!affectedIds.includes(wall.id)) affectedIds.push(wall.id);
    const backups = affectedIds
      .map((id) => this.objectWalls.find((el) => el.id === id))
      .filter(Boolean)
      .map((w) => ({
        id: w!.id,
        points: JSON.parse(JSON.stringify(w!.points)),
        width: w!.width,
        angleDegrees: w!.angleDegrees,
      }));

    wall.points = JSON.parse(JSON.stringify(newPoints));
    wall.width = getDistanceBetweenVectors(newPoints[0], newPoints[1]);
    wall.angleDegrees = getAngleBetweenVectors(
      newPoints[0],
      { x: newPoints[0].x + 300, y: newPoints[0].y },
      newPoints[1],
    );
    if (wall.mergeWalls.wallPoint0) this.updateMergeWallProperties(0, newPoints[1], wall.mergeWalls.wallPoint0);
    if (wall.mergeWalls.wallPoint1) this.updateMergeWallProperties(1, newPoints[0], wall.mergeWalls.wallPoint1);

    const nextAngles = this.getRoomCornerAnglesDeg(wall.roomId);
    const previewWalls: GhostWallPreview[] = affectedIds
      .map((id) => this.objectWalls.find((el) => el.id === id))
      .filter(Boolean)
      .map((w) => ({ id: w!.id, points: JSON.parse(JSON.stringify(w!.points)) }));

    backups.forEach((b) => {
      const target = this.objectWalls.find((el) => el.id === b.id);
      if (!target) return;
      target.points = b.points;
      target.width = b.width;
      target.angleDegrees = b.angleDegrees;
    });

    return { nextAngles, previewWalls };
  }

  public getRoomCornerAnglesDeg(roomId: string | number): number[] {
    const contour = this.getRoomContour(roomId);
    if (!contour || contour.length < 3) return [];
    const result: number[] = [];
    for (let i = 0; i < contour.length; i++) {
      const prev = contour[(i - 1 + contour.length) % contour.length];
      const curr = contour[i];
      const next = contour[(i + 1) % contour.length];
      const raw = getAngleBetweenVectors(curr, prev, next);
      const angle = this.normalizeCornerAngleDeg(raw);
      if (Number.isFinite(angle) && angle > 0) {
        result.push(angle);
      }
    }
    return result;
  }

  public hasAnyRoomAngleStepReached(
    previousAngles: number[] | null,
    nextAngles: number[] | null,
    stepDeg: number,
  ): boolean {
    if (!previousAngles || !nextAngles) return false;
    if (previousAngles.length === 0 || nextAngles.length === 0) return false;
    const len = Math.min(previousAngles.length, nextAngles.length);
    for (let i = 0; i < len; i++) {
      if (Math.abs(nextAngles[i] - previousAngles[i]) >= stepDeg) {
        return true;
      }
    }
    return false;
  }

  private getSnappedAngleDeg(angleDeg: number, stepDeg: number): number {
    const safeStep = Math.max(1, Number(stepDeg) || 1);
    return Math.round(angleDeg / safeStep) * safeStep;
  }

  private getAnglesQuantizationMetrics(
    angles: number[] | null,
    stepDeg: number,
  ): { maxError: number; totalError: number } {
    if (!angles || angles.length === 0) {
      return { maxError: Number.POSITIVE_INFINITY, totalError: Number.POSITIVE_INFINITY };
    }
    let maxError = 0;
    let totalError = 0;
    for (const angle of angles) {
      const snapped = this.getSnappedAngleDeg(angle, stepDeg);
      const error = Math.abs(angle - snapped);
      maxError = Math.max(maxError, error);
      totalError += error;
    }
    return { maxError, totalError };
  }

  public getStrictStepWallMoveSimulationResult(
    wallId: string | number,
    fromPoint0: Vector2,
    fromPoint1: Vector2,
    toPoint0: Vector2,
    toPoint1: Vector2,
    stepDeg: number,
  ): { nextPoint0: Vector2; nextPoint1: Vector2; nextAngles: number[]; previewWalls: GhostWallPreview[] } | null {
    const totalSteps = 120;
    const toleranceDeg = 0.005;
    let best: {
      nextPoint0: Vector2;
      nextPoint1: Vector2;
      nextAngles: number[];
      previewWalls: GhostWallPreview[];
      maxError: number;
      totalError: number;
      t: number;
    } | null = null;

    const tryCandidateAtT = (tRaw: number) => {
      const t = Math.max(0, Math.min(1, tRaw));
      const candidatePoint0: Vector2 = {
        x: fromPoint0.x + (toPoint0.x - fromPoint0.x) * t,
        y: fromPoint0.y + (toPoint0.y - fromPoint0.y) * t,
      };
      const candidatePoint1: Vector2 = {
        x: fromPoint1.x + (toPoint1.x - fromPoint1.x) * t,
        y: fromPoint1.y + (toPoint1.y - fromPoint1.y) * t,
      };
      const simulation = this.getWallMoveSimulationResult(wallId, candidatePoint0, candidatePoint1);
      if (!simulation?.nextAngles?.length) return;
      
      const metrics = this.getAnglesQuantizationMetrics(simulation.nextAngles, stepDeg);

      if (
        !best ||
        metrics.maxError < best.maxError - 1e-9 ||
        (
          Math.abs(metrics.maxError - best.maxError) <= 1e-9 &&
          (
            metrics.totalError < best.totalError - 1e-9 ||
            (
              Math.abs(metrics.totalError - best.totalError) <= 1e-9 &&
              t > best.t
            )
          )
        )
      ) {
        best = {
          nextPoint0: candidatePoint0,
          nextPoint1: candidatePoint1,
          nextAngles: simulation.nextAngles,
          previewWalls: simulation.previewWalls,
          maxError: metrics.maxError,
          totalError: metrics.totalError,
          t,
        };
      }
    };

    for (let i = 1; i <= totalSteps; i++) {
      const t = i / totalSteps;
      tryCandidateAtT(t);
    }

    // Локальная доводка лучшего кандидата: уменьшаем погрешность квантования
    // вокруг найденного t, чтобы убрать расхождения в сотых/десятых.
    if (best) {
      let center = best.t;
      let span = 1 / totalSteps;
      for (let iter = 0; iter < 5; iter++) {
        const samples = 21;
        for (let i = 0; i < samples; i++) {
          const alpha = i / (samples - 1);
          const t = center - span + alpha * span * 2;
          tryCandidateAtT(t);
        }
        center = best.t;
        span /= 3;
      }
    }

    if (!best) return null;
    if (best.maxError > toleranceDeg) return null;
    return {
      nextPoint0: best.nextPoint0,
      nextPoint1: best.nextPoint1,
      nextAngles: best.nextAngles,
      previewWalls: best.previewWalls,
    };
  }

  public getRoomAnglesForSimulatedWallMove(
    wallId: string | number,
    nextPoint0: Vector2,
    nextPoint1: Vector2,
  ): number[] | null {
    const wall = this.objectWalls.find((el) => el.id === wallId);
    if (!wall || wall.roomId == null) return null;
    const newPoints = this.calculatePositionPointsWall(
      nextPoint0,
      nextPoint1,
      wall.height,
      wall.heightDirection,
    );
    if (!this.canApplyWallPointMoveWithAcuteLimit(wall, newPoints)) return null;

    const affectedIds = this.getMergeWallsIDForUpdate(wall.id);
    if (!affectedIds.includes(wall.id)) affectedIds.push(wall.id);
    const backups = affectedIds
      .map((id) => this.objectWalls.find((el) => el.id === id))
      .filter(Boolean)
      .map((w) => ({
        id: w!.id,
        points: JSON.parse(JSON.stringify(w!.points)),
        width: w!.width,
        angleDegrees: w!.angleDegrees,
      }));

    wall.points = JSON.parse(JSON.stringify(newPoints));
    wall.width = getDistanceBetweenVectors(newPoints[0], newPoints[1]);
    wall.angleDegrees = getAngleBetweenVectors(
      newPoints[0],
      { x: newPoints[0].x + 300, y: newPoints[0].y },
      newPoints[1],
    );
    if (wall.mergeWalls.wallPoint0) this.updateMergeWallProperties(0, newPoints[1], wall.mergeWalls.wallPoint0);
    if (wall.mergeWalls.wallPoint1) this.updateMergeWallProperties(1, newPoints[0], wall.mergeWalls.wallPoint1);

    const nextAngles = this.getRoomCornerAnglesDeg(wall.roomId);

    backups.forEach((b) => {
      const target = this.objectWalls.find((el) => el.id === b.id);
      if (!target) return;
      target.points = b.points;
      target.width = b.width;
      target.angleDegrees = b.angleDegrees;
    });

    return nextAngles;
  }

  private getRoomMinAngleDeg(roomId: string | number): number | null {
    const contour = this.getRoomContour(roomId);
    if (!contour || contour.length < 3) return null;
    let minAngle = Number.POSITIVE_INFINITY;
    for (let i = 0; i < contour.length; i++) {
      const prev = contour[(i - 1 + contour.length) % contour.length];
      const curr = contour[i];
      const next = contour[(i + 1) % contour.length];
      const raw = getAngleBetweenVectors(curr, prev, next);
      const angle = this.normalizeCornerAngleDeg(raw);
      if (Number.isFinite(angle) && angle > 0) {
        minAngle = Math.min(minAngle, angle);
      }
    }
    return Number.isFinite(minAngle) ? minAngle : null;
  }

  private canApplyRoomAnglesLimitBySimulation(
    wall: ObjectWall,
    newPoints: [Vector2, Vector2, Vector2, Vector2],
    minBlockDeg: number,
  ): boolean {
    if (wall.roomId == null) return true;
    const oldRoomMin = this.getRoomMinAngleDeg(wall.roomId);
    if (oldRoomMin === null) return true;

    const affectedIds = this.getMergeWallsIDForUpdate(wall.id);
    if (!affectedIds.includes(wall.id)) affectedIds.push(wall.id);
    const backups = affectedIds
      .map((id) => this.objectWalls.find((el) => el.id === id))
      .filter(Boolean)
      .map((w) => ({
        id: w!.id,
        points: JSON.parse(JSON.stringify(w!.points)),
        width: w!.width,
        angleDegrees: w!.angleDegrees,
      }));

    wall.points = JSON.parse(JSON.stringify(newPoints));
    wall.width = getDistanceBetweenVectors(newPoints[0], newPoints[1]);
    wall.angleDegrees = getAngleBetweenVectors(
      newPoints[0],
      { x: newPoints[0].x + 300, y: newPoints[0].y },
      newPoints[1],
    );
    if (wall.mergeWalls.wallPoint0) this.updateMergeWallProperties(0, newPoints[1], wall.mergeWalls.wallPoint0);
    if (wall.mergeWalls.wallPoint1) this.updateMergeWallProperties(1, newPoints[0], wall.mergeWalls.wallPoint1);

    const newRoomMin = this.getRoomMinAngleDeg(wall.roomId);

    backups.forEach((b) => {
      const target = this.objectWalls.find((el) => el.id === b.id);
      if (!target) return;
      target.points = b.points;
      target.width = b.width;
      target.angleDegrees = b.angleDegrees;
    });

    if (newRoomMin === null) return true;
    return !(newRoomMin < minBlockDeg && newRoomMin < oldRoomMin);
  }

  public canMoveActiveWallWithAcuteLimit(newPoint0: Vector2, newPoint1: Vector2): boolean {
    if (this.state.activeWall === null) return true;
    const wall = this.objectWalls.find((el) => el.id === this.state.activeWall);
    if (!wall) return true;
    const newPoints = this.calculatePositionPointsWall(
      newPoint0,
      newPoint1,
      wall.height,
      wall.heightDirection,
    );
    return this.canApplyWallPointMoveWithAcuteLimit(wall, newPoints);
  }

  // Returns ordered wall IDs from startWall's neighbor toward the closing wall (exclusive on both ends).
  // direction 'forward' follows wallPoint0 (next wall); 'backward' follows wallPoint1 (prev wall).
  private getWallChainToAnchor(startWallId: string | number, direction: 'forward' | 'backward'): (string | number)[] {
    const chain: (string | number)[] = [];
    const seen = new Set<string>();
    const start = this.objectWalls.find(w => w.id === startWallId);
    if (!start) return chain;
    let currentId: string | number | null = direction === 'forward'
      ? start.mergeWalls.wallPoint0
      : start.mergeWalls.wallPoint1;
    while (currentId != null) {
      const key = String(currentId);
      if (seen.has(key)) break;
      seen.add(key);
      const current = this.objectWalls.find(w => w.id === currentId);
      if (!current || current.isClosing) break;
      chain.push(currentId);
      currentId = direction === 'forward'
        ? current.mergeWalls.wallPoint0
        : current.mergeWalls.wallPoint1;
    }
    return chain;
  }

  // Translate a wall's endpoints by (dx, dy) without touching its neighbors.
  private translateWallRigid(wallId: string | number, dx: number, dy: number): void {
    const wall = this.objectWalls.find(w => w.id === wallId);
    if (!wall) return;
    const newP0: Vector2 = { x: wall.points[0].x + dx, y: wall.points[0].y + dy };
    const newP1: Vector2 = { x: wall.points[1].x + dx, y: wall.points[1].y + dy };
    wall.points = this.calculatePositionPointsWall(newP0, newP1, wall.height, wall.heightDirection);
    wall.width = getDistanceBetweenVectors(newP0, newP1);
    wall.angleDegrees = getAngleBetweenVectors(newP0, { x: newP0.x + 300, y: newP0.y }, newP1);
  }

  // Rotate a wall's endpoints around a center point by angle (radians).
  private rotateWallRigid(wallId: string | number, center: Vector2, angle: number): void {
    const wall = this.objectWalls.find(w => w.id === wallId);
    if (!wall) return;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rot = (p: Vector2): Vector2 => ({
      x: center.x + (p.x - center.x) * cos - (p.y - center.y) * sin,
      y: center.y + (p.x - center.x) * sin + (p.y - center.y) * cos,
    });
    const newP0 = rot(wall.points[0]);
    const newP1 = rot(wall.points[1]);
    wall.points = this.calculatePositionPointsWall(newP0, newP1, wall.height, wall.heightDirection);
    wall.width = getDistanceBetweenVectors(newP0, newP1);
    wall.angleDegrees = getAngleBetweenVectors(newP0, { x: newP0.x + 300, y: newP0.y }, newP1);
  }

  // Recalculate closing wall so it connects its two neighbors, absorbing any geometric remainder.
  public recalculateClosingWall(roomId: string | number): void {
    const closing = this.objectWalls.find(
      w => w.roomId === roomId && w.isClosing && w.name !== 'dividing_wall'
    );
    if (!closing) return;
    // wallPoint1 = prev wall (its points[1] = closing.points[0])
    // wallPoint0 = next wall (its points[0] = closing.points[1])
    const prevWall = closing.mergeWalls.wallPoint1 != null
      ? this.objectWalls.find(w => w.id === closing.mergeWalls.wallPoint1)
      : null;
    const nextWall = closing.mergeWalls.wallPoint0 != null
      ? this.objectWalls.find(w => w.id === closing.mergeWalls.wallPoint0)
      : null;
    if (!prevWall || !nextWall) return;
    const newP0: Vector2 = { ...prevWall.points[1] };
    const newP1: Vector2 = { ...nextWall.points[0] };
    closing.points = this.calculatePositionPointsWall(newP0, newP1, closing.height, closing.heightDirection);
    closing.width = getDistanceBetweenVectors(newP0, newP1);
    closing.angleDegrees = getAngleBetweenVectors(newP0, { x: newP0.x + 300, y: newP0.y }, newP1);
  }

  public applyWallLengthMm(wallId: string | number, lengthMm: number): boolean {
    const context = this.getExactWallEditContext(wallId);
    if (!context) return false;
    const targetMm = Math.max(200, lengthMm);
    const targetPlan = targetMm / 10;
    const currentLength = context.wallLength;
    if (Math.abs(currentLength - targetPlan) < Planner.EXACT_EPSILON) return false;

    const model = this.getExactRoomModel(context.roomId);
    if (!model) return false;

    const nextModel = updateExactWallLength(model, wallId, targetPlan);
    const geometry = rebuildExactRoomGeometry(nextModel);
    const committed = this.commitExactRoomGeometry(context.roomId, geometry);

    if (!committed) return false;

    this.parent.updateRoomStore();
    return true;
  }

  public setActiveWallAngleByPoint0(targetAngleDeg: number): boolean {
    if (this.state.activeWall === null) return false;
    return this.applyWallAngleDeg(this.state.activeWall, targetAngleDeg);
  }

  public applyWallAngleDeg(wallId: string | number, targetAngleDeg: number): boolean {
    const context = this.getExactWallEditContext(wallId);
    if (!context || !context.incomingDir) return false;

    const desired = Math.max(50, Math.min(359, targetAngleDeg));

    if (context.wallIndex > 0 && context.roomId != null) {
      const model = this.getExactRoomModel(context.roomId);
      if (!model) return false;

      const nextModel = updateExactWallDisplayAngle(model, wallId, desired);
      if (!validateExactRoomModel(nextModel)) return false;
      const geometry = rebuildExactRoomGeometry(nextModel);
      const committed = this.commitExactRoomGeometry(context.roomId, geometry);

      if (!committed) return false;

      if (this.isSameId(this.state.activeWall, wallId)) {
        const updatedWall = this.objectWalls.find((item: ObjectWall) => this.isSameId(item.id, wallId));
        if (updatedWall) {
          this.parent.layers.startPointActiveObject.updatePositionIndicatorPoint(updatedWall.points[1]);
          this.parent.layers.startPointActiveObject.drawAngleBetweenWalls();
        }
      }

      this.parent.updateRoomStore();
      return true;
    }

    const wall = context.wall;
    const pivot = context.point0;
    const currentEnd = context.point1;
    const length = Math.max(0.001, context.wallLength);
    const referencePoint = this.getIncomingReferencePoint(pivot, context.incomingDir, length);
    const base = Math.atan2(referencePoint.y - pivot.y, referencePoint.x - pivot.x);
    const rad = MathUtils.degToRad(desired);

    const cA: Vector2 = {
      x: pivot.x + Math.cos(base + rad) * length,
      y: pivot.y + Math.sin(base + rad) * length,
    };
    const cB: Vector2 = {
      x: pivot.x + Math.cos(base - rad) * length,
      y: pivot.y + Math.sin(base - rad) * length,
    };
    const angA = this.getDisplayedCornerAngleDeg(referencePoint, pivot, cA);
    const angB = this.getDisplayedCornerAngleDeg(referencePoint, pivot, cB);
    const nextPoint = this.circularDiff(angA, desired) <= this.circularDiff(angB, desired) ? cA : cB;

    const deltaDx = nextPoint.x - currentEnd.x;
    const deltaDy = nextPoint.y - currentEnd.y;
    if (Math.abs(deltaDx) < 1e-6 && Math.abs(deltaDy) < 1e-6) return false;

    wall.points = this.calculatePositionPointsWall(pivot, nextPoint, wall.height, wall.heightDirection);
    wall.width = getDistanceBetweenVectors(pivot, nextPoint);
    wall.angleDegrees = getAngleBetweenVectors(pivot, { x: pivot.x + 300, y: pivot.y }, nextPoint);
    this.wallPoint0AngleOverrides.set(String(wall.id), {
      incomingDir: { ...context.incomingDir },
      angleDeg: desired,
    });

    context.tailWalls.forEach((tailWall: ObjectWall) => this.translateWallRigid(tailWall.id, deltaDx, deltaDy));

    if (wall.roomId != null) this.recalculateClosingWall(wall.roomId);

    this.drawWall(wall.id);
    context.tailWalls.forEach((tailWall: ObjectWall) => this.drawWall(tailWall.id));
    const closingWall = this.objectWalls.find(w => w.roomId === wall.roomId && w.isClosing);
    if (closingWall) this.drawWall(closingWall.id);

    this.redrawHalfRoom();

    if (this.isSameId(this.state.activeWall, wall.id)) {
      this.parent.layers.startPointActiveObject.updatePositionIndicatorPoint(nextPoint);
      this.parent.layers.startPointActiveObject.drawAngleBetweenWalls();
    }
    this.parent.updateRoomStore();
    return true;
  }

  public applyClosingWallAngleDeg(roomId: string | number, targetAngleDeg: number): boolean {
    const model = this.getExactRoomModel(roomId);
    if (!model || model.regularWalls.length < 2) return false;

    const lastWall = model.regularWalls[model.regularWalls.length - 1];
    if (lastWall.turnFromPreviousDeg == null) return false;

    const desired = Math.max(1, Math.min(359, targetAngleDeg));

    const getC4Angle = (c3Angle: number): number | null =>
      computeClosingWallCornerAngleDeg(updateExactWallDisplayAngle(model, lastWall.wallId, c3Angle));

    const atLo = getC4Angle(1);
    const atHi = getC4Angle(359);
    if (atLo == null || atHi == null) return false;

    const increasing = atHi > atLo;
    let lo = 1, hi = 359;

    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const c4 = getC4Angle(mid);
      if (c4 == null) break;
      if (Math.abs(c4 - desired) < 0.05) { lo = hi = mid; break; }
      if ((c4 > desired) === increasing) hi = mid;
      else lo = mid;
    }

    const bestModel = updateExactWallDisplayAngle(model, lastWall.wallId, (lo + hi) / 2);
    if (!validateExactRoomModel(bestModel)) return false;
    const geometry = rebuildExactRoomGeometry(bestModel);
    const committed = this.commitExactRoomGeometry(roomId, geometry);
    if (!committed) return false;

    this.parent.updateRoomStore();
    return true;
  }

  public deactiveWalls(): void {

    this.state.activeWall = null;
    this.state.activePointWall = null;

    this.parent.eventBus.emit(Events.C2D_HIDE_FORM_MODIFY_WALL);
    this.parent.eventBus.emit(Events.C2D_HIDE_ANGLE_INPUT_MODAL);

    this.redrawAllObjects();

  }

  /**
   * Разделяет стену на две новые.
   * Логика:
   * - берём исходную стену (W), её точки points[0] и points[1] и roomId
   * - находим соседние стены по mergeWalls.wallPoint0 и wallPoint1 (если есть)
   * - создаём новую точку splitPoint в середине сегмента [p0, p1]
   * - создаём две новые стены W1 и W2, каждая в той же комнате, что и исходная
   *   W1: [p0, splitPoint], W2: [splitPoint, p1]
   * - перевычисляем их points (четырёхугольник) через calculatePositionPointsWall
   * - настраиваем mergeWalls:
   *   - если был сосед слева (old.mergeWalls.wallPoint1), привязываем его к W1
   *   - если был сосед справа (old.mergeWalls.wallPoint0), привязываем его к W2
   *   - W1 и W2 соединяем друг с другом в средней точке
   * - удаляем старую стену и её контейнеры, добавляем контейнеры и отрисовываем новые
   * - обновляем roomStore
   */
  public splitWallIntoTwo(id: string | number): void {

    const indexWall = this.objectWalls.findIndex(el => el.id === id);
    if (indexWall === -1) return;

    const oldWall = this.objectWalls[indexWall];
    if (!oldWall || !oldWall.points || oldWall.points.length < 2) return;

    if (oldWall.isClosing) return;

    const p0 = oldWall.points[0];
    const p1 = oldWall.points[1];

    // середина старой стены
    const splitPoint: Vector2 = {
      x: (p0.x + p1.x) / 2,
      y: (p0.y + p1.y) / 2,
    };

    // создаём две новые прямые (по 2 точки), затем расширим до 4 через calculatePositionPointsWall
    const firstLineP0: Vector2 = { ...p0 };
    const firstLineP1: Vector2 = { ...splitPoint };
    const secondLineP0: Vector2 = { ...splitPoint };
    const secondLineP1: Vector2 = { ...p1 };

    const firstPoints = this.calculatePositionPointsWall(
      firstLineP0,
      firstLineP1,
      oldWall.height,
      oldWall.heightDirection
    );

    const secondPoints = this.calculatePositionPointsWall(
      secondLineP0,
      secondLineP1,
      oldWall.height,
      oldWall.heightDirection
    );

    const firstId: string = String(oldWall.name || 'wall') + '__split1__' + MathUtils.generateUUID();
    const secondId: string = String(oldWall.name || 'wall') + '__split2__' + MathUtils.generateUUID();

    // исходные связи
    const leftNeighborId = oldWall.mergeWalls.wallPoint1;
    const rightNeighborId = oldWall.mergeWalls.wallPoint0;

    // mergeWalls для новых стен
    const firstMergeWalls: MergeWalls = {
      wallPoint0: null,
      wallPoint1: null,
    };

    const secondMergeWalls: MergeWalls = {
      wallPoint0: null,
      wallPoint1: null,
    };

    // Привязываем левого соседа к первой новой стене
    if (leftNeighborId != null) {
      const leftNeighbor = this.objectWalls.find(w => w.id === leftNeighborId);
      if (leftNeighbor) {
        // старая стена была отмерджена как wallPoint1 -> значит у соседа она в wallPoint0
        firstMergeWalls.wallPoint1 = leftNeighbor.id;
        // у соседа заменяем ссылку на старую стену id на первую новую
        if (leftNeighbor.mergeWalls.wallPoint0 === id) {
          leftNeighbor.mergeWalls.wallPoint0 = firstId;
        }
        if (leftNeighbor.mergeWalls.wallPoint1 === id) {
          leftNeighbor.mergeWalls.wallPoint1 = firstId;
        }
      }
    }

    // Привязываем правого соседа ко второй новой стене
    if (rightNeighborId != null) {
      const rightNeighbor = this.objectWalls.find(w => w.id === rightNeighborId);
      if (rightNeighbor) {
        secondMergeWalls.wallPoint0 = rightNeighbor.id;
        if (rightNeighbor.mergeWalls.wallPoint0 === id) {
          rightNeighbor.mergeWalls.wallPoint0 = secondId;
        }
        if (rightNeighbor.mergeWalls.wallPoint1 === id) {
          rightNeighbor.mergeWalls.wallPoint1 = secondId;
        }
      }
    }

    // Соединяем две новые стены между собой:
    // для простоты: W1.wallPoint0 <-> W2.id и W2.wallPoint1 <-> W1.id
    firstMergeWalls.wallPoint0 = secondId;
    secondMergeWalls.wallPoint1 = firstId;

    // создаём объекты новых стен
    const firstWall: ObjectWall = {
      id: firstId,
      name: oldWall.name,
      width: getDistanceBetweenVectors(firstPoints[0], firstPoints[1]),
      height: oldWall.height,
      heightDirection: oldWall.heightDirection,
      angleDegrees: getAngleBetweenVectors(
        firstPoints[0],
        { x: firstPoints[0].x + 300, y: firstPoints[0].y },
        firstPoints[1]
      ),
      updateTime: Date.now(),
      mergeWalls: firstMergeWalls,
      points: firstPoints,
      roomId: oldWall.roomId,
      containers: undefined,
    };

    const secondWall: ObjectWall = {
      id: secondId,
      name: oldWall.name,
      width: getDistanceBetweenVectors(secondPoints[0], secondPoints[1]),
      height: oldWall.height,
      heightDirection: oldWall.heightDirection,
      angleDegrees: getAngleBetweenVectors(
        secondPoints[0],
        { x: secondPoints[0].x + 300, y: secondPoints[0].y },
        secondPoints[1]
      ),
      updateTime: Date.now(),
      mergeWalls: secondMergeWalls,
      points: secondPoints,
      roomId: oldWall.roomId,
      containers: undefined,
    };

    // Удаляем старую стену с холста и из массива
    this.state.activeWall = oldWall.id;
    this.deleteSelectedObject(false);

    // Добавляем новые стены рядом с позицией старой
    // (после deleteSelectedObject() this.objectWalls уже без старой)
    const insertIndex = Math.min(indexWall, this.objectWalls.length);
    this.objectWalls.splice(insertIndex, 0, firstWall, secondWall);

    // создаём контейнеры и рисуем новые стены (локально, до пересборки)
    this.createDrawContainers(firstWall.id);
    this.createDrawContainers(secondWall.id);
    this.drawWall(firstWall.id);
    this.drawWall(secondWall.id);

    // Обновляем данные комнаты и полностью пересобираем planner
    // (init -> clear + initRoom), тем самым заново пересчитывая mergeWalls, как при старте
    this.parent.updateRoomStore();
    this.init(true);
  }

  public addDefaultWallBeforeClosing(roomId: string | number): boolean {
    const orderedWalls = this.getOrderedChain(roomId);
    const regularWalls = orderedWalls.filter((wall: ObjectWall) => !wall.isClosing);
    const closingWall = orderedWalls.find((wall: ObjectWall) => wall.isClosing) ?? null;

    if (!closingWall || regularWalls.length === 0) return false;

    const lastRegularWall = regularWalls[regularWalls.length - 1];
    const model = this.getExactRoomModel(roomId);
    if (!model) return false;

    const newWallId = `wall__default__${MathUtils.generateUUID()}`;
    const nextModel = insertExactWallBeforeClosing(model, {
      wallId: newWallId,
      length: 300,
      turnFromPreviousDeg: -10,
      displayAngleDeg: 170,
    });
    const geometry = rebuildExactRoomGeometry(nextModel);
    const newWallGeometry = geometry.regularWalls.find((wall) => this.isSameId(wall.wallId, newWallId));
    if (!newWallGeometry) return false;

    const newWall: ObjectWall = {
      id: newWallId,
      name: 'wall',
      width: newWallGeometry.width,
      height: lastRegularWall.height,
      heightDirection: lastRegularWall.heightDirection,
      angleDegrees: newWallGeometry.angleDegrees,
      updateTime: Date.now(),
      mergeWalls: {
        wallPoint1: lastRegularWall.id,
        wallPoint0: closingWall.id,
      },
      points: this.calculatePositionPointsWall(
        newWallGeometry.point0,
        newWallGeometry.point1,
        lastRegularWall.height,
        lastRegularWall.heightDirection,
      ),
      roomId,
      containers: undefined,
    };

    lastRegularWall.mergeWalls.wallPoint0 = newWallId;
    closingWall.mergeWalls.wallPoint1 = newWallId;

    const closingWallIndex = this.objectWalls.findIndex((wall: ObjectWall) => this.isSameId(wall.id, closingWall.id));
    const insertIndex = closingWallIndex === -1 ? this.objectWalls.length : closingWallIndex;
    this.objectWalls.splice(insertIndex, 0, newWall);
    this.createDrawContainers(newWall.id);

    const committed = this.commitExactRoomGeometry(roomId, geometry);
    if (!committed) return false;

    this.parent.updateRoomStore();
    this.init(true);
    return true;
  }

  public addWallBeforeClosing(anchorWallId: string | number): void {
    const anchorWall = this.objectWalls.find((wall: ObjectWall) => this.isSameId(wall.id, anchorWallId));
    if (!anchorWall || anchorWall.roomId == null) return;
    this.addDefaultWallBeforeClosing(anchorWall.roomId);
  }

  public updateScenePosition(): void {

    this.container.x = this.parent.config.originOfCoordinates.x + 30;
    this.container.y = this.parent.config.originOfCoordinates.y + 30;

    const indexPoint = this.state.activePointWall;
    const indexDataWall = this.objectWalls.findIndex(el => el.id === this.state.activeWall);

    if (indexDataWall == -1) return;

    const dataWall = this.objectWalls[indexDataWall];

    this.parent.eventBus.emit(Events.C2D_UPDATE_FORM_MODIFY_WALL, {
      width: Number(dataWall.width.toFixed(1)) * 10,
      height: Number(dataWall.height.toFixed(1)) * 10,
      position: {
        x: dataWall.points[0].x + this.parent.config.originOfCoordinates.x,
        y: dataWall.points[0].y + this.parent.config.originOfCoordinates.y
      }
    });

  }

  public removeWallById(id: string | number): void {
    if (!id) return;
    const exists = this.objectWalls.find((el: ObjectWall) => el.id === id);
    if (!exists) return;
    const regularWalls = this.objectWalls.filter(
      (w: ObjectWall) => w.roomId === exists.roomId && w.name !== 'dividing_wall' && !w.isClosing
    );
    if (regularWalls.length <= 3) return;
    this.state.activeWall = id;
    this.deleteSelectedObject();
  }

  private reconnectNeighborsAfterWallDelete(
    leftNeighborId: string | number | null,
    rightNeighborId: string | number | null,
    deletedPoint0: Vector2,
    deletedPoint1: Vector2,
    roomId: string | number | null = null,
  ): void {
    const left = leftNeighborId != null
      ? this.objectWalls.find((el: ObjectWall) => el.id === leftNeighborId)
      : null;
    const right = rightNeighborId != null
      ? this.objectWalls.find((el: ObjectWall) => el.id === rightNeighborId)
      : null;

    if (!left && !right) return;
    if (left && right) {
      // Сцепляем соседей в устойчивую точку без пересечения бесконечных прямых,
      // чтобы избежать "улёта" геометрии при почти параллельных стенах.
      const connectPoint: Vector2 = {
        x: (deletedPoint0.x + deletedPoint1.x) / 2,
        y: (deletedPoint0.y + deletedPoint1.y) / 2,
      };

      left.points[1] = connectPoint;
      left.points = this.calculatePositionPointsWall(
        left.points[0],
        left.points[1],
        left.height,
        left.heightDirection,
      );
      left.width = getDistanceBetweenVectors(left.points[0], left.points[1]);
      left.angleDegrees = getAngleBetweenVectors(
        left.points[0],
        { x: left.points[0].x + 300, y: left.points[0].y },
        left.points[1],
      );

      right.points[0] = connectPoint;
      right.points = this.calculatePositionPointsWall(
        right.points[0],
        right.points[1],
        right.height,
        right.heightDirection,
      );
      right.width = getDistanceBetweenVectors(right.points[0], right.points[1]);
      right.angleDegrees = getAngleBetweenVectors(
        right.points[0],
        { x: right.points[0].x + 300, y: right.points[0].y },
        right.points[1],
      );

      left.mergeWalls.wallPoint0 = right.id;
      right.mergeWalls.wallPoint1 = left.id;
      if (roomId !== null) {
        left.roomId = roomId;
        right.roomId = roomId;
      }
      return;
    }

    if (left) {
      left.mergeWalls.wallPoint0 = null;
      if (roomId !== null) left.roomId = roomId;
    }
    if (right) {
      right.mergeWalls.wallPoint1 = null;
      if (roomId !== null) right.roomId = roomId;
    }
  }

  public deleteSelectedObject(reconnectNeighbors: boolean = true): void {

    if (this.state.activeWall) {

      const indexWall = this.objectWalls.findIndex((el: ObjectWall) => el.id === this.state.activeWall);

      if (indexWall != -1) {

        for (const key in this.objectWalls[indexWall].containers) {

          const graphic = this.objectWalls[indexWall].containers[key as keyof ObjectWallContainers];

          if (graphic && typeof graphic.destroy === "function") {

            try {

              if (key === "eventGraphic" && graphic instanceof PIXI.Graphics) {
                graphic.off("mouseover", this.handlerOverEventGraphic);
                graphic.off("mouseout", this.handlerOutEventGraphic);
                graphic.off("pointerdown", this.handlerDownEventGraphic);
              }

              // Уничтожаем графику, только если она существует
              if (!graphic.destroyed) {
                graphic.destroy(true); // Уничтожаем графику рекурсивно
              }

              // Убираем из контейнера, если графика существует
              if (this.container && this.container.children.includes(graphic)) {
                this.container.removeChild(graphic);
              }

              // Обнуляем ссылку
              this.objectWalls[indexWall].containers[key as keyof ObjectWallContainers] = null!;

            } catch (error) {
              console.warn(`Failed to destroy graphic: ${key}`, error);
            }

          }

        }

        const wallForDelete = this.objectWalls[indexWall];
        const leftNeighborId = wallForDelete.mergeWalls.wallPoint1 ?? null;
        const rightNeighborId = wallForDelete.mergeWalls.wallPoint0 ?? null;
        const deletedPoint0 = JSON.parse(JSON.stringify(wallForDelete.points[0])) as Vector2;
        const deletedPoint1 = JSON.parse(JSON.stringify(wallForDelete.points[1])) as Vector2;

        const deletedRoomId = this.objectWalls[indexWall].roomId ?? null;

        this.objectWalls.splice(indexWall, 1);
        if (reconnectNeighbors) {
          this.reconnectNeighborsAfterWallDelete(
            leftNeighborId,
            rightNeighborId,
            deletedPoint0,
            deletedPoint1,
            deletedRoomId,
          );
        } else {
          if (leftNeighborId !== null) {
            const left = this.objectWalls.find((el: ObjectWall) => el.id === leftNeighborId);
            if (left) left.mergeWalls.wallPoint0 = null;
          }
          if (rightNeighborId !== null) {
            const right = this.objectWalls.find((el: ObjectWall) => el.id === rightNeighborId);
            if (right) right.mergeWalls.wallPoint1 = null;
          }
        }

        if (deletedRoomId !== null) {
          const countAfter = this.objectWalls.reduce((acc, wall) => {
            return acc + (
              wall.roomId === deletedRoomId && wall.name !== "dividing_wall" ? 1 : 0
            );
          }, 0);
          if (countAfter === 0) {
            // отвязываем все внутренние стены от удаленной комнаты
            this.objectWalls.forEach((wall: ObjectWall) => {
              if (wall.name === "dividing_wall" && wall.roomId === deletedRoomId) {
                wall.roomId = null;
              }
            });

            // отвязываем все внутренние объекты от удаленной комнаты
            this.parent.layers.doorsAndWindows.drawObjects.forEach((obj: IDrawObjects) => {
              if (obj.roomId === deletedRoomId) {
                obj.roomId = null;
              }
            });
            this.removeRoom(deletedRoomId);
          }
        }
        console.log('remove | all rooms:', this.allRooms);
        // this.roomStore.removeWall({
        //   idRoom: this.roomStore.getSchemeTransitionData[0].id,
        //   idWall: this.state.activeWall
        // });

        this.state.activePointWall = null;
        this.parent.layers.doorsAndWindows.detachFromWall({
          type: "wall",
          id: this.state.activeWall
        });
        this.state.activeWall = null
        this.parent.eventBus.emit(Events.C2D_HIDE_ANGLE_INPUT_MODAL);

        this.redrawAllObjects();
        this.parent.layers.arrowRulerActiveObject?.clearGraphic();
        this.parent.layers.startPointActiveObject?.activate(false);

        this.redrawHalfRoom();

        this.parent.updateRoomStore();

      }

    }

  }

  public getWallProperty<T extends keyof ObjectWall>(
    id: string | number,
    propName: T
  ): ObjectWall[T] | null {
    const wall = this.objectWalls?.find(wall => wall.id === id);
    if (!wall) return null;
    const value = wall[propName];
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
  }

  public set scale(v: number) {
    this.container!.scale.set(v);
  }

  public destroy(): void {
    // Отписываемся от всех наблюдателей
    // this.unwatchList.forEach(unwatch => unwatch());
    // this.unwatchList = []; // Очищаем массив для безопасности

    // Удаляем графику из сцены
    this.objectWalls.forEach(drawObject => {
      const containers = drawObject.containers;

      // Уничтожаем каждый элемент контейнеров
      if (containers) {

        for (const key in containers) {

          if (
            key === "root" ||
            key === "containerTextRulerWall" ||
            key === "textRulerWall"
          ) continue; // пропускаем корневой контейнер

          const graphic = containers[key];

          if (graphic && typeof graphic.destroy === "function") {

            try {

              if (key === "eventGraphic" && graphic instanceof PIXI.Graphics) {
                graphic
                  .off("mouseover", this.handlerOverEventGraphic)
                  .off("mouseout", this.handlerOutEventGraphic)
                  .off("pointerdown", this.handlerDownEventGraphic);
              }

              // Уничтожаем графику, только если она существует
              if (graphic && typeof graphic.destroy === "function") {
                graphic.destroy({
                  texture: false,     // Удалить текстуру (если она есть)
                  baseTexture: false, // Удалить базовую текстуру (если есть)
                }); // Уничтожаем графику рекурсивно
              }

              // Убираем из контейнера, если графика существует
              if (containers.root && containers.root.children.includes(graphic)) containers.root.removeChild(graphic);

              // Обнуляем ссылку
              containers[key as keyof ObjectWallContainers] = null!;

            } catch (error) {
              console.warn(`Failed to destroy graphic: ${key}`, error);
            }

          } else {
            console.warn(`Skipping destroy for graphic: ${key}, as it is null or undefined`);
          }
        }

        // удаляем контейнер textRulerWall
        try {
          if (containers.textRulerWall && typeof containers.textRulerWall.destroy === "function") {
            containers.textRulerWall.destroy(true);
          }
          if (
            containers.containerTextRulerWall &&
            containers.containerTextRulerWall.children.includes(containers.textRulerWall)
          ) {
            containers.containerTextRulerWall.removeChild(containers.textRulerWall);
          }
          containers.textRulerWall = null!;
        } catch (error) {
          console.warn(`Failed to destroy graphic: textRulerWall`, error);
        }

        // удаляем контейнер containerTextRulerWall
        try {
          if (containers.containerTextRulerWall && typeof containers.containerTextRulerWall.destroy === "function") {
            containers.containerTextRulerWall.destroy(true);
          }
          if (
            containers.root &&
            containers.root.children.includes(containers.containerTextRulerWall)
          ) {
            containers.root.removeChild(containers.containerTextRulerWall);
          }
          containers.containerTextRulerWall = null!;
        } catch (error) {
          console.warn(`Failed to destroy graphic: containerTextRulerWall`, error);
        }

        // удаляем контейнер root
        try {
          if (containers.root && typeof containers.root.destroy === "function") {
            containers.root.destroy({
              children: true,     // Удалить дочерние элементы (если это Container)
              texture: false,     // Удалить текстуру (если она есть)
              baseTexture: false, // Удалить базовую текстуру (если есть)
            });
          }
          if (
            this.container &&
            this.container.children.includes(containers.root)
          ) {
            this.container.removeChild(containers.root);
          }
          containers.root = null!;
        } catch (error) {
          console.warn(`Failed to destroy graphic: root`, error);
        }

      }

    });


    this.app.stage
      .off("pointerup", this.handlerStageMouseUp)
      .off("mousemove", this.handlerStageMouseMove);

    this.parent.eventBus.off(Events.C2D_MODIFY_WALL, this.eventModifyWall);
    this.parent.eventBus.off(Events.C2D_REMOVE_WALL, this.eventRemoveWall);

    if (this.activeObjectGraphic) {
      this.activeObjectGraphic.destroy(true);
      this.app.stage.removeChild(this.activeObjectGraphic);
      this.activeObjectGraphic = null!;
    }

    this.objectWalls = []; // Очищаем массив объектов

    // Обнуляем другие ссылки
    this.app = null!;

  }

};
