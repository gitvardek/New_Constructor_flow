// @ts-nocheck

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { CSG } from 'three-csg-ts';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MillingsUtils } from './MillingsUtils/MillingsUtils';
import { MILLINGS, additionalMillingKeys } from '@/Application/F-millings';

/**
 * Класс для создания фрезеровок на фасадах.
 * Наследуется от MillingsUtils и использует Three.js для булевых операций.
 */
export class MillingBuilder extends MillingsUtils {
  // Загрузчик SVG для парсинга путей
  private svgLoader = new SVGLoader();
  // Хранилище данных о фрезеровках
  private millingsStore = MILLINGS;
  // Дополнительные ключи для фрезеровок
  private additionalMillingKeys = additionalMillingKeys;
  // Корень приложения
  root: any = null; // Assuming THREETypes.TApplication

  /**
   * Конструктор класса.
   * @param root - Корневой объект приложения.
   */
  constructor(root: any) {
    super(root);
    this.root = root;
  }

  /**
   * Основной метод для создания фрезерованной фасады.
   * Выполняет булевы операции вычитания фигур из базовой геометрии.
   * @param object - Объект меша фасада.
   * @param fasadePosition - Параметры фасада (ширина, высота, глубина).
   * @param millingParams - Параметры фрезеровки (ID).
   * @param defaultGeometry - Базовая геометрия фасада (Mesh).
   * @param patina - ID патины (опционально).
   */
  createMillingFasade(object: THREE.Mesh, fasadePosition: any, millingParams: number, defaultGeometry: THREE.Mesh, patina?: any) {
    // Определяем ключ фрезеровки
    // const millingKey = this.additionalMillingKeys[millingParams] ?? millingParams;
    // // Получаем данные фрезеровки
    // const millingData = this.millingsStore[millingKey] ?? this.millingsStore[2462671];


    // Клонируем базовую геометрию
    let startGeometry = defaultGeometry.clone();
    // Создаём BSP-структуру для базовой геометрии
    let csgStartGeometry = CSG.fromGeometry(startGeometry.geometry);
    // BVH-щётка для базовой геометрии
    let brush1 = new Brush(startGeometry.geometry);
    // Оценщик для BVH-операций
    let evaluator = new Evaluator();
    // Результат булевой операции
    let result: THREE.Mesh | null = null;

    let newGeometry = null

    // Размеры фасада
    const { FASADE_DEPTH, FASADE_HEIGHT, FASADE_WIDTH } = fasadePosition;
    // Клон позиции фасада
    const clonedFasadePosition = { ...fasadePosition };

    // Основная обработка фигур
    const shapesArray = (millingParams as any[]).flatMap(figure => this.extractShape(clonedFasadePosition, figure)).filter(Boolean);

    // Обрабатываем каждую фигуру
    shapesArray.forEach(figureParams => {
      let mesh: THREE.Mesh;

      // Создаём булевый меш в зависимости от типа
      let boolMesh: THREE.Mesh;
      switch ((figureParams as any).type) {
        case 'svg':
          boolMesh = this.svgShapeCreate(figureParams as any, fasadePosition, startGeometry);
          break;
        case 'capsule':
          boolMesh = this.capsuleCreate(figureParams as any, fasadePosition);
          break;
        default:
          return; // Неизвестный тип - пропускаем
      }

      // Применяем паттерн, если он объект
      if (typeof (figureParams as any).pattern === 'object') {
        mesh = this.patternBuilder.createPatternMesh({
          boolMesh,
          figureParams: figureParams as any,
          fasadePosition,
          type: (figureParams as any).type
        });
        // object.add(mesh)
      } else {
        boolMesh.updateMatrixWorld(true);
        mesh = boolMesh;
      }

      // Выполняем булевую операцию
      const lib = (figureParams as any).lib;
      if (lib === 'bvh') {
        const brush = new Brush(mesh.geometry, mesh.material);
        brush.position.copy(mesh.position);
        brush.updateMatrixWorld();
        result = evaluator.evaluate(brush1, brush, SUBTRACTION);
        brush1 = new Brush(result.geometry);
      } else {
        csgStartGeometry = csgStartGeometry.subtract(CSG.fromMesh(mesh));
      }
    });

    // Преобразуем обратно в геометрию
    newGeometry = result ? result.geometry : CSG.toGeometry(csgStartGeometry, new THREE.Matrix4());
    // Создаём UV-развёртку
    this.planarUV(newGeometry);

    // Освобождаем старую геометрию
    object.geometry.dispose();
    object.geometry = null;

    // Применяем патину, если указана
    if (patina != null) {
      const startMaterial = object.userData.millingMaterial;
      const { geometry, material } = this.patinaBuilder.createPatinaColor({
        geometry: newGeometry,
        patinaId: patina,
        startMaterial
      });
      object.geometry = geometry;
      object.material = material;
    } else {
      object.geometry = newGeometry;
    }

    // Очистка памяти
    newGeometry.dispose();
    newGeometry = null;
    if (result) {
      result.geometry.dispose();
    }
    startGeometry.geometry.dispose();
    startGeometry = null;
  }

