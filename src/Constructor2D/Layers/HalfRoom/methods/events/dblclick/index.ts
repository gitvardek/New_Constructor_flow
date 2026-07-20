import * as PIXI from "pixi.js";

import { IHalfRoomData } from "./../../../interfaces";

import { Events } from "@/store/constructor2d/events";

let lastClickTime = 0;

export default function dblClick(this: any, e: PIXI.FederatedPointerEvent): void {

  const now = Date.now();

  // Интервал между кликами (300 мс)
  if (now - lastClickTime < 300) {

    if (e.target instanceof PIXI.Graphics) {

      const target = e.target as PIXI.Graphics & { roomId: number | string; };

      const text = this.state.graphics.find((room: IHalfRoomData) => room.id === target.roomId)?.textName.text || "";

      this.parent.eventBus.emit(Events.C2D_SHOW_FORM_ROOM_LABEL, {value: text, roomId: target.roomId});

    }

    lastClickTime = 0; // Сброс
    
  } else {

    lastClickTime = now;

  }

};