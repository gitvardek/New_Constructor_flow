import * as PIXI from 'pixi.js';

export default class Grid {

  private app: PIXI.Application | null; // PIXI-приложение, может быть обнулено
  private parent: any | null; // this родительского класса
  private container: PIXI.Container | null; // Контейнер, может быть обнулен
  private gridLines: PIXI.Graphics | null; // Линии сетки, может быть обнулено

  public config: any | null = {

    grid: {
      size: 100,
      colorLine: 0xefefef
    }

  };

  constructor(pixiApp: PIXI.Application, parent: any) {

    if (!pixiApp) {
      throw new Error("PIXI.Application instance is required");
    }

    this.app = pixiApp;
    this.parent = parent;
    this.container = new PIXI.Container();
    this.container.position.set(30, 30);
    this.app.stage.addChild(this.container);

    this.gridLines = new PIXI.Graphics();
    this.container.addChild(this.gridLines);

    this.draw();

  }

  private draw(): void {
    this.drawGrid();
  }

  public drawGrid(): void {
    
    this.gridLines!.clear();
    
    const width = this.app!.renderer.width * this.parent.config.inverseScale;
    const height = this.app!.renderer.height * this.parent.config.inverseScale;
    
    const vLines = Math.ceil(width / this.config.grid.size) + 2;
    const hLines = Math.ceil(height / this.config.grid.size) + 2;
    
    const centerScene = {
      x: (this.parent.config.originOfCoordinates.x * this.parent.config.inverseScale - 30),
      y: (this.parent.config.originOfCoordinates.y * this.parent.config.inverseScale - 30)
    };
    
    this.drawLines(
      vLines,
      (i) => {
        const positionX: number = (i * this.config.grid.size) + (centerScene.x % this.config.grid.size);
        return {
          startX: positionX,
          startY: -this.config.grid.size,
          endX: positionX,
          endY: height + this.config.grid.size,
        };
      },
      this.config.grid.colorLine
    );

    this.drawLines(
      hLines,
      (i) => {
        const positionY: number = (i * this.config.grid.size) + (centerScene.y % this.config.grid.size);
        return {
          startX: -this.config.grid.size,
          startY: positionY,
          endX: width + this.config.grid.size,
          endY: positionY,
        };
      },
      this.config.grid.colorLine
    );

    const offset = (this.parent.layers.rulers ? this.parent.layers.rulers.config.space : 30) - this.config.grid.size;
    this.gridLines!.position.set(offset, offset);
  }

  private drawLines(
    count: number,
    getPositions: (index: number) => { startX: number; startY: number; endX: number; endY: number },
    color: number | string
  ): void {
    for (let i = 0; i < count; i++) {
      const { startX, startY, endX, endY } = getPositions(i);
      this.gridLines!.moveTo(startX, startY);
      this.gridLines!.lineTo(endX, endY);
    }
    this.gridLines!.stroke({
      width: 1,
      color: color
    });
  }

  public set scale(v: number) {
    this.container!.scale.set(v);
    this.drawGrid();
  }

  public destroy(): void {
    try {
      // Очистка сетки
      if (this.gridLines) {
        try {
          // Сначала удаляем из контейнера
          if (this.container && this.container.children && this.container.children.includes(this.gridLines)) {
            this.container.removeChild(this.gridLines);
          }
          // Затем уничтожаем
          this.gridLines.destroy(true);
        } catch (error) {
          console.warn('Ошибка при уничтожении gridLines:', error);
        }
        this.gridLines = null;
      }

      if (this.container) {
        try {
          this.container.destroy({ children: true, texture: true });
        } catch (error) {
          console.warn('Ошибка при уничтожении container:', error);
        }
        this.container = null;
      }

      // Обнуление приложения
      this.parent = null;
      this.config = null;
      this.app = null;
    } catch (error) {
      console.error('Ошибка при уничтожении Grid:', error);
    }
  }
  
};