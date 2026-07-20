import * as PIXI from 'pixi.js';

import {
  Vector2,
  RectData
} from "@/types/constructor2d/interfaсes";

const rect = (graphic: PIXI.Graphics, data: RectData): PIXI.Graphics => {

  /*
  data = {
    points: [Vector2, Vector2, Vector2, Vector2]; // 4 точки для прямоугольника
    color: number | string; // Цвет заливки
    colorEdge: number | string = 0x000000, // Цвет обводки (по умолчанию чёрный)
    widthEdge: number = 1, // Толщина линии обводки (по умолчанию 1)
    angleDegress: number = 0; // 
    rotatePoint: Vector2 | null = null;
  }
  */

  graphic.clear();

  const { points, color, colorEdge, widthEdge } = data;

  if (points.length !== 4) {
    throw new Error("Data must contain exactly 4 points.");
  }

  if(!color && !colorEdge) {
    throw new Error("At least one of color or colorEdge must be provided.");
  }
  
  // Логика рисования прямоугольника через точки
  graphic.moveTo(points[0].x, points[0].y); // Перемещаемся к первой точке
  graphic.lineTo(points[1].x, points[1].y); // Линия ко второй точке
  graphic.lineTo(points[2].x, points[2].y); // Линия к третьей точке
  graphic.lineTo(points[3].x, points[3].y); // Линия к четвертой точке
  graphic.lineTo(points[0].x, points[0].y); // Замыкаем контур
  if(color) graphic.fill(color); // Устанавливаем цвет заливки
  if(colorEdge) {
    graphic.stroke({
      color: colorEdge,
      width: widthEdge ?? 1 // Толщина линии обводки
    });
  }

  // Возвращаем объект graphics
  return graphic;

};

const shape = (graphic: PIXI.Graphics, points: Vector2[], color: number | string): void => {

  /*
  points: [{x: number, y: number}, {x: number, y: number}, ...]; // 4 точки для прямоугольника
  */

  if (points.length < 3) return;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    // Рисуем линию
    if (i == 0) graphic.moveTo(point.x, point.y);
    graphic.lineTo(point.x, point.y);
    if ((points.length - 1) === i) {
      graphic.lineTo(points[0].x, points[0].y);
    }
  }
  graphic.fill(color); // Устанавливаем цвет заливки

};

const rectV2 = (graphic: PIXI.Graphics, data: any): PIXI.Graphics => {

  /* data:
  center: Vector2, 
  width: number, 
  height: number,
  fillColor: number = 0xff0000, // Цвет заливки (по умолчанию красный)
  lineColor: number = 0x000000, // Цвет обводки (по умолчанию чёрный)
  lineWidth: number = 2         // Толщина линии обводки
  angleDegrees: number = 0

  _____________________________________
  Example: 

  const graphics = new PIXI.Graphics();
  rectV2(
    graphics,
    {
      center: {x: 400, y: 250},
      width: 150,
      height: 75,
      fillColor: 0x006600,
      lineColor: 0x000000,
      lineWidth: this.config.line,
      angleDegrees: 45
    }
  );
  _____________________________________
  
  */

  if (data.width && data.height) {

    // Вычисляем верхний левый угол из центра
    const x = data.center.x - data.width / 2;
    const y = data.center.y - data.height / 2;

    // Очищаем графику перед рисованием (опционально)
    graphic.clear();

    // Рисуем прямоугольник
    graphic.rect(x, y, data.width, data.height); // Рисуем прямоугольник
    graphic.fill(data.fillColor ?? "rgba(0,0,0,0)");
    if( data.lineWidth ){
      graphic.stroke({
        width: data.lineWidth,
        color: data.lineColor ?? "rgba(0,0,0,0)"
      });
    }

    const angleRadians = (data.angleDegrees ?? 0) * (Math.PI / 180);

    // Устанавливаем точку вращения (pivot) в центр графики
    graphic.pivot.set(data.center.x, data.center.y);

    // Устанавливаем позицию графики
    graphic.position.set(data.center.x, data.center.y);

    // Устанавливаем угол поворота
    graphic.rotation = angleRadians;

  }

  return graphic;

}

