import { MathUtils } from "three";
// import * as PIXI from "pixi.js";
import { ObjectWall } from "./../../../Planner/interfaces";
// import { Vector2 } from "@/types/constructor2d/interfaсes";

import {
  offsetVectorBySegment,
  rotatePoint,
} from "./../../../../utils/Math";

export function drawAngleBetweenWalls(this:any): void {

  const activePoint = this.parent.layers.planner.state.activePointWall;

  if(activePoint !== null){

    this.angleBetweenWalls.clear();
    this.angleBetweenWalls.visible = true;

    const wall = this.parent.layers.planner.objectWalls.find((el: ObjectWall) => el.id === this.parent.layers.planner.state.activeWall);
    if(!wall) return;

    const angleGeometry = this.parent.layers.planner.getWallPoint0AngleGeometry(wall.id);
    if(angleGeometry){

      const p1 = angleGeometry.point1Pivot;
      const p2 = angleGeometry.point2WallEnd;
      const degTextAngle = angleGeometry.currentAngleDeg;
      const vAngle = degTextAngle > 180 ? degTextAngle - 360 : degTextAngle;
      
      const radius = Math.max(24, 120 - (degTextAngle * 96 / 90));

      const startAngle = MathUtils.degToRad(wall.angleDegrees); // Начинаем арку перпендикулярно линии (p1, p2)
      const endAngle = MathUtils.degToRad(vAngle + wall.angleDegrees);   // Заканчиваем арку перпендикулярно линии (p0, p1)

      this.angleBetweenWalls.arc(p1.x, p1.y, radius, startAngle, endAngle);
      this.angleBetweenWalls.stroke({ width: 1, color: this.config.colorAngleArc });

      /*
      angleText
      angleTextConatainer
      circleAngleMask
      */

      { // рисуем текст угла

        this.angleTextConatainer.visible = true;

        const circlePointOffsetSegment = offsetVectorBySegment(
          [p1, p2],
          p1,
          radius
        );

        const angle = (vAngle < 0 ? -((360-vAngle) / 2) : (vAngle / 2));

        const circlePosition = rotatePoint(
          circlePointOffsetSegment,
          p1,
          angle
        );
        
        // рисуем кружок
        this.circleAngleMask.clear();
        this.circleAngleMask.circle(circlePosition.x, circlePosition.y, 10);
        this.circleAngleMask.fill({
          color: 0xffffff
        });

        const displayAngle = Math.round(degTextAngle);
        this.angleText.text = `${displayAngle}°`;

        this.angleTextConatainer.pivot.x = 5; // this.angleText.width / 2;
        this.angleTextConatainer.pivot.y = this.angleText.height / 2;

        this.angleTextConatainer.rotation = MathUtils.degToRad(angle + wall.angleDegrees);

        this.angleTextConatainer.position.x = circlePosition.x;
        this.angleTextConatainer.position.y = circlePosition.y;

      }

    }else{
        
      this.angleBetweenWalls.clear();
      this.circleAngleMask.clear();
      this.angleText.text = "";
      this.angleBetweenWalls.visible = false;
      this.angleTextConatainer.visible = false;

    }

  }

};
