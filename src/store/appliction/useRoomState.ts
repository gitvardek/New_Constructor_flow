
// @ts-nocheck

import { defineStore } from 'pinia';
import { ref, computed, toRaw } from 'vue';
import { rooms_mok } from "@/Application/F-mockapi"
import { useSchemeTransition } from '../canvasMerge/schemeTransition';
import { useAppData } from "@/store/appliction/useAppData";
import { useSceneState } from './useSceneState';

import * as THREEInterfases from "../../types/interfases"
import { TFasadeItem } from "@/types/types";

export type TempRoomParamsKey = 'wall' | 'floor';
export type TRoutPath = '/3d' | '/2d';

export const useRoomState = defineStore('RoomState', () => {

  const normalizeId = (value: string | number | null | undefined) => value !== null && value !== undefined ? String(value) : '';
  const isSameId = (a: string | number | null | undefined, b: string | number | null | undefined) => {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return normalizeId(a) === normalizeId(b);
  };

  const normalizeRoom = (room: any) => {
    const clone = JSON.parse(JSON.stringify(room || {}));
    clone.id = normalizeId(clone.id);
    clone.content = typeof clone.content === 'string' ? JSON.parse(clone.content) : (clone.content || []);
    if (!clone.params) clone.params = { walls: [], wall: '', floor: '' };
    if (!Array.isArray(clone.params.walls)) clone.params.walls = [];
    clone.params.walls = clone.params.walls.map((wall: any) => ({ ...wall, id: normalizeId(wall?.id) }));
    return clone;
  };

  const schemeTransition = useSchemeTransition();
  const sceneState = useSceneState();
  const roomsData = JSON.parse(JSON.stringify(schemeTransition.getSchemeTransitionData || []));
  const rooms = ref<THREEInterfases.IRoom[]>(Array.isArray(roomsData) ? roomsData.map(normalizeRoom) : []);
  const roomLoad = ref<boolean>(false)

  const appDataStore = useAppData()
  const appData = appDataStore.getAppData

  const APP = computed(() => useAppData().getAppData || {})

  // const APP = useAppData();

  const currentRoomId = ref<string | null>(null);
  const tempRoomSize = ref<THREEInterfases.IWallSizes | null>(null);
  const updatedRoomContent = ref<THREEInterfases.IContentItem[] | null>([])

  const convertDataTo3DConstuctor = () => {
    const data = toRaw(schemeTransition.getSchemeTransitionData)
    rooms.value = data.map(normalizeRoom)
  }

  const convertDataTo2DConstuctor = () => {
    schemeTransition.setAppData(rooms.value.map(normalizeRoom))
  }

  const converActions = {
    '/2d': () => convertDataTo2DConstuctor(),
    '/3d': () => convertDataTo3DConstuctor()
  }

  const routConvertData = (value: TRoutPath) => {
    converActions[value]()
  }

  const addRoom = (room: THREEInterfases.IRoom) => {
    const newValue = [...rooms.value, ...[normalizeRoom(room)]]
    rooms.value = newValue
  };

  const updateRoom = (id: number | string, content: THREEInterfases.IContentItem[], params: THREEInterfases.IWallSizes, basket: any) => {
    const room = rooms.value.find(room => isSameId(room.id, id));

    if (room) {
      room.content = content;
      room.params = params;
      room.basket = basket;

      convertDataTo2DConstuctor()
      console.log(   room.params, '== rooms ==')

      return
    }

  };

  const removeRoom = (id: number | string) => {
    rooms.value = rooms.value.filter(room => !isSameId(room.id, id));
    if (rooms.value.length == 0) {
      clearCurrentRoomId()
    }

    /** Обновляем общий стор */
    sceneState.updateProjectParams({ rooms: rooms.value })

  };

  const setCurrentRoomId = (id: number | string) => {
    currentRoomId.value = normalizeId(id);
  };

  const clearCurrentRoomId = () => {
    currentRoomId.value = null;
  };

  const setCurrentRoomParams = (value: THREEInterfases.IWallSizes) => {
    tempRoomSize.value = value
  }

  const clearTempRoomSize = () => {
    tempRoomSize.value = null
  }

  const tempRoomUpdate = (value: number | string, type: TempRoomParamsKey) => {
    if (tempRoomSize.value) {
      tempRoomSize.value[type] = value
    }
  }

  //------------------------------------------------------------------------------------------

  const getCurrentRoomParams = computed(() => {
    return tempRoomSize.value
  });

  /** Возвращаем с использованием ID комнаты */
  const getCurrentRoomData = (roomId) => {
    let centerized = schemeTransition.getRoomDataFor3DScene(roomId);

    const currentRoom = rooms.value.find(value => isSameId(value.id, roomId))

    if (centerized) {
      currentRoom.params = centerized?.params ?? currentRoom?.params;
      currentRoom.content = centerized?.content ?? currentRoom?.content;
    }

    return rooms.value.find(value => isSameId(value.id, roomId))
  }

  const getRoomId = computed(() => {
    return currentRoomId.value
  });

  const getRoomContent = computed(() => {
    const room = rooms.value.find(room => isSameId(room.id, currentRoomId.value));
    if (room) {
      return room.content
    }
    return []
  })

  const getRooms = computed(() => {
    return rooms.value
  })

  const setLoad = async (value) => {
    roomLoad.value = value
  }

  const getLoad = computed(() => {
    return roomLoad.value
  })

  return {
    rooms,
    getRooms,
    addRoom,
    updateRoom,
    removeRoom,
    getRoomId,


    setCurrentRoomId,
    clearCurrentRoomId,

    setCurrentRoomParams,
    getCurrentRoomParams,
    clearTempRoomSize,
    tempRoomUpdate,

    updatedRoomContent,
    getRoomContent,

    getCurrentRoomData,

    convertDataTo3DConstuctor,
    convertDataTo2DConstuctor,
    routConvertData,

    setLoad,
    getLoad
  };
});
