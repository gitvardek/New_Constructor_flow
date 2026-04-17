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
        const nextPoint0: Vector2 = {
          x: this.state.oldPosition[0].x + distance.x,
          y: this.state.oldPosition[0].y + distance.y,
        };
        const nextPoint1: Vector2 = {
          x: this.state.oldPosition[1].x + distance.x,
          y: this.state.oldPosition[1].y + distance.y,
        };
        // [REMOVED: quantization + ghosting solver]
        // if (this.state.dragRoomId != null && this.state.dragLastCommittedAngles) {
        //   const simulation = this.getWallMoveSimulationResult(id, nextPoint0, nextPoint1);
        //   if (!simulation) { this.clearGhostPreview(); return; }
        //   const { nextAngles, previewWalls } = simulation;
        //   this.drawGhostPreview(previewWalls);
        //   const shouldCommit = this.hasAnyRoomAngleStepReached(
        //     this.state.dragLastCommittedAngles, nextAngles, this.state.dragAngleStepDeg,
        //   );
        //   if (!shouldCommit) {
        //     const mainPreview = previewWalls.find((w: any) => w.id === id) ?? previewWalls[0];
        //     if (mainPreview && mainPreview.points?.length >= 2) {
        //       this.parent.layers.startPointActiveObject.activate([mainPreview.points[0], mainPreview.points[1]]);
        //       this.parent.layers.arrowRulerActiveObject.draw(mainPreview.points[this.state.activePointWall ?? 0]);
        //     }
        //     return;
        //   }
        //   this.clearGhostPreview();
        //   this.state.dragLastCommittedAngles = nextAngles;
        //   this.state.hasAngleStepCommit = true;
        // } else
        if (!this.canMoveActiveWallWithAcuteLimit(nextPoint0, nextPoint1)) {
          this.clearGhostPreview();
          return;
        }
      
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