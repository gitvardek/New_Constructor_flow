export class SystemInfo {

    // Определяет, является ли устройство мобильным
    mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

    // Определяет браузер
    browser = this.detect(/Arora|Chrome|Epiphany|Firefox|Mobile Safari|MSIE|Midori|Opera|Safari/i);

    // Определяет операционную систему 
    os = this.detect(/Android|CrOS|iP[ao]d|iPhone|Linux|Mac OS|Windows/i);

    support = {
        // Поддержка Canvas API
        canvas: !!window.CanvasRenderingContext2D,

        // Поддержка Local Storage
        localStorage: this.checkStorage("localStorage"),

        // Поддержка Session Storage
        sessionStorage: this.checkStorage("sessionStorage"),

        // Поддержка работы с файлами
        file: !!(window.File && window.FileReader && window.FileList && window.Blob),

        // Поддержка файловой системы
        fileSystem: !!(window.requestFileSystem || window.webkitRequestFileSystem),

        // Поддержка доступа к камере и микрофону
        getUserMedia: !!(navigator.mediaDevices?.getUserMedia),

        // Поддержка requestAnimationFrame для анимации
        requestAnimationFrame: !!window.requestAnimationFrame,

        // Поддержка WebGL для рендеринга 3D графики
        webgl: this.checkWebGL(),

        // Поддержка Web Workers для многопоточности
        worker: !!window.Worker
    };

    // Метод для поиска и возврата названия браузера или операционной системы
    private detect(regex: RegExp): string | boolean {
        const match = navigator.userAgent.match(regex);
        return match ? match[0] : false;
    }

    // Метод для проверки поддержки LocalStorage или SessionStorage
    private checkStorage(type: "localStorage" | "sessionStorage"): boolean {
        try {
            return !!window[type].getItem;
        } catch {
            return false;
        }
    }

    // Метод для проверки поддержки WebGL
    private checkWebGL(): boolean {
        try {
            // Проверяем наличие контекста WebGL
            return !!window.WebGLRenderingContext && !!document.createElement("canvas").getContext("webgl");
        } catch {
            return false;
        }
    }
}