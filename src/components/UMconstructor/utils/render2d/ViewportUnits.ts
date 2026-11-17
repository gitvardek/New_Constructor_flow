// Единственная "живая" реализация конвертации мм↔px, завязанная на текущий
// размер холста (реактивные TOTAL_WIDTH/TOTAL_HEIGHT/areaWidth/areaHeight из
// Render2D.vue). Заменяет одноимённые локальные функции, которые раньше жили
// прямо в Render2D.vue. Тот же контракт (4 функции getPixelWidth/getPixelHeight/
// getMmWidth/getMmHeight), что PixiMethods.ts принимает в Shape/ShapeAdjuster/
// Section через конструктор — методы объявлены как стрелочные поля класса,
// чтобы их можно было передавать по ссылке (как раньше передавались обычные
// функции), не заботясь о привязке this при вызове.
// См. план рефакторинга, C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md, Фаза 2b.

import type { Ref } from "vue";

export default class ViewportUnits {
    private totalWidth: Ref<number>
    private totalHeight: Ref<number>
    private areaWidth: Ref<number>
    private areaHeight: Ref<number>

    constructor(totalWidth: Ref<number>, totalHeight: Ref<number>, areaWidth: Ref<number>, areaHeight: Ref<number>) {
        this.totalWidth = totalWidth
        this.totalHeight = totalHeight
        this.areaWidth = areaWidth
        this.areaHeight = areaHeight
    }

    getPixelWidth = (mmWidth: number): number => {
        return (mmWidth / this.totalWidth.value) * this.areaWidth.value;
    }

    getPixelHeight = (mmHeight: number): number => {
        return (mmHeight / this.totalHeight.value) * this.areaHeight.value;
    }

    getMmWidth = (pxWidth: number): number => {
        return (pxWidth / this.areaWidth.value) * this.totalWidth.value;
    }

    getMmHeight = (pxHeight: number): number => {
        return (pxHeight / this.areaHeight.value) * this.totalHeight.value;
    }
}
