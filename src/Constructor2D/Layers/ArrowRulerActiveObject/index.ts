import * as PIXI from "pixi.js"; // Для работы с графикой
import { MathUtils } from "three"; // Для работы с математикой, например, преобразование градусов в радианы
import { Vector2 } from "@/types/constructor2d/interfaсes"; // Интерфейс для объектов планировщика
import { drawArrow } from "./../../utils/Shape"; // Утилита для отрисовки стрелки
import {
  Config
} from './interfaces';

export default class ArrowRulerActiveObject {

  private app: PIXI.Application | null; // Экземпляр приложения PIXI
  private parent: any;
  private container: PIXI.Container | null; // Контейнер для размещения графических элементов

  // Графические объекты и текст для отображения измерений
  private xArrow: PIXI.Graphics | null = null; 
  private xText: PIXI.Text | null = null;

  private yArrow: PIXI.Graphics | null = null;
  private yText: PIXI.Text | null = null;

  private config: Config = {

    color: 0x5D6069,
    fontSize: 16,
    dotLenght: 10
    
  };

  constructor(pixiApp: PIXI.Application, parent: any) {
    if (!pixiApp) throw new Error("PIXI.Application instance is required"); // Проверка на наличие PIXI-приложения

    this.app = pixiApp; // Сохраняем ссылку на приложение PIXI
    this.parent = parent;
    this.container = new PIXI.Container(); // Создаем контейнер для графических элементов
    this.container.x = 30; // Начальное положение контейнера по X
    this.container.y = 30; // Начальное положение контейнера по Y
    this.app.stage.addChild(this.container); // Добавляем контейнер на сцену PIXI

    // Создаем графику и текст для оси X
    this.xArrow = new PIXI.Graphics();
    this.container.addChild(this.xArrow);
    this.xText = new PIXI.Text({
      text: "", // Текст будет добавляться динамически
      style: {
        fontSize: this.config.fontSize, // Размер шрифта
        fill: this.config.color, // Цвет текста
      },
    });
    this.container.addChild(this.xText);

    // Создаем графику и текст для оси Y
    this.yArrow = new PIXI.Graphics();
    this.container.addChild(this.yArrow);
    this.yText = new PIXI.Text({
      text: "",
      style: {
        fontSize: this.config.fontSize, // Размер шрифта
        fill: this.config.color, // Цвет текста
      },
    });
    this.container.addChild(this.yText);

  }

  // Метод для отрисовки стрелок с размером
  public draw(position: Vector2): void {
    if (!position) return; // Если точки нет, выходим

    this.container!.visible = true; // Делаем контейнер видимым

    // Очищаем предыдущую графику
    this.xArrow!.clear();
    this.xText!.text = "";
    this.yArrow!.clear();
    this.yText!.text = "";

    // Отрисовка вертикальной стрелки (ось Y)
    const distanceY = position.y;
    const rotateDegY = -90;
    drawArrow(
      this.xArrow!,
      position,
      distanceY,
      rotateDegY,
      this.config.color,
      0.6,
      12,
      true
    );
    this.xText!.text = `${Math.round((distanceY) * this.config.dotLenght)} мм`;
    this.xText!.x = (position.x) - 24;
    this.xText!.y = ((distanceY / 2) + (this.xText!.width / 2));
    this.xText!.rotation = MathUtils.degToRad(rotateDegY);

    // Отрисовка горизонтальной стрелки (ось X)
    const distanceX = position.x;
    const rotateDegX = 180;
    drawArrow(
      this.yArrow!,
      position,
      distanceX,
      rotateDegX,
      this.config.color,
      0.6,
      12,
      true
    );
    this.yText!.text = `${Math.round((distanceX) * this.config.dotLenght)} мм`;
    this.yText!.y = (position.y) - 24;
    this.yText!.x = ((distanceX / 2) - (this.yText!.width / 2));
  }

  public updateScenePosition(): void {

    this.container!.x = this.parent.config.originOfCoordinates.x + 30;
    this.container!.y = this.parent.config.originOfCoordinates.y + 30;
    
  }

  public set scale(v: number) {
    this.container!.scale.set(v);
  }

  // Метод для скрытия графики
  public clearGraphic(): void {
    this.container!.visible = false;
  }

  // Метод для очистки ресурсов и уничтожения объекта
  public destroy(): void {

    if (this.xArrow) {
      this.xArrow.destroy(true);
      this.container!.removeChild(this.xArrow);
      this.xArrow = null;
    }
    if (this.xText) {
      this.xText.destroy(true);
      this.container!.removeChild(this.xText);
      this.xText = null;
    }
    if (this.yArrow) {
      this.yArrow.destroy(true);
      this.container!.removeChild(this.yArrow);
      this.yArrow = null;
    }
    if (this.yText) {
      this.yText.destroy(true);
      this.container!.removeChild(this.yText);
      this.yText = null;
    }
    if (this.app?.stage && this.container) {
      this.app.stage.removeChild(this.container);
    }
    if (this.container) {
      this.container.destroy({ children: true, texture: true });
      this.container = null;
    }
    this.app = null;

  }

};