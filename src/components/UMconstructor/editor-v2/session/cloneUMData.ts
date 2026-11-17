// Глубокая копия данных редактора УМ (CONFIG, MODULEGRID) для работы сессии на
// копии: правки не трогают источник, пока их не применят.
//
// - Поля 2D-рантайма (PIXI-контейнеры и служебные офсеты, их же вычищает
//   saveUMGrid) пропускаются на любой глубине.
// - Вектора/цвета THREE копируются через clone(): код УМ вызывает их методы.
// - Реактивные прокси разворачиваются (toRaw), циклы безопасны.
// - Прочие экземпляры классов копируются по ссылке — в данных их быть не должно.
import { toRaw } from "vue";

const RUNTIME_KEYS = new Set(["sector", "shapesBond", "xOffset", "yOffset", "Mwidth", "Mheight"]);

const isCloneableThree = (value: any) =>
    typeof value?.clone === "function" && (value.isVector2 || value.isVector3 || value.isColor);

const cloneValue = (input: any, seen: WeakMap<object, any>): any => {
    if (input === null || typeof input !== "object") return input;

    const value = toRaw(input);
    if (seen.has(value)) return seen.get(value);
    if (isCloneableThree(value)) return value.clone();

    if (Array.isArray(value)) {
        const out: any[] = [];
        seen.set(value, out);
        value.forEach((item) => out.push(cloneValue(item, seen)));
        return out;
    }

    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;

    const out: Record<string, any> = {};
    seen.set(value, out);
    Object.keys(value).forEach((key) => {
        if (!RUNTIME_KEYS.has(key)) out[key] = cloneValue(value[key], seen);
    });
    return out;
};

export const cloneUMData = <T>(value: T): T => cloneValue(value, new WeakMap());
