
import * as THREE from 'three';
import * as THREETypes from "@/types/types";
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomManager } from '../Room/RoomManager';
import { useMenuStore } from '@/store/appStore/useMenuStore';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RulerConfig {
  POINT_COUNT: number;
  MIN_DISTANCE: number;
  MAX_DISTANCE: number;
  LABEL_HEIGHT_OFFSET: number;
  DIRECTIONS: THREE.Vector3[];
  WALL_ARROW_WIDTH: number;
  WALL_ARROW_HEIGHT: number;
  OBJECT_ARROW_WIDTH: number;
  OBJECT_ARROW_HEIGHT: number;
}

interface LabelParams {
  value: number;
  position: THREE.Vector3;
  cssClass: string;
}

interface RulerMeasurement {
  direction: THREE.Vector3;
  originPoint: THREE.Vector3;
  intersectionPoint: THREE.Vector3;
  distance: number;
}

type ArrowMaterialSet = {
  line: THREE.LineBasicMaterial | THREE.LineDashedMaterial;
  cone: THREE.MeshBasicMaterial;
};

export interface ObjectSizeArrows {
  arrowPos: THREE.ArrowHelper;
  arrowNeg: THREE.ArrowHelper;
  labelDiv: CSS2DObject;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** При ≤ N задач — синхронный расчёт в текущем кадре, линейки появляются без задержки.
 *  При > N — async-чанки через rAF, чтобы не блокировать поток. */
const SYNC_TASK_THRESHOLD = 480; // ~4 объекта × 6 направлений (24)

/** Бюджет времени одного async-чанка (мс). */
const CHUNK_BUDGET_MS = 6;

const COLOR_DEFAULT = '#444444';
const COLOR_WALL = '#77cadb';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLineMaterial(color: string): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    depthTest: false, depthWrite: false, transparent: true, opacity: 1,
  });
}

function makeConeMaterial(color: string): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    depthTest: false, depthWrite: false, transparent: true, opacity: 1,
  });
}

// ─── Class ────────────────────────────────────────────────────────────────────

export class Ruler {
  private menuStore = useMenuStore();
  private render: THREETypes.TRenderer;

  // Ruler сам владеет своими массивами — внешние ссылки не нужны
  private rulerLines: THREE.Object3D[] = [];
  private rullerSizeLines: THREE.Object3D[] = [];

  private room: RoomManager | null = null;
  private scene: THREE.Scene | null = null;

  private readonly raycasterWall = new THREE.Raycaster();
  private readonly raycasterProd = new THREE.Raycaster();

  private readonly reuseVecA = new THREE.Vector3();
  private readonly reuseVecB = new THREE.Vector3();
  private readonly reuseOrigin = new THREE.Vector3();
  private readonly reuseOffset = new THREE.Vector3();
  private readonly reuseIntersection = new THREE.Vector3();

  private readonly materials = {
    wallLine: makeLineMaterial(COLOR_WALL),
    wallCone: makeConeMaterial(COLOR_WALL),
    defaultLine: makeLineMaterial(COLOR_DEFAULT),
    defaultCone: makeConeMaterial(COLOR_DEFAULT),
    dashedLine: new THREE.LineDashedMaterial({
      color: new THREE.Color(COLOR_DEFAULT),
      dashSize: 10, gapSize: 5, linewidth: 2, scale: 250,
      depthTest: false, depthWrite: false, transparent: true, opacity: 1,
    }),
    verticalLine: makeLineMaterial(COLOR_DEFAULT),
  } as const;

  private calcToken = 0;

