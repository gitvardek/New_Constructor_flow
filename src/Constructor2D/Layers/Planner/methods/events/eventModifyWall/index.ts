import { ObjectWall } from "./../../../interfaces";

import {
  offsetVectorBySegment
} from "@/Constructor2D/utils/Math";

export function eventModifyWall(this: any, data: {width: number, height: number}): void {
  // const indexPoint = this.state.activePointWall;
  const indexDataWall = this.objectWalls.findIndex((el: ObjectWall) => el.id === this.state.activeWall);

  if(indexDataWall == -1) return;

  const dataWall = this.objectWalls[indexDataWall];

  const addWidth: number = data.width/10 - dataWall.width;

  dataWall.width = data.width/10;
  dataWall.height = data.height/10;

  const newPoint_1 = offsetVectorBySegment(
    [
      dataWall.points[0],
      dataWall.points[1]
    ],
    dataWall.points[1],
    addWidth
  );

  const newPoints = this.calculatePositionPointsWall(
    dataWall.points[0],
    newPoint_1,
    dataWall.height,
    dataWall.heightDirection
  );

  dataWall.points = newPoints;

  if(dataWall.mergeWalls.wallPoint0) this.updateMergeWallProperties(0, newPoints[1], dataWall.mergeWalls.wallPoint0);

  const listRelatedWalls: (string | number)[] = this.getMergeWallsIDForUpdate(dataWall.id);
  this.drawListWalls(listRelatedWalls);

  this.parent.updateRoomStore();
}