const drawVerticalLines = (
  graphics: PIXI.Graphics,
  startPoint: Vector2,
  width: number,
  height: number,
  spacing: number = 30,
  heightDirection: 1 | -1 = -1, // Направление линий по оси Y
  color: number | string = 0x000000, // Цвет линий
  lineWidth: number = 1, // Толщина линий
  rotationDegrees: number = 0, // Угол поворота линий вокруг startPoint,
  clear: boolean = true
): void => {

  if(clear) graphics.clear(); // Очистка предыдущего содержимого

  const baseAngleDegrees = 76; // Базовый угол линий
  const baseAngleRadians = (baseAngleDegrees * Math.PI) / 180; // Преобразуем базовый угол в радианы
  const rotationRadians = (rotationDegrees * Math.PI) / 180; // Преобразуем угол поворота в радианы

  height += 100;

  const numLines = Math.floor((width) / spacing); // Количество линий, помещающихся в ширину

  // Функция для поворота точки вокруг startPoint
  const rotatePoint = (x: number, y: number, origin: Vector2, angle: number): Vector2 => {
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    const dx = x - (origin.x);
    const dy = y - (origin.y);

    const rotatedX = dx * cosAngle - dy * sinAngle + (origin.x);
    const rotatedY = dx * sinAngle + dy * cosAngle + (origin.y);

    return { x: rotatedX, y: rotatedY };
  };

  for (let i = 0; i <= numLines; i++) {
    const xStart = (startPoint.x) + i * spacing; // X-координата начальной точки линии
    const yStart = (startPoint.y); // Y-координата начальной точки линии

    // Вычисляем смещение конечной точки с учетом heightDirection
    const xOffset = (height) * Math.cos(baseAngleRadians); // Горизонтальное смещение
    const yOffset = (height) * Math.sin(baseAngleRadians) * heightDirection; // Вертикальное смещение

    const xEnd = xStart + xOffset; // X-координата конечной точки
    const yEnd = yStart + yOffset; // Y-координата конечной точки

    // Поворачиваем начальную и конечную точки вокруг startPoint
    const rotatedStart = rotatePoint(xStart, yStart, startPoint, rotationRadians);
    const rotatedEnd = rotatePoint(xEnd, yEnd, startPoint, rotationRadians);

    // Рисуем линию
    graphics.moveTo(rotatedStart.x, rotatedStart.y); // Устанавливаем начальную точку линии
    graphics.lineTo(rotatedEnd.x, rotatedEnd.y); // Рисуем линию до конечной точки
    graphics.stroke({
      color: color,
      width: lineWidth,
    });
  }
}

const drawDashedOutline = (
  graphics: PIXI.Graphics,
  points: Vector2[], // Массив точек для контура
  dashLength: number = 4, // Длина каждого штриха
  gapLength: number = 2, // Длина промежутка между штрихами
  color: number = 0x000000, // Цвет линии
  lineWidth: number = 1, // Толщина линии
): void => {
  if (points.length < 2) {
    console.warn("Недостаточно точек для построения контура.");
    return;
  }

  // Перебираем точки попарно
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = {
      x: points[i].x,
      y: points[i].y
    };
    const p1 = {
      x: points[i + 1].x,
      y: points[i + 1].y
    };
    const startPoint = p0; // points[i]; // Текущая точка
    const endPoint = p1; // points[i + 1]; // Следующая точка

    // Вычисляем разницу координат
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;

    // Длина линии между текущей и следующей точкой
    const lineLength = Math.sqrt(dx * dx + dy * dy);

    // Угол линии
    const angle = Math.atan2(dy, dx);

    // Текущая длина, пройденная вдоль линии
    let currentLength = 0;

    // Рисуем штрихи до тех пор, пока текущая длина меньше длины линии
    while (currentLength < lineLength) {
      // Вычисляем начальные координаты штриха
      const dashStartX = startPoint.x + Math.cos(angle) * currentLength;
      const dashStartY = startPoint.y + Math.sin(angle) * currentLength;

      // Длина текущего штриха (учитываем, что штрих может быть обрезан в конце линии)
      const dashEndLength = Math.min(dashLength, lineLength - currentLength);

      // Вычисляем конечные координаты штриха
      const dashEndX =
        dashStartX + Math.cos(angle) * dashEndLength;
      const dashEndY =
        dashStartY + Math.sin(angle) * dashEndLength;

      // Рисуем штрих
      graphics.moveTo(dashStartX, dashStartY);
      graphics.lineTo(dashEndX, dashEndY);

      // Обновляем текущую длину, добавляя длину штриха и промежутка
      currentLength += dashEndLength + gapLength;
    }
  }

  // Соединяем последнюю точку с первой для замкнутого контура
  const p0 = {
    x: points[points.length - 1].x,
    y: points[points.length - 1].y
  };
  const p1 = {
    x: points[0].x,
    y: points[0].y
  };
  const startPoint = p0; // points[points.length - 1];
  const endPoint = p1; // points[0];
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const lineLength = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  let currentLength = 0;

  while (currentLength < lineLength) {
    const dashStartX = startPoint.x + Math.cos(angle) * currentLength;
    const dashStartY = startPoint.y + Math.sin(angle) * currentLength;

    const dashEndLength = Math.min(dashLength, lineLength - currentLength);

    const dashEndX = dashStartX + Math.cos(angle) * dashEndLength;
    const dashEndY = dashStartY + Math.sin(angle) * dashEndLength;

    graphics.moveTo(dashStartX, dashStartY);
    graphics.lineTo(dashEndX, dashEndY);

    currentLength += dashEndLength + gapLength;
  }

  graphics.stroke({
    color: color,
    width: lineWidth
  });

}

