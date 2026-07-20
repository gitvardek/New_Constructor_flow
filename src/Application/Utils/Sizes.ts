
import { EventEmitter } from "./EventEmitter";

export class Sizes extends EventEmitter {

    width: number;
    height: number;
    pixelRatio: number
    canvas: HTMLElement

    constructor(canvas: HTMLElement) {

        super();
        // Настройки
        this.canvas = canvas
        this.width = canvas.offsetWidth
        this.height = canvas.offsetHeight
        this.pixelRatio = Math.min(window.devicePixelRatio, 2)

        /** Привязываем к контексту */
        this.getNewSize = this.getNewSize.bind(this)

        window.addEventListener('resize', this.getNewSize, false)
    }

    // Получение новых параметров 
    getNewSize(): void {

        this.width = this.canvas.offsetWidth
        this.height = this.canvas.offsetHeight
        this.pixelRatio = Math.min(window.devicePixelRatio, 2)
        this.trigger('resize')
    }

    // Удаление слушателя
    destroy(): void {
        window.removeEventListener('resize', this.getNewSize, false)
    }
}