  private readonly config: RulerConfig = {
    POINT_COUNT: 3,
    MIN_DISTANCE: 0.01,
    MAX_DISTANCE: 1500,
    LABEL_HEIGHT_OFFSET: 100,
    WALL_ARROW_WIDTH: 75,
    WALL_ARROW_HEIGHT: 38,
    OBJECT_ARROW_WIDTH: 25,
    OBJECT_ARROW_HEIGHT: 50,
    DIRECTIONS: [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, -1),
    ],
  };

  private readonly computeFaceCenterByDirectionIndex: Array<
    (box: THREE.Box3, target: THREE.Vector3) => void
  > = [
      (box, t) => t.set(box.max.x, box.max.y, (box.min.z + box.max.z) / 2),
      (box, t) => t.set((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2),
      (box, t) => t.set((box.min.x + box.max.x) / 2, box.max.y, box.max.z),
      (box, t) => t.set(box.min.x, box.max.y, (box.min.z + box.max.z) / 2),
      (box, t) => t.set((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2),
      (box, t) => t.set((box.min.x + box.max.x) / 2, box.max.y, box.min.z - 20),
    ];

  constructor(root: THREETypes.TApplication) {
    this.render = root._renderClass!;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  public setParams({ scene, room, rulerLines, rullerSizeLines }: {
    scene?: THREE.Scene;
    room?: RoomManager;
    rulerLines?: THREE.Object3D[];
    rullerSizeLines?: THREE.Object3D[];
  }): void {
    this.scene = scene ?? null;
    this.room = room ?? null;
    void rulerLines;
    void rullerSizeLines;
  }

  public toggleRulerVisibility(visible: boolean): void {
    const apply = (obj: THREE.Object3D) => {
      obj.visible = visible;
      obj.traverse(child => { child.visible = visible; });
    };
    this.rulerLines.forEach(apply);
    this.rullerSizeLines.forEach(apply);
  }

  /** Рисует линейки от объекта до стен. Всегда синхронно — 6 raycasts по статичной геометрии. */
  public drawRulerWalls(objectBox: THREE.Box3): void {
    const { scene } = this;
    if (!scene || !this.room) return;

    const wallObjects = [...this.room._roomWalls, this.room._roomFloor].filter(
      (obj): obj is THREE.Object3D => obj instanceof THREE.Object3D
    );
    const faceCenter = this.reuseVecA;
    const labelPos = this.reuseVecB;
    const heightOffset = this.config.LABEL_HEIGHT_OFFSET;

    this.config.DIRECTIONS.forEach((direction, index) => {
      this.computeFaceCenterByDirectionIndex[index](objectBox, faceCenter);
      this.raycasterWall.set(faceCenter, direction);

      const intersects = this.raycasterWall.intersectObjects(wallObjects, true);
      if (intersects.length === 0 || intersects[0].distance <= this.config.MIN_DISTANCE) return;

      const { point, distance } = intersects[0];
      labelPos.lerpVectors(point, faceCenter, 0.5);
      labelPos.y += heightOffset;

      this.addArrowToScene(direction, faceCenter.clone(), distance, {
        line: this.materials.wallLine,
        cone: this.materials.wallCone,
      });
      const label = this.createLabel({ value: distance, position: labelPos.clone(), cssClass: 'distance-label--wall' });
      scene.add(label);
      this.rulerLines.push(label);
    });
  }

  /**
   * Главный метод — вызывается при drag-е и выборе объекта.
   *
   * Стены считаются синхронно и добавляются в сцену немедленно.
   * До соседних объектов: если задач мало — тоже синхронно (нет мигания),
   * если много — async-чанки с батч-коммитом в конце.
   *
   * clearRuler вызывается ДО расчёта, поэтому стены и объекты появляются
   * в одном кадре без разрыва между удалением старых и добавлением новых.
   */
  public drawRulerToObjects(object: THREE.Object3D | null): void {
    if (!this.isReadyToRender()) {
      console.warn('Ruler: отсутствуют необходимые зависимости (комната или сцена)');
      return;
    }

    this.clearRuler();
    if (!this.menuStore.getRulerVisibility) return;

    const objectBox = object!.userData.aabb as THREE.Box3;

    // Стены — синхронно, появляются в том же кадре
    this.drawRulerWalls(objectBox);

    // До объектов — sync или async в зависимости от числа задач
    this.runRulerCalculation(objectBox);
  }

  /** Рисует пунктирные линейки размеров самого объекта (ширина, высота). */
  public drawRullerObjects(object: THREE.Object3D, group?: THREE.Object3D): ObjectSizeArrows[] {
    const result: ObjectSizeArrows[] = [];
    if (!this.scene) return result;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(this.reuseVecA);

    const configSize = group?.userData?.prodSize;
    const labelWidth = configSize?.width ?? size.x;
    const labelHeight = configSize?.height ?? size.y;

    const { OBJECT_ARROW_WIDTH: arrowWidth, OBJECT_ARROW_HEIGHT: arrowHeight } = this.config;
    const VISIBLE_RATIO = 0.85;

    const axes = [
      {
        direction: new THREE.Vector3(1, 0, 0),
        start: new THREE.Vector3(
          (box.min.x + box.max.x) * 0.5 - (size.x * VISIBLE_RATIO) * 0.5,
          box.max.y - arrowWidth * 0.5,
          box.min.z + arrowWidth * 0.5,
        ),
        length: size.x * VISIBLE_RATIO,
        labelValue: labelWidth,
      },
      {
        direction: new THREE.Vector3(0, 1, 0),
        start: new THREE.Vector3(
          box.min.x + arrowWidth * 0.5,
          (box.min.y + box.max.y) * 0.5 - (size.y * VISIBLE_RATIO) * 0.5,
          box.min.z + arrowWidth * 0.5,
        ),
        length: size.y * VISIBLE_RATIO,
        labelValue: labelHeight,
      },
    ];

    const labelPos = new THREE.Vector3();

    for (const { direction, start, length, labelValue } of axes) {
      if (length < 1) continue;

      const sizeMatSet: ArrowMaterialSet = {
        line: this.materials.dashedLine,
        cone: this.materials.defaultCone,
      };

      const arrowPos = new THREE.ArrowHelper(direction, start, length, COLOR_DEFAULT, arrowHeight, arrowWidth);
      const arrowNeg = new THREE.ArrowHelper(direction.clone().negate(), start, 0, COLOR_DEFAULT, arrowHeight, arrowWidth);

      this.applySharedMaterials(arrowPos, sizeMatSet);
      this.applySharedMaterials(arrowNeg, sizeMatSet);
      arrowPos.line.computeLineDistances();
      arrowPos.name = 'SIZE_VISUAL';
      arrowNeg.name = 'SIZE_VISUAL';

      const isHorizontal = direction.x !== 0 || direction.z !== 0;
      labelPos.addVectors(start, direction.clone().multiplyScalar(length / 2));
      labelPos.x += isHorizontal ? 0 : -100;
      labelPos.y += isHorizontal ? 60 : 0;

      const labelDiv = this.createLabel({ value: labelValue, position: labelPos.clone(), cssClass: 'dimension-label' });

      this.scene.add(arrowPos, arrowNeg, labelDiv);
      this.rullerSizeLines.push(arrowPos, arrowNeg, labelDiv);
      result.push({ arrowPos, arrowNeg, labelDiv });
    }

    return result;
  }

  /** Очищает линейки расстояния. Вызывается при снятии выделения и перед каждым перерасчётом. */
  public clearRuler(): void {
    this.calcToken++;
    this.disposeObjects(this.rulerLines);
    this.rulerLines = [];
  }

  /** Обновляет room — вызывается при пересборке комнаты из TrafficManager. */
  public updateRoom(room: RoomManager): void {
    this.room = room;
  }

  // ─── Private: расчёт ─────────────────────────────────────────────────────────

  private isReadyToRender(): boolean {
    return !!this.room && !!this.scene;
  }

  private runRulerCalculation(objectBox: THREE.Box3): void {
    const xPoints = this.buildSamplePoints(objectBox.min.x, objectBox.max.x);
    const zPoints = this.buildSamplePoints(objectBox.min.z, objectBox.max.z);
    const yMid = (objectBox.min.y + objectBox.max.y) / 2;
    const nearbyBoxes = this.getNearbyBoxes(objectBox).filter(
      box => !objectBox.intersectsBox(box)
    );

    if (nearbyBoxes.length === 0) return;

    const tasks: Array<{ box: THREE.Box3; direction: THREE.Vector3 }> = [];
    for (const box of nearbyBoxes) {
      for (const direction of this.config.DIRECTIONS) {
        tasks.push({ box, direction });
      }
    }

    if (tasks.length <= SYNC_TASK_THRESHOLD) {
      // Синхронный путь — линейки появляются в том же кадре что и clearRuler,
      // поэтому мигания нет вообще
      const measurements: RulerMeasurement[] = [];
      for (const { box, direction } of tasks) {
        this.collectMeasurement(box, direction, objectBox, xPoints, zPoints, yMid, measurements);
      }
      this.commitMeasurements(measurements);
    } else {
      this.runAsyncCalculation(tasks, objectBox, xPoints, zPoints, yMid);
    }
  }

  private runAsyncCalculation(
    tasks: Array<{ box: THREE.Box3; direction: THREE.Vector3 }>,
    objectBox: THREE.Box3,
    xPoints: number[],
    zPoints: number[],
    yMid: number,
  ): void {
    const token = ++this.calcToken;
    const measurements: RulerMeasurement[] = [];
    let taskIndex = 0;

    const processNextChunk = () => {
      if (token !== this.calcToken) return;

      const deadline = performance.now() + CHUNK_BUDGET_MS;
      while (taskIndex < tasks.length && performance.now() < deadline) {
        const { box, direction } = tasks[taskIndex++];
        this.collectMeasurement(box, direction, objectBox, xPoints, zPoints, yMid, measurements);
      }

      if (taskIndex < tasks.length) {
        requestAnimationFrame(processNextChunk);
      } else if (token === this.calcToken) {
        // Все чанки готовы — добавляем в сцену одним батчем
        this.commitMeasurements(measurements);
      }
    };

    requestAnimationFrame(processNextChunk);
  }

  private collectMeasurement(
    targetBox: THREE.Box3,
    direction: THREE.Vector3,
    objectBox: THREE.Box3,
    xPoints: number[],
    zPoints: number[],
    yMid: number,
    measurements: RulerMeasurement[],
  ): void {
    for (const x of xPoints) {
      for (const z of zPoints) {
        this.reuseOrigin.set(x, yMid, z);

        const offsetMagnitude = this.getOffsetToBoxFace(direction, this.reuseOrigin, objectBox);
        this.reuseOffset.copy(direction).multiplyScalar(offsetMagnitude);
        this.reuseOrigin.add(this.reuseOffset);

        this.raycasterProd.set(this.reuseOrigin, direction);
        if (!this.raycasterProd.ray.intersectBox(targetBox, this.reuseIntersection)) continue;

        const distance = this.reuseOrigin.distanceTo(this.reuseIntersection);
        if (distance > this.config.MIN_DISTANCE && distance < this.config.MAX_DISTANCE) {
          measurements.push({
            direction: direction.clone(),
            originPoint: this.reuseOrigin.clone(),
            intersectionPoint: this.reuseIntersection.clone(),
            distance,
          });
          return;
        }
      }
    }
  }

  /** Добавляет все измерения в сцену за один синхронный проход (батч-коммит). */
  private commitMeasurements(measurements: RulerMeasurement[]): void {
    if (!this.scene) return;
    for (const m of measurements) {
      this.renderMeasurement(m);
    }
  }

  // ─── Private: рендер ─────────────────────────────────────────────────────────

  private renderMeasurement({ direction, originPoint, intersectionPoint, distance }: RulerMeasurement): void {
    if (!this.scene) return;

    const labelPos = intersectionPoint.clone();
    labelPos.y += this.config.LABEL_HEIGHT_OFFSET;

    this.addArrowToScene(direction, originPoint, distance, {
      line: this.materials.defaultLine,
      cone: this.materials.defaultCone,
    });
    this.addVerticalLineToScene(intersectionPoint);

    const label = this.createLabel({ value: distance, position: labelPos, cssClass: 'distance-label' });
    this.scene.add(label);
    this.rulerLines.push(label);
  }

  private addArrowToScene(
    direction: THREE.Vector3,
    origin: THREE.Vector3,
    length: number,
    matSet: ArrowMaterialSet,
  ): void {
    if (!this.scene) return;

    const forward = new THREE.ArrowHelper(
      direction.clone().normalize(), origin, length,
      0xffffff, this.config.WALL_ARROW_WIDTH, this.config.WALL_ARROW_HEIGHT,
    );
    const backward = new THREE.ArrowHelper(
      direction.clone().negate().normalize(), origin, 0,
      0xffffff, this.config.WALL_ARROW_WIDTH, this.config.WALL_ARROW_HEIGHT,
    );

    this.applySharedMaterials(forward, matSet);
    this.applySharedMaterials(backward, matSet);

    this.scene.add(forward, backward);
    this.rulerLines.push(forward, backward);
  }

  private addVerticalLineToScene(intersectionPoint: THREE.Vector3): void {
    if (!this.scene) return;

    const points = [
      intersectionPoint.clone(),
      new THREE.Vector3(intersectionPoint.x, 0, intersectionPoint.z),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, this.materials.verticalLine);
    line.renderOrder = 1;
    line.name = 'LINE_VISUAL';

    this.scene.add(line);
    this.rulerLines.push(line);
  }

  private applySharedMaterials(arrow: THREE.ArrowHelper, matSet: ArrowMaterialSet): void {
    arrow.traverse(child => { child.userData.isArrowHelper = true; });
    arrow.line.material = matSet.line;
    arrow.cone.material = matSet.cone;
    arrow.renderOrder = 1;
    arrow.name = 'ARROW_VISUAL';
  }

  private createLabel({ value, position, cssClass }: LabelParams): CSS2DObject {
    const label = this.render.getLabelFromPool(`${value.toFixed(0)}`, position);
    label.element.className = cssClass;
    return label;
  }

  // ─── Private: утилиты ────────────────────────────────────────────────────────

  private buildSamplePoints(min: number, max: number): number[] {
    const count = this.config.POINT_COUNT;
    if (count === 1) return [(min + max) / 2];
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  }

  private getOffsetToBoxFace(direction: THREE.Vector3, origin: THREE.Vector3, objectBox: THREE.Box3): number {
    if (direction.x !== 0) return direction.x > 0 ? objectBox.max.x - origin.x : origin.x - objectBox.min.x;
    if (direction.y !== 0) return direction.y > 0 ? objectBox.max.y - origin.y : origin.y - objectBox.min.y;
    return direction.z > 0 ? objectBox.max.z - origin.z : origin.z - objectBox.min.z;
  }

  private getNearbyBoxes(objectBox: THREE.Box3): THREE.Box3[] {
    if (!this.room?._roomTotalBounds) return [];

    const maxDistSq = this.config.MAX_DISTANCE ** 2;
    const result: THREE.Box3[] = [];

    for (const candidateBox of this.room._roomTotalBounds) {
      const dx = Math.max(candidateBox.min.x - objectBox.max.x, objectBox.min.x - candidateBox.max.x, 0);
      const dy = Math.max(candidateBox.min.y - objectBox.max.y, objectBox.min.y - candidateBox.max.y, 0);
      const dz = Math.max(candidateBox.min.z - objectBox.max.z, objectBox.min.z - candidateBox.max.z, 0);
      if (dx * dx + dy * dy + dz * dz < maxDistSq) result.push(candidateBox);
    }
    return result;
  }

  private disposeObjects(objects: THREE.Object3D[]): void {
    if (!this.scene) return;

    for (const obj of objects) {
      if (obj instanceof CSS2DObject) {
        this.render.recycleLabel(obj);
      } else {
        this.scene.remove(obj);
        obj.traverse(child => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            child.geometry?.dispose();
            // Материалы НЕ dispose-им — они общие (this.materials.*)
          }
        });
      }
    }
  }
}