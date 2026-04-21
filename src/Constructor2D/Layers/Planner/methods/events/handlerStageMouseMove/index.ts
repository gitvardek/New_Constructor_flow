import * as PIXI from "pixi.js";
// import Planner from "./../../../index";
import { Vector2 } from "@/types/constructor2d/interfaсes";
import { ObjectWall } from "./../../../interfaces";

export function handlerStageMouseMove(this: any, e: PIXI.FederatedPointerEvent): void {

  if(this.state.mouseLeft && this.state.activeWall){

    const id = this.state.activeWall;

    const mousePostion: Vector2 = {
      x: e.global.x,
      y: e.global.y,
    };

    const distance: Vector2 = {
      x: (mousePostion.x - this.state.positionDown.x) * this.parent.config.inverseScale,
      y: (mousePostion.y - this.state.positionDown.y) * this.parent.config.inverseScale
    };

    const dataWall = this.objectWalls.find((el: ObjectWall) => el.id === id);

    if(dataWall){

      let status = true;
      for(let index=0, len=dataWall.points.length; index<len; index++){
        if(
          this.state.oldPosition[index].x + distance.x < 0 || 
          this.state.oldPosition[index].y + distance.y < 0
        ){
          status = false;
        }
      }

      if(status){
      
        dataWall.points.forEach((p: Vector2, index: number) => {
          p.x = this.state.oldPosition[index].x + distance.x;
          p.y = this.state.oldPosition[index].y + distance.y;
        });

        if(dataWall.mergeWalls.wallPoint0){
          this.updateMergeWallProperties(
            0, 
            dataWall.points[1], 
            dataWall.mergeWalls.wallPoint0
          );
        }

        if(dataWall.mergeWalls.wallPoint1){
          this.updateMergeWallProperties(
            1,
            dataWall.points[0],
            dataWall.mergeWalls.wallPoint1
          );
        }

        const listRelatedWalls: (string | number)[] = this.getMergeWallsIDForUpdate(id);
        // визуализация списка стен и доабвляемая в списке
        this.drawListWalls(listRelatedWalls);

        this.parent.layers.startPointActiveObject.activate([dataWall.points[0], dataWall.points[1]]);
        this.parent.layers.arrowRulerActiveObject.draw(dataWall.points[this.state.activePointWall ?? 0]);
      }

    }

    e.stopPropagation(); // Останавливаем всплытие события
    
  }

};