import { ObjectWall } from "@/Constructor2D/Layers/Planner/interfaces";
import { Vector2 } from "@/types/constructor2d/interfaсes";

const EPSILON = 1e-6;

export const WALL_ANGLE_MIN_DEG = 15;
export const WALL_ANGLE_MAX_DEG = 300;

export interface ExactWallParameter {
  wallId: string | number;
  length: number;
  turnFromPreviousDeg: number | null;
  displayAngleDeg: number | null;
}

export interface ExactRoomModel {
  roomId: string | number;
  startPoint: Vector2;
  firstWallDirectionDeg: number;
  regularWalls: ExactWallParameter[];
  closingWallId: string | number | null;
}

export interface ExactWallLineGeometry {
  wallId: string | number;
  roomId: string | number;
  isClosing: boolean;
  point0: Vector2;
  point1: Vector2;
  width: number;
  angleDegrees: number;
}

export interface ExactRoomGeometry {
  roomId: string | number;
  regularWalls: ExactWallLineGeometry[];
  closingWall: ExactWallLineGeometry | null;
}

const clonePoint = (point: Vector2): Vector2 => ({
  x: point.x,
  y: point.y,
});

const getSegmentLength = (point0: Vector2, point1: Vector2): number =>
  Math.hypot(point1.x - point0.x, point1.y - point0.y);

const getNormalizedDirection = (point0: Vector2, point1: Vector2): Vector2 | null => {
  const dx = point1.x - point0.x;
  const dy = point1.y - point0.y;
  const length = Math.hypot(dx, dy);

  if (length < EPSILON) {
    return null;
  }

  return {
    x: dx / length,
    y: dy / length,
  };
};

const negateVector = (vector: Vector2): Vector2 => ({
  x: -vector.x,
  y: -vector.y,
});

const normalizeAngle360 = (angle: number): number => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const normalizeAngle180 = (angle: number): number => {
  const normalized = normalizeAngle360(angle);
  return normalized > 180 ? normalized - 360 : normalized;
};

const getSignedAngleDeg = (from: Vector2, to: Vector2): number => {
  const cross = from.x * to.y - from.y * to.x;
  const dot = from.x * to.x + from.y * to.y;
  return (Math.atan2(cross, dot) * 180) / Math.PI;
};

const getWallDirectionDeg = (point0: Vector2, point1: Vector2): number =>
  (Math.atan2(point1.y - point0.y, point1.x - point0.x) * 180) / Math.PI;

const getDirectionByAngleDeg = (angleDeg: number): Vector2 => {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(rad),
    y: Math.sin(rad),
  };
};

const getPointByDirectionAndLength = (point: Vector2, directionDeg: number, length: number): Vector2 => {
  const direction = getDirectionByAngleDeg(directionDeg);
  return {
    x: point.x + direction.x * length,
    y: point.y + direction.y * length,
  };
};

export const getDisplayedAngleBetweenWallsDeg = (previousDir: Vector2, currentDir: Vector2): number =>
  normalizeAngle360(getSignedAngleDeg(negateVector(previousDir), currentDir));

export const extractExactRoomModel = (orderedWalls: ObjectWall[]): ExactRoomModel | null => {
  if (!Array.isArray(orderedWalls) || orderedWalls.length === 0) {
    return null;
  }

  const regularWalls = orderedWalls.filter((wall: ObjectWall) => wall.isClosing !== true);
  const closingWall = orderedWalls.find((wall: ObjectWall) => wall.isClosing === true) ?? null;
  const roomId = regularWalls[0]?.roomId ?? closingWall?.roomId ?? null;

  if (roomId == null || regularWalls.length === 0) {
    return null;
  }

  const firstWall = regularWalls[0];
  const firstDirection = getNormalizedDirection(firstWall.points[0], firstWall.points[1]);

  if (!firstDirection) {
    return null;
  }

  const wallParameters: ExactWallParameter[] = regularWalls.map((wall: ObjectWall, index: number) => {
    const point0 = wall.points[0];
    const point1 = wall.points[1];
    const wallDirection = getNormalizedDirection(point0, point1);

    if (!wallDirection) {
      throw new Error(`Wall ${String(wall.id)} has zero length and cannot be part of exact model.`);
    }

    if (index === 0) {
      return {
        wallId: wall.id,
        length: getSegmentLength(point0, point1),
        turnFromPreviousDeg: null,
        displayAngleDeg: null,
      };
    }

    const previousWall = regularWalls[index - 1];
    const previousDirection = getNormalizedDirection(previousWall.points[0], previousWall.points[1]);

    if (!previousDirection) {
      throw new Error(`Wall ${String(previousWall.id)} has zero length and cannot be part of exact model.`);
    }

    return {
      wallId: wall.id,
      length: getSegmentLength(point0, point1),
      turnFromPreviousDeg: normalizeAngle180(getSignedAngleDeg(previousDirection, wallDirection)),
      displayAngleDeg: getDisplayedAngleBetweenWallsDeg(previousDirection, wallDirection),
    };
  });

  return {
    roomId,
    startPoint: clonePoint(firstWall.points[0]),
    firstWallDirectionDeg: normalizeAngle180(getWallDirectionDeg(firstWall.points[0], firstWall.points[1])),
    regularWalls: wallParameters,
    closingWallId: closingWall?.id ?? null,
  };
};

