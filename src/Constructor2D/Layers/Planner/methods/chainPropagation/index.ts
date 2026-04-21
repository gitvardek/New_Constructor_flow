import { ObjectWall } from '../../interfaces';
import { Vector2 } from '@/types/constructor2d/interfaсes';
import {
  getDistanceBetweenVectors,
  getAngleBetweenVectors,
} from '../../../../utils/Math';

const isSameId = (a: any, b: any) =>
  a != null && b != null && String(a) === String(b);

/**
 * Возвращает стены комнаты в порядке контура, начиная с замыкающей.
 * Обход идёт по mergeWalls.wallPoint0 (конец → начало следующей).
 */
export function getOrderedChain(this: any, roomId: string | number): ObjectWall[] {
  const roomWalls: ObjectWall[] = this.objectWalls.filter(
    (w: ObjectWall) => isSameId(w.roomId, roomId) && w.name !== 'dividing_wall',
  );
  if (roomWalls.length === 0) return [];

  const closingWall = roomWalls.find((w: ObjectWall) => w.isClosing);
  if (!closingWall) return roomWalls;

  const wallMap = new Map<string | number, ObjectWall>();
  roomWalls.forEach((w: ObjectWall) => wallMap.set(w.id, w));

  const chain: ObjectWall[] = [];
  const visited = new Set<string | number>();
  let current: ObjectWall | undefined = closingWall;

  while (current && !visited.has(current.id)) {
    chain.push(current);
    visited.add(current.id);
    const nextId: string | number | null = current.mergeWalls.wallPoint0;
    current = nextId != null ? wallMap.get(nextId) : undefined;
  }

  return chain;
}

/**
 * Возвращает подцепочку от wallId (включительно) до замыкающей (включительно).
 * Останавливается на первой isPinned стене вместо замыкающей, если она встречается раньше.
 */
export function getChainFromWallToClosing(this: any, wallId: string | number): ObjectWall[] {
  const startWall: ObjectWall | undefined = this.objectWalls.find(
    (w: ObjectWall) => isSameId(w.id, wallId),
  );
  if (!startWall || startWall.roomId == null) return [];

  const roomWalls: ObjectWall[] = this.objectWalls.filter(
    (w: ObjectWall) => isSameId(w.roomId, startWall.roomId) && w.name !== 'dividing_wall',
  );
  const wallMap = new Map<string | number, ObjectWall>();
  roomWalls.forEach((w: ObjectWall) => wallMap.set(w.id, w));

  const chain: ObjectWall[] = [];
  const visited = new Set<string | number>();
  let current: ObjectWall | undefined = startWall;

  while (current && !visited.has(current.id)) {
    chain.push(current);
    visited.add(current.id);

    if (current.isClosing) break;
    // Стена запиннена и это не стартовая — цепочка заканчивается здесь
    if (current !== startWall && (current as any).isPinned) break;

    const nextId: string | number | null = current.mergeWalls.wallPoint0;
    current = nextId != null ? wallMap.get(nextId) : undefined;
  }

  return chain;
}

/**
 * Пересчитывает позицию замыкающей стены по текущим координатам соседних стен.
 * point0 замыкающей = point1 предыдущей стены.
 * point1 замыкающей = point0 следующей стены.
 */
export function recalculateClosingWall(this: any, roomId: string | number): void {
  const roomWalls: ObjectWall[] = this.objectWalls.filter(
    (w: ObjectWall) => isSameId(w.roomId, roomId) && w.name !== 'dividing_wall',
  );

  const closingWall = roomWalls.find((w: ObjectWall) => w.isClosing);
  if (!closingWall) return;

  // Стена до замыкающей — та, чей конец (wallPoint0) указывает на closing
  const prevWall = roomWalls.find(
    (w: ObjectWall) => !w.isClosing && isSameId(w.mergeWalls.wallPoint0, closingWall.id),
  );
  // Стена после замыкающей — та, чьё начало (wallPoint1) указывает на closing
  const nextWall = roomWalls.find(
    (w: ObjectWall) => !w.isClosing && isSameId(w.mergeWalls.wallPoint1, closingWall.id),
  );

  if (!prevWall || !nextWall) return;

  const newP0: Vector2 = { ...prevWall.points[1] };
  const newP1: Vector2 = { ...nextWall.points[0] };

  const newPoints = this.calculatePositionPointsWall(
    newP0,
    newP1,
    closingWall.height,
    closingWall.heightDirection,
  );

  closingWall.points = newPoints;
  closingWall.width = getDistanceBetweenVectors(newP0, newP1);
  closingWall.angleDegrees = getAngleBetweenVectors(
    newP0,
    { x: newP0.x + 300, y: newP0.y },
    newP1,
  );
}

/**
 * Сдвигает массив стен как жёсткое тело на (dx, dy).
 * Ширина и угол не меняются при чистой трансляции.
 */
export function applyRigidChainShift(walls: ObjectWall[], dx: number, dy: number): void {
  for (const wall of walls) {
    for (const p of wall.points) {
      p.x += dx;
      p.y += dy;
    }
  }
}

/**
 * Поворачивает массив стен как жёсткое тело вокруг точки pivot на angleDeltaDeg градусов.
 * После поворота пересчитывает angleDegrees и width каждой стены.
 */
export function applyRigidChainRotation(
  walls: ObjectWall[],
  pivot: Vector2,
  angleDeltaDeg: number,
): void {
  const theta = (angleDeltaDeg * Math.PI) / 180;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  for (const wall of walls) {
    for (const p of wall.points) {
      const dx = p.x - pivot.x;
      const dy = p.y - pivot.y;
      p.x = pivot.x + dx * cosT - dy * sinT;
      p.y = pivot.y + dx * sinT + dy * cosT;
    }
    if (wall.points.length >= 2) {
      wall.width = getDistanceBetweenVectors(wall.points[0], wall.points[1]);
      wall.angleDegrees = getAngleBetweenVectors(
        wall.points[0],
        { x: wall.points[0].x + 300, y: wall.points[0].y },
        wall.points[1],
      );
    }
  }
}