const drawArrow = (
  graphics: PIXI.Graphics,
  startPoint: Vector2,
  width: number, // Длина стрелки
  angleDegrees: number, // Угол направления стрелки в градусах
  color: { line: number | string, head: number | string } | number | string = 0x000000, // Цвет стрелки
  lineWidth: number = 1, // Толщина линии
  triangleSize: number = 12, // Размер треугольника (основание и высота)
  clearGraphics: boolean = false // Флаг: очищать графику или нет,
): void => {
  if (clearGraphics) {
    graphics.clear(); // Очистка графики
  }

  // Преобразуем угол из градусов в радианы
  const angleRadians = (angleDegrees * Math.PI) / 180;

  // Вычисляем конечную точку линии на основе длины и угла
  const endPoint = {
    x: (startPoint.x) + Math.cos(angleRadians) * (width),
    y: (startPoint.y) + Math.sin(angleRadians) * (width),
  };

  // Убедимся, что цвет линии и головы стрелки корректно обрабатывается
  const lineColor = typeof color === "object" ? color.line : color;
  const headColor = typeof color === "object" ? color.head : color;

  // Рисуем основную линию
  graphics.moveTo((startPoint.x), (startPoint.y));
  graphics.lineTo(endPoint.x, endPoint.y);
  graphics.stroke({
    color: lineColor,
    width: lineWidth,
  });

  // Вычисляем вершины треугольника
  const halfBase = triangleSize / 2;
  const backPoint = {
    x: endPoint.x - Math.cos(angleRadians) * triangleSize,
    y: endPoint.y - Math.sin(angleRadians) * triangleSize,
  };
  const leftPoint = {
    x: backPoint.x + Math.cos(angleRadians + Math.PI / 2) * halfBase,
    y: backPoint.y + Math.sin(angleRadians + Math.PI / 2) * halfBase,
  };
  const rightPoint = {
    x: backPoint.x + Math.cos(angleRadians - Math.PI / 2) * halfBase,
    y: backPoint.y + Math.sin(angleRadians - Math.PI / 2) * halfBase,
  };

  // Рисуем треугольник
  graphics.moveTo(endPoint.x, endPoint.y); // Вершина треугольника
  graphics.lineTo(leftPoint.x, leftPoint.y); // Левая вершина треугольника
  graphics.lineTo(rightPoint.x, rightPoint.y); // Правая вершина треугольника
  graphics.closePath(); // Замыкаем треугольник
  graphics.fill(headColor);
}