export const rebuildExactRoomGeometry = (model: ExactRoomModel): ExactRoomGeometry => {
  let currentPoint = clonePoint(model.startPoint);
  let currentDirectionDeg = model.firstWallDirectionDeg;

  const regularGeometry: ExactWallLineGeometry[] = model.regularWalls.map((wall: ExactWallParameter, index: number) => {
    if (index > 0 && wall.turnFromPreviousDeg != null) {
      currentDirectionDeg = normalizeAngle180(currentDirectionDeg + wall.turnFromPreviousDeg);
    }

    const point0 = clonePoint(currentPoint);
    const point1 = getPointByDirectionAndLength(point0, currentDirectionDeg, wall.length);

    currentPoint = clonePoint(point1);

    return {
      wallId: wall.wallId,
      roomId: model.roomId,
      isClosing: false,
      point0,
      point1,
      width: wall.length,
      angleDegrees: normalizeAngle180(currentDirectionDeg),
    };
  });

  const closingWall = buildClosingWallGeometry(model, regularGeometry);

  return {
    roomId: model.roomId,
    regularWalls: regularGeometry,
    closingWall,
  };
};

export const updateExactWallLength = (
  model: ExactRoomModel,
  wallId: string | number,
  nextLength: number,
): ExactRoomModel => ({
  ...model,
  regularWalls: model.regularWalls.map((wall) =>
    String(wall.wallId) === String(wallId)
      ? {
          ...wall,
          length: nextLength,
        }
      : wall,
  ),
});

export const updateExactWallDisplayAngle = (
  model: ExactRoomModel,
  wallId: string | number,
  displayAngleDeg: number,
): ExactRoomModel => {
  const nextTurn = normalizeAngle180(180 - displayAngleDeg);

  return {
    ...model,
    regularWalls: model.regularWalls.map((wall) =>
      String(wall.wallId) === String(wallId)
        ? {
            ...wall,
            turnFromPreviousDeg: wall.turnFromPreviousDeg == null ? wall.turnFromPreviousDeg : nextTurn,
            displayAngleDeg,
          }
        : wall,
    ),
  };
};

export const insertExactWallBeforeClosing = (
  model: ExactRoomModel,
  wall: ExactWallParameter,
): ExactRoomModel => ({
  ...model,
  regularWalls: [...model.regularWalls, wall],
});

export const buildClosingWallGeometry = (
  model: ExactRoomModel,
  regularWalls: ExactWallLineGeometry[],
): ExactWallLineGeometry | null => {
  if (model.closingWallId == null || regularWalls.length === 0) {
    return null;
  }

  const lastRegularWall = regularWalls[regularWalls.length - 1];
  const point0 = clonePoint(lastRegularWall.point1);
  const point1 = clonePoint(model.startPoint);

  return {
    wallId: model.closingWallId,
    roomId: model.roomId,
    isClosing: true,
    point0,
    point1,
    width: getSegmentLength(point0, point1),
    angleDegrees: normalizeAngle180(getWallDirectionDeg(point0, point1)),
  };
};

export const computeClosingWallCornerAngleDeg = (model: ExactRoomModel): number | null => {
  const geometry = rebuildExactRoomGeometry(model);
  if (!geometry.closingWall || geometry.regularWalls.length === 0) return null;
  const lastR = geometry.regularWalls[geometry.regularWalls.length - 1];
  const dx3 = lastR.point1.x - lastR.point0.x;
  const dy3 = lastR.point1.y - lastR.point0.y;
  const dx4 = geometry.closingWall.point1.x - geometry.closingWall.point0.x;
  const dy4 = geometry.closingWall.point1.y - geometry.closingWall.point0.y;
  const cross = dy3 * dx4 - dx3 * dy4;
  const dot = -(dx3 * dx4 + dy3 * dy4);
  const angle = Math.atan2(cross, dot) * 180 / Math.PI;
  return ((angle % 360) + 360) % 360;
};

export const validateExactRoomModel = (model: ExactRoomModel): boolean => {
  for (const wall of model.regularWalls) {
    if (wall.displayAngleDeg != null) {
      if (wall.displayAngleDeg < WALL_ANGLE_MIN_DEG || wall.displayAngleDeg > WALL_ANGLE_MAX_DEG) {
        return false;
      }
    }
  }
  const closingAngle = computeClosingWallCornerAngleDeg(model);
  if (closingAngle != null) {
    if (closingAngle < WALL_ANGLE_MIN_DEG || closingAngle > WALL_ANGLE_MAX_DEG) {
      return false;
    }
  }
  return true;
};

export const createWallPolygonPoints = (
  point0: Vector2,
  point1: Vector2,
  height: number,
  heightDirection: -1 | 1,
): [Vector2, Vector2, Vector2, Vector2] => {
  const direction = getNormalizedDirection(point0, point1);

  if (!direction) {
    return [clonePoint(point0), clonePoint(point1), clonePoint(point1), clonePoint(point0)];
  }

  const normal = {
    x: -direction.y * height * heightDirection,
    y: direction.x * height * heightDirection,
  };

  return [
    clonePoint(point0),
    clonePoint(point1),
    { x: point1.x + normal.x, y: point1.y + normal.y },
    { x: point0.x + normal.x, y: point0.y + normal.y },
  ];
};
