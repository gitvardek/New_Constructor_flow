import * as THREE from "three"
import { EventEmitter } from "./EventEmitter";
// import Stats from "three/examples/jsm/libs/stats.module.js";

export class Time extends EventEmitter {
    clock: THREE.Clock
    prev: number
    // stats: Stats
    private animationFrameId: number | null; // Идентификатор для requestAnimationFrame

    constructor() {

        super();

        this.clock = new THREE.Clock();
        this.prev = 0
        this.animationFrameId = null; // Инициализируем как null

        this.tick = this.tick.bind(this)
        // this.stats = new Stats()
        // document.body.appendChild(this.stats.dom);

        this.tickStart()
    }


    // Метод для запуска анимации
    tickStart(): void {
        if (this.animationFrameId === null) { // Проверяем, что анимация ещё не запущена
            this.prev = this.clock.getElapsedTime(); // Сбрасываем предыдущее время
            this.animationFrameId = window.requestAnimationFrame(this.tick);
        }
    }

    // Метод для остановки анимации
    tickStop(): void {
        if (this.animationFrameId !== null) {
            window.cancelAnimationFrame(this.animationFrameId); // Останавливаем анимацию
            this.animationFrameId = null; // Сбрасываем идентификатор
        }
    }

    tick(): void {

        const elapsedTime: number = this.clock.getElapsedTime();
        let delta = elapsedTime - this.prev;
        this.prev = delta;

        this.trigger('tick')

        window.requestAnimationFrame(() => {
            // this.stats.begin()
            this.tick()
            // this.stats.end()
        })
    }
}