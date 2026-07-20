
class UserHistory<T> {
    private maxSize: number;
    private history: T[];
    private currentIndex: number;
    private triggers: string[] = [
        "U:PositionChanged",
        "U:Drop",
        'U:ChangeModule',
        "U:Model-resize",
        "U:ChangePaletteColor",
        "U:ChangeMilling",
        "U:DrawPatina",
        "U:DeliteFasad",
        'U:ChangeFasade',
        "U:RemoveModel",
        "U:Duplicated"
    ]

    constructor(maxSize: number = 10) {
        this.maxSize = maxSize;
        this.history = [[]] as T[];
        this.currentIndex = 0;
        // this.currentIndex = -1;
    }

    get _currentIndex() {
        return this.currentIndex
    }

    addAction(action: T): void {
        // Удаляем действия после текущей позиции, если они есть
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }
        // const trigger = this.triggers.includes(name)
        // console.log(trigger, 'trigger')


        // Добавляем новое действие
        this.history.push(action);
        this.currentIndex = this.history.length - 1;

        // Ограничиваем размер истории
        if (this.history.length > this.maxSize) {
            this.history.shift();
            this.currentIndex--;
        }
    }

    undo(): T | null {
        // Возвращаем предыдущее действие, если оно существует

        if (this.currentIndex > 0) {
            this.currentIndex--;
            const action = this.currentIndex >= 0 ? this.history[this.currentIndex] : null;
            return action
        }


        return null;
    }

    redo(): T | null {
        // Возвращаем следующее действие, если оно существует
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            const action = this.history[this.currentIndex];
            return action;
        }
        return null;
    }

    getCurrentAction(): T | null {
        // Возвращаем текущее действие
        return this.currentIndex >= 0 ? this.history[this.currentIndex] : null;
    }

    getHistory(): T[] {
        // Возвращаем полную историю
        return [...this.history];
    }

    clearHistory(data?: T): void {

        // Очищаем историю
        // this.history = [[]] as T[];
        this.history = [data] as T[];
        // this.currentIndex = -1;
        this.currentIndex = 0;
    }

    checkEvent(event: string): boolean {

        return this.triggers.includes(event);

    }
}

export { UserHistory }