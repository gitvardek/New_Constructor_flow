//@ts-nocheck
import * as PIXI from 'pixi.js';
// import { MathUtils } from "three";

import {
  IHalfRoomData,
  IConfig
} from "./interfaces";

import {
  IC2DRoom
} from "./../Planner/interfaces";

import { shape } from "@/Constructor2D/utils/Shape";
import {
  getCenterOfPoints
} from "@/Constructor2D/utils/Math";

import { Events } from '@/store/constructor2d/events';

import dblClick from "./methods/events/dblclick";
import eventSetRoomLabel from "./methods/events/eventSetRoomLabel";

export default class HalfRoom {

  private app: PIXI.Application;
  private parent: any;
  private container: PIXI.Container;

  private handlerDoubleClickNameRoom: (e: PIXI.FederatedPointerEvent) => void;
  private eventSetRoomLabel: (data: { roomId: number | string; label: string }) => void;

  public config: IConfig = {
    half: {
      color: 0xECEBF1,
    },
    textStyleName: {
      fontSize: 20,
      fill: 0x131313,
      fontWeight: 500,
    }
  };

  private state: IState = {
    graphics: [],
  };

  constructor(pixiApp: PIXI.Application, parent: any) {

    if (!pixiApp) throw new Error("PIXI.Application instance is required");

    this.app = pixiApp;
    this.parent = parent;
    this.container = new PIXI.Container();
    this.container.x = 30;
    this.container.y = 30;
    this.app.stage.addChild(this.container);

    this.handlerDoubleClickNameRoom = dblClick.bind(this);
    this.eventSetRoomLabel = eventSetRoomLabel.bind(this);

    this.parent.eventBus.on(Events.C2D_SET_ROOM_LABEL, this.eventSetRoomLabel);

  }

  // добавление пола комнаты или его редактирование
  public drawHalfRoom(roomList: IHalfRoomData[]): void {

    roomList.forEach((item: IHalfRoomData) => {

      let halfRoom = this.state.graphics.find((el) => el.id === item.id);

      if (halfRoom === undefined) {
        halfRoom = {
          id: item.id,
          graphic: new PIXI.Graphics(),
          textName: new PIXI.Text({
            text: "",
            style: this.config.textStyleName,
          }),
        };
        this.state.graphics.push(halfRoom);
        this.container.addChild(halfRoom.graphic);

        halfRoom.textName.eventMode = 'none';
        
        // определяем двойной клик по полу комнаты
        halfRoom.graphic.eventMode = 'static';
        halfRoom.graphic.roomId = item.id; // сохраняем id комнаты в текстовом объекте
        halfRoom.graphic.on('pointertap', this.handlerDoubleClickNameRoom);

        this.container.addChild(halfRoom.textName);
      }

      halfRoom.graphic.clear();

      shape(halfRoom.graphic, item.points, this.config.half.color);

      const center = getCenterOfPoints(item.points);
      if (item.points.length > 2) {
        halfRoom.textName.visible = true;
        halfRoom.textName.text = item.label;
        halfRoom.textName.x = center.x - halfRoom.textName.width / 2;
        halfRoom.textName.y = center.y - halfRoom.textName.height / 2;
      } else {
        halfRoom.textName.text = "";
        halfRoom.textName.visible = false;
      }

    });

  }

  // удаление пола комнаты
  public removeHalfRoom(id: string | number | null = null): void {

    if (id === null) {
      this.state.graphics.forEach((item) => {
        this.container.removeChild(item.graphic);
        item.graphic.off('pointertap', this.handlerDoubleClickNameRoom);
        item.graphic.destroy();
        item.textName.text = "";
        this.container.removeChild(item.textName);
        item.textName.destroy();
      });
      this.state.graphics = [];
      return;
    }

    // удаляем пол комнаты по id
    // находим индекс элемента в массиве
    // если индекс не -1, то удаляем элемент из массива и из контейнера
    // удаляем графику из контейнера
    // удаляем графику из массива
    const index = this.state.graphics.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.container.removeChild(this.state.graphics[index].graphic);
      this.state.graphics[index].graphic.off('pointertap', this.handlerDoubleClickNameRoom);
      this.state.graphics[index].graphic.destroy();
      this.state.graphics[index].textName.text = "";
      this.container.removeChild(this.state.graphics[index].textName);
      this.state.graphics[index].textName.destroy();
      this.state.graphics.splice(index, 1);
    }

  }

  public updateScenePosition(): void {

    this.container!.x = this.parent.config.originOfCoordinates.x + 30;
    this.container!.y = this.parent.config.originOfCoordinates.y + 30;

  }

  public set scale(v: number) {
    this.container!.scale.set(v);
  }

  public destroy(): void {
    try {
      // Сначала очищаем все графические элементы
      if (this.state.graphics && this.state.graphics.length > 0) {
        this.state.graphics.forEach((item) => {
          try {
            if (item.graphic) {
              // Отключаем события
              item.graphic.off('pointertap', this.handlerDoubleClickNameRoom);
              
              // Удаляем из контейнера, если он еще существует
              if (this.container && this.container.children && this.container.children.includes(item.graphic)) {
                this.container.removeChild(item.graphic);
              }
              
              // Уничтожаем графику
              item.graphic.destroy();
              item.graphic = null;
            }
            
            if (item.textName) {
              // Удаляем из контейнера, если он еще существует
              if (this.container && this.container.children && this.container.children.includes(item.textName)) {
                this.container.removeChild(item.textName);
              }
              
              // Уничтожаем текст
              item.textName.destroy();
              item.textName = null;
            }
          } catch (error) {
            console.warn('Ошибка при уничтожении элемента HalfRoom:', error);
          }
        });
        this.state.graphics = [];
      }

      // Отключаем события
      try {
        this.parent.eventBus.off(Events.C2D_SET_ROOM_LABEL, this.eventSetRoomLabel);
      } catch (error) {
        console.warn('Ошибка при отключении событий HalfRoom:', error);
      }

      // Уничтожаем контейнер
      if (this.container) {
        try {
          this.container.destroy();
        } catch (error) {
          console.warn('Ошибка при уничтожении контейнера HalfRoom:', error);
        }
        this.container = null;
      }

      // Очищаем ссылки
      this.app = null;
      this.parent = null;
    } catch (error) {
      console.error('Ошибка при уничтожении HalfRoom:', error);
    }
  }

};