  /**
   * Создаёт SVG-фигуру для фрезеровки.
   * @param figureParams - Параметры фигуры.
   * @param fasadePosition - Параметры фасада.
   * @param startGeometry - Базовая геометрия.
   * @returns Mesh с SVG-экструзией.
   */
  private svgShapeCreate(figureParams: any, fasadePosition: any, startGeometry: THREE.Mesh) {
    const { FASADE_DEPTH, FASADE_HEIGHT, FASADE_WIDTH } = fasadePosition;
    const { shape, extrudeSettings = { steps: 1, depth: 2, bevelEnabled: false } } = figureParams;

    // Создаём геометрии из путей
    const geometries = shape.map((path: any) => {
      const shapes = path.toShapes();
      if (path.userData.holes) shapes[0].holes = path.userData.holes;
      return new THREE.ExtrudeGeometry(shapes, extrudeSettings);
    });

    // Объединяем геометрии
    const mergedGeometry = mergeGeometries(geometries);
    mergedGeometry.computeBoundingBox();

    // Материал для визуализации
    const material = new THREE.MeshStandardMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
    material.color.convertSRGBToLinear();
    const shapeMesh = new THREE.Mesh(mergedGeometry, material);

    // Вычисляем размер
    let size = new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(shapeMesh);
    box.getSize(size);

    // Применяем boolParams, если есть
    if (figureParams.boolParams) {
      const { depth, position, rotate, type } = figureParams.boolParams;
      if (type === 'rotate') shapeMesh.rotation.set(rotate.x || 0, rotate.y || 0, rotate.z || 0);

      shapeMesh.position.set(
        position.right ? -FASADE_WIDTH * 0.5 + (size.x * 0.5 + (depth.offset || 0)) :
          position.left ? FASADE_WIDTH * 0.5 - (size.x * 0.5 + (depth.offset || 0)) :
            position.centerHorizontal ? -size.z * 0.5 : 0,

        position.bottom ? -FASADE_HEIGHT * 0.5 + (size.x * 0.5 + (depth.offset || 0)) :
          position.top ? FASADE_HEIGHT * 0.5 - (size.x * 0.5 + (depth.offset || 0)) :
            position.centerVertical ? -size.z * 0.5 : 0,

        position.front ? FASADE_DEPTH * 0.5 + position.front :
          -FASADE_DEPTH * 0.5 + size.z
      );

      if (type !== 'rotate') {
        shapeMesh.rotation.set(
          rotate.x || shapeMesh.rotation.x,
          rotate.y || shapeMesh.rotation.y,
          rotate.z || shapeMesh.rotation.z
        );
      }
    } else {
      // Дефолтная ротация и позиция
      shapeMesh.rotation.y = -Math.PI;
      shapeMesh.position.z = -FASADE_DEPTH * 0.5 + size.z;
    }

    // Верхняя позиция
    if (figureParams.topPosition) shapeMesh.position.y = FASADE_HEIGHT * 0.5 + figureParams.topPosition;

    shapeMesh.userData.fasadePosition = fasadePosition;
    shapeMesh.userData.startSize = size;

    // // Дополнительная ротация
    if (figureParams.rotation) {
      const { x, y, z } = figureParams.rotation;
      if (x) shapeMesh.rotation.x = x;
      if (y) shapeMesh.rotation.y = y;
      if (z) shapeMesh.rotation.z = z;
    }

    // Дополнительная позиция
    if (figureParams.position) {

      const posSize = new THREE.Vector3();
      const box = new THREE.Box3().setFromObject(shapeMesh);
      box.getSize(posSize);

      const { x, y, z, inpostOffsetY = 0, inpostOffsetX = 0, inpostOffsetZ = 0, inpostOffset = 0 } = figureParams.position;

      if (y === 'inpostTop') shapeMesh.position.y = FASADE_HEIGHT * 0.5 - posSize.y * 0.5 - inpostOffset - inpostOffsetY;
      else if (y === 'inpostBottom') shapeMesh.position.y = -FASADE_HEIGHT * 0.5 + posSize.y * 0.5 + inpostOffset + inpostOffsetY;
      else if (y) shapeMesh.position.y += y;

      if (x === "inpostLeft") shapeMesh.position.x = -FASADE_WIDTH * 0.5 + posSize.x * 0.5 - inpostOffset - inpostOffsetX;
      else if (x === 'inpostRight') shapeMesh.position.x = FASADE_WIDTH * 0.5 - posSize.x * 0.5 + inpostOffset + inpostOffsetX;
      else if (x) shapeMesh.position.x += x;

      if (z === "inpostFront") shapeMesh.position.z = FASADE_DEPTH * 0.5 - posSize.z * 0.5 - inpostOffset - inpostOffsetZ
      else if (z === 'inpostBack') shapeMesh.position.z = -FASADE_DEPTH * 0.5 + posSize.z * 0.5 + inpostOffset + inpostOffsetZ
      else if (z) shapeMesh.position.z += z;
    }
    // Корректировка Z
    shapeMesh.position.z += FASADE_DEPTH + 4;
    return shapeMesh;
  }

