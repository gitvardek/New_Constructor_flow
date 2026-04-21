import { MathUtils } from "three";
import * as PIXI from "pixi.js";
import { ObjectWall } from "./../../../interfaces";
import { Events } from "@/store/constructor2d/events";

export function handlerDownEventGraphic(this: any, e: PIXI.FederatedPointerEvent): void {

  const target = e.currentTarget as PIXI.Graphics & { wallId?: string | number };
  const id = target.wallId;

  // Правый клик по стене — показываем контекстное меню
  if (e.button === 2) {
    if (id != null) {
      // Сначала скрываем старое меню, если оно открыто
      this.parent.eventBus.emit(Events.C2D_HIDE_WALL_CONTEXT_MENU);
      
      // Получаем DOM координаты курсора
      // Преобразуем координаты PIXI в DOM координаты
      const canvas = this.app.canvas as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      
      // При autoDensity: true, e.global.x/y уже в логических CSS пикселях
      // Просто добавляем позицию canvas на странице
      const domX = rect.left + e.global.x;
      const domY = rect.top + e.global.y;
      
      // Небольшая задержка для предотвращения конфликтов
      setTimeout(() => {
        // Эмитим событие для показа контекстного меню
        this.parent.eventBus.emit(Events.C2D_SHOW_WALL_CONTEXT_MENU, {
          x: domX,
          y: domY,
          wallId: id,
          onSplitWall: (wallId: string | number) => {
            if (typeof this.splitWallIntoTwo === 'function') {
              this.splitWallIntoTwo(wallId);
            } else {
              console.warn('Wallsplitter is not defined on Planner');
            }
          }
        });
      }, 0);
    }
    e.stopPropagation();
    return;
  }

  if (e.button == 0){

    // снимает активность с окна или двери
    this.parent.layers.doorsAndWindows.setActiveObject(null);

    this.state.mouseLeft = true;

    const prevActiveObject = this.state.activeWall;

    this.state.activeWall = id;
    this.state.activePointWall = 0;

    const addedwall = this.objectWalls.find((el: ObjectWall) => el.id === id);

    if (addedwall && addedwall.points) {
      this.state.oldPosition = JSON.parse(JSON.stringify(addedwall.points));
    }
    
    this.state.positionDown.x = e.global.x;
    this.state.positionDown.y = e.global.y;
    
    if(id !== prevActiveObject){
      
      if(!prevActiveObject){
        this.redrawAllObjects();
      }else{
        this.drawWall(prevActiveObject);
        this.drawWall(id);
      }
      
      // рендеринг стрелок
      this.parent.layers.arrowRulerActiveObject.draw(addedwall?.points[this.state.activePointWall]);

      // рендеринг активных точек
      this.parent.layers.startPointActiveObject.activate(
        [
          addedwall?.points[0],
          addedwall?.points[1]
        ], 
        this.state.activePointWall
      );

      if(addedwall){
        this.parent.layers.startPointActiveObject.startPointRect.rotation = MathUtils.degToRad(addedwall.angleDegrees);
        this.parent.layers.startPointActiveObject.endPointRect.rotation = MathUtils.degToRad(addedwall.angleDegrees);
      }

    }

    this.parent.eventBus.emit(Events.C2D_HIDE_FORM_MODIFY_WALL);

  }
  
  e.stopPropagation(); // Останавливаем всплытие события
  
};