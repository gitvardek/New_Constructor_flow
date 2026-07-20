import { Events } from "@/store/constructor2d/events";

export function eventRemoveWall(this: any): void {

  this.deleteSelectedObject();
  this.parent.eventBus.emit(Events.C2D_HIDE_FORM_MODIFY_WALL);
  
};