const drawArrowHead = (
  graphics: PIXI.Graphics,
  startPoint: Vector2, // Позиция начала стрелки
  distanceX: number, // Расстояние от начала стрелки до треугольника
  distanceY: number, // Расстояние от начала стрелки до треугольника
  arrowDirection: { axis: 'x' | 'y'; value: 1 | -1 }, // Направление стрелки
  angleDegrees: number, // Угол поворота стрелки относительно начала
  color: number | string = 0x000000, // Цвет стрелки
  size: number = 12, // Размер треугольника (основание и высота)
  clearGraphics: boolean = true // Флаг: очищать графику или нет
): void => {
  if (clearGraphics) {
    graphics.clear(); // Очистка графики, если требуется
  }
  // Преобразуем угол из градусов в радианы
  const angleRadians = (angleDegrees * Math.PI) / 180;

  // Размер треугольника (половина основания)
  const halfBase = size / 2;

  // 1. Сначала вычисляем точку рисования стрелки (без поворота)
  const baseX = (startPoint.x) + distanceX;
  const baseY = (startPoint.y) + distanceY;

  // 2. Поворачиваем точку (baseX, baseY) относительно startPoint на угол angleRadians
  const deltaX = baseX - (startPoint.x);
  const deltaY = baseY - (startPoint.y);

  const rotatedX = (startPoint.x) + deltaX * Math.cos(angleRadians) - deltaY * Math.sin(angleRadians);
  const rotatedY = (startPoint.y) + deltaX * Math.sin(angleRadians) + deltaY * Math.cos(angleRadians);

  // Теперь rotatedX и rotatedY — это точка рисования стрелки с учетом смещения и поворота

  let leftPoint: Vector2;
  let rightPoint: Vector2;

  if (arrowDirection.axis === 'y') {
    // Направление стрелки по оси Y
    if (arrowDirection.value === 1) {
      // Направление вверх
      leftPoint = { x: rotatedX - halfBase, y: rotatedY - size };
      rightPoint = { x: rotatedX + halfBase, y: rotatedY - size };
    } else {
      // Направление вниз
      leftPoint = { x: rotatedX - halfBase, y: rotatedY + size };
      rightPoint = { x: rotatedX + halfBase, y: rotatedY + size };
    }
  } else {
    // Направление стрелки по оси X
    if (arrowDirection.value === -1) {
      // Направление вправо
      leftPoint = { x: rotatedX + size, y: rotatedY - halfBase };
      rightPoint = { x: rotatedX + size, y: rotatedY + halfBase };
    } else {
      // Направление влево
      leftPoint = { x: rotatedX - size, y: rotatedY - halfBase };
      rightPoint = { x: rotatedX - size, y: rotatedY + halfBase };
    }
  }

  function rotatePoint(x: number, y: number, centerX: number, centerY: number, angle: number) {
    // Перевод угла в радианы
    let rad = angle * Math.PI / 180;
    // Применяем матрицу поворота
    let rotatedX = centerX + (x - centerX) * Math.cos(rad) - (y - centerY) * Math.sin(rad);
    let rotatedY = centerY + (x - centerX) * Math.sin(rad) + (y - centerY) * Math.cos(rad);
    return { x: rotatedX, y: rotatedY };
  }

  // Поворот левой и правой точки
  let rotatedLeft = rotatePoint(leftPoint.x, leftPoint.y, rotatedX, rotatedY, angleDegrees);
  let rotatedRight = rotatePoint(rightPoint.x, rightPoint.y, rotatedX, rotatedY, angleDegrees);

  // Рисуем треугольник с повернутыми точками
  graphics.moveTo(rotatedX, rotatedY); // Вершина треугольника
  graphics.lineTo(rotatedLeft.x, rotatedLeft.y); // Повернутая левая точка
  graphics.lineTo(rotatedRight.x, rotatedRight.y); // Повернутая правая точка
  graphics.lineTo(rotatedX, rotatedY); // Замыкаем треугольник
  graphics.closePath(); // Замыкаем треугольник
  graphics.fill(color); // Заканчиваем рисование
}

const drawCircle = (
  graphics: PIXI.Graphics,
  startPoint: Vector2,
  size: number,
  color: string | number
): void => {
  // Определяем центр геометрии
  const centerX: number = startPoint.x;
  const centerY: number = startPoint.y;

  // Радиус окружности (половина размера)
  const radius: number = size / 2;

  // Рисуем окружность
  graphics.beginPath();
  graphics.arc(centerX, centerY, radius, 0, Math.PI * 2); // Полный круг
  graphics.closePath();
  graphics.fill(color);
}