  /**
   * Создаёт капсульную фигуру для фрезеровки.
   * @param figureParams - Параметры капсулы.
   * @param fasadePosition - Параметры фасада.
   * @returns Mesh капсулы.
   */
  private capsuleCreate(figureParams: any, fasadePosition: any) {
    const { FASADE_DEPTH, FASADE_HEIGHT, FASADE_WIDTH } = fasadePosition;

    // Вычисляем ширину капсулы
    let capsuleWidth: number;
    switch (figureParams.length) {
      case 'FASADE_HEIGHT':
        capsuleWidth = FASADE_HEIGHT - figureParams.padding * 2 - figureParams.radius;
        break;
      case 'FASADE_WIDTH':
        capsuleWidth = FASADE_WIDTH - figureParams.padding * 2 - figureParams.radius;
        break;
      default:
        capsuleWidth = parseInt(figureParams.length);
    }
    if (figureParams.percent) capsuleWidth *= figureParams.percent;

    // Создаём геометрию и меш
    const geometry = new THREE.CapsuleGeometry(
      figureParams.radius,
      capsuleWidth,
      figureParams.capSegments,
      figureParams.radialSegments
    );
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.1 });
    const capsule = new THREE.Mesh(geometry, material);

    // Размер капсулы
    const box = new THREE.Box3().setFromObject(capsule);
    const size = box.getSize(new THREE.Vector3());

    // Инициализируем позицию
    let position = { x: 0, y: 0, z: 0 };
    if (figureParams.position) {
      const { x, y, z } = figureParams.position;
      if (x === 'center') {
        position.x = 0;
        capsule.rotation.y = Math.PI;
      } else if (x === 'right') {
        position.x = -FASADE_WIDTH + (FASADE_WIDTH * 0.5 + figureParams.radius * 2);
      } else if (x === 'left') {
        position.x = FASADE_WIDTH - (FASADE_WIDTH * 0.5 + figureParams.radius * 2);
      } else {
        position.x = x;
      }

      if (y === 'center') position.y = FASADE_HEIGHT * 0.5;
      else if (y === 'bottom') position.y = -FASADE_HEIGHT * 0.5;
      else if (y === 'top') position.y = FASADE_HEIGHT;
      else position.y = y;

      if (z === 'center') position.z = -FASADE_DEPTH;
      else position.z = z;
    }

    // Ротация
    if (figureParams.rotation?.x) capsule.rotation.x = figureParams.rotation.x;
    if (figureParams.rotation?.y) capsule.rotation.y = figureParams.rotation.y;
    if (figureParams.rotation?.z) capsule.rotation.z = figureParams.rotation.z;

    // Устанавливаем позицию
    capsule.position.set(position.x, position.y, position.z);

    // Офсеты
    if (figureParams.offsetX) capsule.position.x += figureParams.offsetX;
    if (figureParams.offsetY) capsule.position.y += figureParams.offsetY;
    capsule.position.z += FASADE_DEPTH + 4;

    capsule.userData.fasadePosition = fasadePosition;
    capsule.userData.startSize = size;
    return capsule;
  }

  /**
   * Извлекает фигуры для фрезеровки на основе условий.
   * @param fasadePosition - Параметры фасада.
   * @param data - Данные фигуры.
   * @returns Массив параметров фигур или null.
   */
  private extractShape(fasadePosition: any, data: any) {
    const { FASADE_HEIGHT, FASADE_WIDTH } = fasadePosition;
    let height = FASADE_HEIGHT;
    let width = FASADE_WIDTH;

    switch (data.type) {
      case 'capsule':
        // Проверяем условие для капсулы
        const capsuleParams = this.matchesCondition(fasadePosition, data.capsuleParams.condition) ? data.capsuleParams : null;
        if (!capsuleParams) return null;
        return { ...capsuleParams, type: data.type };

      case 'svg':
        return data.figureParams
          .map((item: any) => {
            // Проверяем условие
            const figureParams = this.matchesCondition(fasadePosition, item.condition);
            if (!figureParams) return null;

            const { figure, hole, inpost } = item;
            const { boolParams, pattern, position, rotation } = figure;
            let { inpostOffset = 0 } = position || {};

            // Корректируем высоту для inpost
            if (inpost) {
              height = inpost === 'top' ? FASADE_HEIGHT * 0.6 - inpostOffset * 0.5 : FASADE_HEIGHT * 0.4 - inpostOffset * 0.5;
            }

            // Парсим SVG для формы
            const shape = this.parseSVG({
              svgStr: figure.svg,
              width: width * 0.5 + (figure.widthOffset || 0),
              height: height * 0.5 + (figure.heightOffset || 0),
              radius: figure.radius
            });

            // Добавляем отверстия
            if (hole.svg.length > 0) {
              const holes = this.parseSVG({
                svgStr: hole.svg,
                width: width * 0.5 + (hole.widthOffset || 0),
                height: height * 0.5 + (hole.heightOffset || 0),
                radius: figure.radius,
                isHole: true
              });
              holes.forEach((holeShape: any, key: number) => {
                shape[key].userData.holes = [...holeShape.toShapes()];
              });
            }

            // Корректируем глубину экструзии
            if (boolParams) {
              const { depth } = boolParams;
              if (boolParams.type === 'rotate' && pattern) {
                data.extrudeSettings.depth = ((width * 0.5) / Math.sin(pattern.rotation.y)) * 2;
              } else {
                const extrudeSize = depth.size === 'FASADE_HEIGHT' ? height : depth.size === 'FASADE_WIDTH' ? width : 0;
                data.extrudeSettings.depth = extrudeSize + depth.offset * 2 || depth.size + depth.offset * 2 || 0;
              }
            }

            if (pattern) data.extrudeSettings.depth *= pattern.multiply;

            return {
              type: data.type,
              lib: data.lib,
              shape,
              extrudeSettings: data.extrudeSettings,
              topPosition: figure.topPosition,
              inpost,
              boolParams,
              pattern,
              position,
              rotation
            };
          })
          .filter(Boolean);
    }
    return null;
  }

  /**
   * Проверяет соответствие размеров фасада условиям.
   * @param fasade - Параметры фасада.
   * @param condition - Условия (min/max ширина/высота).
   * @returns true, если соответствует.
   */
  private matchesCondition({ FASADE_WIDTH, FASADE_HEIGHT }: any, { width, height }: any) {
    return width.min <= FASADE_WIDTH && FASADE_WIDTH <= width.max &&
      height.min <= FASADE_HEIGHT && FASADE_HEIGHT <= height.max;
  }

  /**
   * Парсит SVG-строку, заменяя плейсхолдеры и вычисляя выражения.
   * @param params - Параметры парсинга (svgStr, width, height и т.д.).
   * @returns Массив путей THREE.Shape.
   */
  private parseSVG({ svgStr, width, height, radius, isHole = false }: { svgStr: string; width: number; height: number; radius?: number; isHole?: boolean }) {
    // Заменяем плейсхолдеры
    svgStr = svgStr.replaceAll('wth', width.toString()).replaceAll('hgh', height.toString());
    if (radius) svgStr = svgStr.replaceAll('radius', radius.toString());

    // Обрабатываем выражения в скобках
    while (/\(([^()]+)\)/g.test(svgStr)) {
      svgStr = svgStr.replace(/\(([^()]+)\)/g, (_, expr) => {
        const computedValue = Math.floor(Math.abs(this.calculateFromString(expr)));
        return computedValue.toString();
      });
    }

    // Обрабатываем суммы через запятые
    svgStr = svgStr
      .split(/, | /)
      .map(item => item.includes(',') ? item.split(',').reduce((sum, val) => sum + parseFloat(val), 0) : item)
      .join(' ');

    // Парсим через SVGLoader
    return this.svgLoader.parse(svgStr).paths;
  }

  /**
   * Обрабатывает меш в булевой операции (BVH или CSG).
   * @param mesh - Входной меш.
   * @param brush_1 - Текущая BVH-щётка.
   * @param evaluator - Оценщик BVH.
   * @param csgStartGeometry - Текущая CSG-геометрия.
   * @param lib - Тип библиотеки ('bvh' или default CSG).
   * @returns Обновлённые brush_1, csgStartGeometry и result.
   */
  private processMesh(mesh: THREE.Mesh, brush_1: Brush, evaluator: Evaluator, csgStartGeometry: any, lib: string) {
    switch (lib) {
      case 'bvh': {
        const brush = new Brush(mesh.geometry, mesh.material);
        brush.position.copy(mesh.position);
        brush.updateMatrixWorld();
        const result = evaluator.evaluate(brush_1, brush, SUBTRACTION);
        brush_1 = new Brush(result.geometry);
        return { brush_1, csgStartGeometry, result };
      }
      default:
        csgStartGeometry = csgStartGeometry.subtract(CSG.fromMesh(mesh));
        return { brush_1, csgStartGeometry };
    }
  }
}
