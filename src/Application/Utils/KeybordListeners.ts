import * as THREETypes from "@/types/types"

export class KeybordListeners {
    root: THREETypes.TApplication;
    keyEvent: KeyboardEvent | null = null;

    private onKeyDown: (event: KeyboardEvent) => void;
    private onKeyUp: (event: KeyboardEvent) => void;

    private keydownCallbacks: ((event: KeyboardEvent) => void)[] = [];
    private keyupCallbacks: ((event: KeyboardEvent) => void)[] = [];

    constructor(root: THREETypes.TApplication) {
        this.root = root;
        this.onKeyDown = this.keyDown.bind(this);
        this.onKeyUp = this.keyUp.bind(this);
        this.addKeyListeners();
    }

    get _keyEvent() {
        return this.keyEvent;
    }

    addKeyListeners() {
        document.addEventListener('keydown', this.onKeyDown, false);
        document.addEventListener('keyup', this.onKeyUp, false);
    }

    removeKeyListeners() {
        document.removeEventListener('keydown', this.onKeyDown, false);
        document.removeEventListener('keyup', this.onKeyUp, false);
    }

    keyDown(event: KeyboardEvent) {

        this.keydownCallbacks.forEach(callback => callback(event));
    }

    keyUp(event: KeyboardEvent) {

        this.keyupCallbacks.forEach(callback => callback(event));
    }

    addKeydownCallback(callback: (event: KeyboardEvent) => void) {
        if (typeof callback === 'function') {
            this.keydownCallbacks.push(callback);
        } else {
            console.error('Callback must be a function');
        }
    }

    addKeyupCallback(callback: (event: KeyboardEvent) => void) {
        if (typeof callback === 'function') {
            this.keyupCallbacks.push(callback);
        } else {
            console.error('Callback must be a function');
        }
    }

    removeKeydownCallback(callback: (event: KeyboardEvent) => void) {
        this.keydownCallbacks = this.keydownCallbacks.filter(cb => cb !== callback);
    }

    removeKeyupCallback(callback: (event: KeyboardEvent) => void) {
        this.keyupCallbacks = this.keyupCallbacks.filter(cb => cb !== callback);
    }
}