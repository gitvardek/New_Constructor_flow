//@ts-nocheck

import { MathUtils } from "three";
import { useSchemeTransition } from "@/store/canvasMerge/schemeTransition";
import { useRoomState } from "@/store/appliction/useRoomState";
import { useEventBus } from "@/store/appliction/useEventBus";

import { IRoom, IWallData, IContentItem } from "@/types/interfases";

import { ObjectWall, IC2DRoom } from "./../../Layers/Planner/interfaces";

import { IDrawObjects } from "./../../Layers/DoorsAndWindows/interfaces";

import { getCenterOfPoints } from "@/Constructor2D/utils/Math/index";

function updateRoomStore(this: any): boolean {
  const normalizeId = (value: string | number | null | undefined) =>
    value !== undefined && value !== null ? String(value) : "";
  const eventBus = useEventBus();
  const roomState = useRoomState();
  console.log("BEFORE: ", roomState.rooms);
  const roomStore = useSchemeTransition();
  
  // Сохраняем все существующие комнаты из roomState
  const existingRoomsMap = new Map<string | number, IRoom>();
  roomState.rooms.forEach((room: IRoom) => {
    const normalizedId = normalizeId(room.id);
    existingRoomsMap.set(normalizedId, JSON.parse(JSON.stringify(room)));
  });

  roomStore.clearStore(); // очищаем хранилище
  console.log("AFTER: ", roomState.rooms);

  const rooms: IRoom[] = [];

  // Получаем список ID объектов из 2D (двери и окна) для фильтрации
  const idObjectsFrom2D =
    this.IDObjects?.map(
      (item: { id: string | number; name: string }) => item.id
    ) || [];
  // const idToFilter = [166755, ...idObjectsFrom2D]; // перегородки + двери/окна

    const idToFilter = [...idObjectsFrom2D]; 

  // Создаем Set для отслеживания комнат, которые обновляются из 2D
  const updatedRoomIds = new Set<string>();

  this.layers.planner.allRooms.forEach((roomData: IC2DRoom) => {
    const normalizedRoomId = normalizeId(roomData.id);
    // Находим существующую комнату в roomState для сохранения content и basket
    const existingRoom = roomState.rooms.find(
      (r: IRoom) => normalizeId(r.id) === normalizedRoomId
    );

    // Сохраняем существующий content из 3D сцены, исключая элементы из 2D (перегородки, двери, окна)
    let preservedContent: IContentItem[] = [];
    if (existingRoom?.content) {
      try {
        const contentArray = Array.isArray(existingRoom.content)
          ? existingRoom.content
          : typeof existingRoom.content === "string"
          ? JSON.parse(existingRoom.content)
          : [];

        // Фильтруем только предметы из 3D сцены, исключая элементы из 2D
        // Сравниваем ID с учетом разных типов (string и number)
        preservedContent = contentArray.filter((item: any) => {
          if (!item || !item.id) return false;
          const itemId = item.id;
          // Проверяем, не входит ли ID в список элементов из 2D
          return !idToFilter.some(
            (filterId) => String(filterId) === String(itemId)
          );
        });
      } catch (error) {
        console.warn("Ошибка при парсинге content комнаты:", error);
        preservedContent = [];
      }
    }

    const room: IRoom = {
      id: normalizedRoomId /** ID комнаты */,
      label: roomData.label /** Лейбл */,
      description: roomData.description /** Описание */,
      params: {
        walls: [],
        // Сохраняем существующие значения wall и floor, если они есть
        // wall: existingRoom?.params?.wall ?? "44144",
        // floor: existingRoom?.params?.floor ?? "44020",
        wall: existingRoom?.params?.wall ?? "85074",
        floor: existingRoom?.params?.floor ?? "44035",
      },
      // Начинаем с сохраненного content из 3D сцены
      content: preservedContent,
      // Сохраняем существующий basket из roomState, если он есть
      basket: existingRoom?.basket,
    };

    // 1. довляем стены и перегородки
    this.layers.planner.objectWalls.forEach((wallData: ObjectWall) => {
      if (
        wallData.roomId &&
        normalizeId(wallData.roomId) === normalizedRoomId
      ) {
        if (wallData.name === "dividing_wall") {
          // // если перегородка

          // // const centerWall = getCenterOfPoints(wallData.points);
          // const centerWall = getCenterOfPoints([
          //   wallData.points[0],
          //   wallData.points[1],
          // ]);

          // const wData: IContentItem = {
          //   id: 166755,
          //   uuid: String(wallData.id),
          //   position: {
          //     x: centerWall.x * 10,
          //     y: (300 * 10) / 2,
          //     z: centerWall.y * 10,
          //   },
          //   rotation: {
          //     isEuler: true,
          //     _x: 0,
          //     _y: MathUtils.degToRad(-wallData.angleDegrees),
          //     _z: 0,
          //     _order: "XYZ",
          //   },
          //   size: {
          //     width: wallData.width * 10,
          //     height: 300 * 10,
          //     depth: wallData.height * 10,
          //   },
          // };

          // room.content?.push(wData);
        } else {
          // если стена

          const centerWall = getCenterOfPoints([
            wallData.points[0],
            wallData.points[1],
          ]);

          const wData: IWallData = {
            id: normalizeId(wallData.id),
            width: wallData.width * 10,
            height: 300 * 10,
            depth: wallData.height * 10,
            position: {
              x: centerWall.x * 10,
              y: (300 * 10) / 2,
              z: centerWall.y * 10,
            },
            rotation: {
              isEuler: true,
              _x: 0,
              _y: MathUtils.degToRad(-wallData.angleDegrees),
              _z: 0,
              _order: "XYZ",
            },
            side: 0,
          };

          room.params!.walls.push(wData);
        }
      }
    });

    // 2. добавляем окна, двери и другие объекты
    this.layers.doorsAndWindows.drawObjects.forEach((objData: IDrawObjects) => {
      if (objData.roomId && normalizeId(objData.roomId) === normalizedRoomId) {
        const IDObjects: number | string | null =
          this.IDObjects.find(
            (item: { id: string | number; name: string }) =>
              item.name === objData.name
          )?.id ?? null;

        if (IDObjects === null) {
          console.warn(
            `Object with name ${objData.name} not found in IDObjects`
          );
          return;
        }

        const centerWall = getCenterOfPoints(
          objData.name === "door" || objData.name === "window"
            ? [objData.points[0], objData.points[1]]
            : objData.points
        );

        // смещаем дверь/окно по нормали стены, чтобы поставить модель на нужную сторону
        let normalOffsetX = 0;
        let normalOffsetY = 0;

        if (objData.name === "door" || objData.name === "window") {
          const wallForObject = this.layers.planner.objectWalls.find(
            (wall: ObjectWall) => wall.id === objData.belongsToWall?.id
          );

          const pointsForDirection = wallForObject?.points ?? objData.points;

          if (pointsForDirection?.length >= 2) {
            const dir = {
              x: pointsForDirection[1].x - pointsForDirection[0].x,
              y: pointsForDirection[1].y - pointsForDirection[0].y,
            };

            const dirLength = Math.hypot(dir.x, dir.y);

            if (dirLength) {
              const normal = {
                x: -dir.y / dirLength,
                y: dir.x / dirLength,
              };

              const offsetSign =
                objData.heightDirection ?? wallForObject?.heightDirection ?? 1;
              const offsetDistanceRatio = 0.3; // чуть меньше половины толщины, одинаково везде
              const offsetDistance =
                (objData.height ?? wallForObject?.height ?? 0) *
                10 *
                offsetDistanceRatio;

              normalOffsetX = normal.x * offsetDistance * offsetSign;
              normalOffsetY = normal.y * offsetDistance * offsetSign;
            }
          }
        }

        const obj: IContentItem = {
          // id объекта для 3D сцены
          id: IDObjects, // Заметка: убрать "?? 0"
          position: {
            x: centerWall.x * 10 - normalOffsetX,
            y:
              objData.name === "door"
                ? 0
                : objData.name === "window"
                ? 1500
                : (300 * 10) / 2,
            z: centerWall.y * 10 - normalOffsetY,
          },
          rotation: {
            isEuler: true,
            _x: 0,
            _y: MathUtils.degToRad(-objData.angleDegrees),
            _z: 0,
            _order: "XYZ",
          },
        };

        if (objData.name === "door" || objData.name === "window") {
          obj.size = {
            width: objData.width * 10,
            height: 0,
            depth: objData.height * 10,
          };
        }

        room.content?.push(obj);
      }
    });

    rooms.push(room);
    updatedRoomIds.add(normalizedRoomId);

    // console.log("rooms", rooms);
  });

  // Добавляем все комнаты, которые не представлены в 2D редакторе
  existingRoomsMap.forEach((existingRoom, roomId) => {
    if (!updatedRoomIds.has(roomId)) {
      // Комната не была обновлена из 2D, сохраняем её как есть
      rooms.push(existingRoom);
    }
  });

  roomStore.setAppData(rooms);
  // Сразу синхронизируем стор комнат, чтобы 3D получил актуальные id/контент
  roomState.rooms = rooms;

  // Уведомляем историю 2D о новом состоянии для undo/redo
  eventBus.emit("C2D:HistoryPush");

  console.log("AFTER AFTER: ", roomState.rooms);
  return true;
}

export { updateRoomStore };
