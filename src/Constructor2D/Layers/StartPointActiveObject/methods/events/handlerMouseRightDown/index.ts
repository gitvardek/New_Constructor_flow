import * as PIXI from "pixi.js";
import { Events } from "@/store/constructor2d/events";

export function handlerMouseRightDown(this: any, e: PIXI.FederatedPointerEvent): void {
  const graphic = e.currentTarget as PIXI.Graphics & { indexPoint: number };
  const indexPoint = graphic.indexPoint;
  if (indexPoint !== 0) return;

  const activeWallId = this.parent.layers.planner.state.activeWall;
  if (!activeWallId) return;
  const angleGeometry = this.parent.layers.planner.getWallPoint0AngleGeometry(activeWallId);
  if (!angleGeometry) return;
  const currentAngle = angleGeometry.currentAngleDeg;
  const isEditable = this.parent.layers.planner.isWallPoint0AngleEditable(activeWallId);

  const canvas = this.app.canvas as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const domX = rect.left + e.global.x;
  const domY = rect.top + e.global.y;

  this.parent.eventBus.emit(Events.C2D_SHOW_ANGLE_INPUT_MODAL, {
    x: domX,
    y: domY,
    angle: currentAngle,
    readOnly: !isEditable,
    onApply: (value: number) => {
      this.parent.layers.planner.applyWallAngleDeg(activeWallId, value);
      this.drawAngleBetweenWalls();
    },
  });

  try {
    e.preventDefault();
  } catch {
    // no-op
  }
  e.stopPropagation();
}