const drawShape = (
  graphics: PIXI.Graphics,
  points: Vector2[], // Массив точек для контура
  color: {
    stroke?: number | string, // Цвет линии
    fill?: number | string // Цвет заливки
  } = {},
  lineWidth: number = 1, // Толщина линии
  clearGraphics: boolean = false, // Флаг: очищать графику или нет
): void => {

  if (points.length < 2) {
    console.warn("Недостаточно точек для построения контура.");
    return;
  }

  if (clearGraphics) {
    graphics.clear(); // Очистка графики
  }

  // Перебираем точки попарно
  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    // Рисуем линию
    if (i == 0) graphics.moveTo(point.x, point.y);
    graphics.lineTo(point.x, point.y);
    if ((points.length - 1) === i) {
      graphics.lineTo(points[0].x, points[0].y);
    }
  }

  if (color.fill) {
    graphics.fill(color.fill);
  }

  graphics.stroke({
    color: color.stroke ?? 0x000000,
    width: lineWidth
  });
}

const drawLine = (
  graphics: PIXI.Graphics,
  startPoint: Vector2,
  width: number, // Длина стрелки
  angleDegrees: number, // Угол направления стрелки в градусах
  color: number | string = 0x000000, // Цвет стрелки
  lineWidth: number = 1, // Толщина линии
  clearGraphics: boolean = false, // Флаг: очищать графику или нет
  stepNormal: number = 0, // смещение линии по нормали
  __endPoint: Vector2 | null = null // Конечная точка линии (опционально)
): Vector2[] => {

  if (clearGraphics) {
    graphics.clear(); // Очистка графики
  }

  // Преобразуем угол из градусов в радианы
  const angleRadians = (angleDegrees * Math.PI) / 180;

  // Вычисляем конечную точку линии на основе длины и угла
  const endPoint = __endPoint || {
    x: startPoint.x + Math.cos(angleRadians) * width,
    y: startPoint.y + Math.sin(angleRadians) * width,
  };

  // Смещаем начальную и конечную точки по нормали на stepNormal
  const normalAngleRadians = angleRadians + Math.PI / 2;
  const startPointShifted = {
    x: startPoint.x + Math.cos(normalAngleRadians) * stepNormal,
    y: startPoint.y + Math.sin(normalAngleRadians) * stepNormal,
  };
  const endPointShifted = {
    x: endPoint.x + Math.cos(normalAngleRadians) * stepNormal,
    y: endPoint.y + Math.sin(normalAngleRadians) * stepNormal,
  };

  // Рисуем основную линию с учетом смещения
  graphics.moveTo(startPointShifted.x, startPointShifted.y);
  graphics.lineTo(endPointShifted.x, endPointShifted.y);
  graphics.stroke({
    color: color,
    width: lineWidth,
  });

  graphics.closePath();

  return [
    startPointShifted,
    endPointShifted
  ];

}

const drawArc = (
  graphics: PIXI.Graphics,
  center: Vector2,
  radius: number, // Радиус дуги
  startAngleDegrees: number = 0, // Начальный угол в градусах
  endAngleDegrees: number = 360, // Конечный угол в градусах
  color: number | string = 0x000000, // Цвет дуги
  lineWidth: number = 1, // Толщина линии
  clearGraphics: boolean = false // Флаг: очищать графику или нет
): void => {

  if (clearGraphics) {
    graphics.clear(); // Очистка графики
  }

  // Преобразуем углы из градусов в радианы
  const startAngleRadians = (startAngleDegrees * Math.PI) / 180;
  const endAngleRadians = (endAngleDegrees * Math.PI) / 180;

  // Рисуем дугу
  graphics.arc(center.x, center.y, radius, startAngleRadians, endAngleRadians);
  
  // Устанавливаем цвет и толщину линии
  graphics.stroke({
    color: color,
    width: lineWidth,
  });
  
}

export {
  rect,
  shape,
  rectV2,
  drawVerticalLines,
  drawDashedOutline,
  drawArrow,
  drawArrowHead,
  drawCircle,
  drawShape,
  drawLine,
  drawArc
};