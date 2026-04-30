// import { useModelState } from "@/store/appliction/useModelState";
// import { useEventBus } from "@/store/appliction/useEventBus";
// import { useToast } from "@/features/toaster/useToast";
// import { TFasadeGroupSize } from "@/store/appliction/useModelState";
// import type { Object3D } from 'three'
// import { TTotalProps, TFasadeItem, TFasadeTrueSizes, TFasadeConversation, TMillingRestrictItem, TConfig } from "@/types/types";


export const useExpressions = () => {

    const expressionsReplace = <T>(obj: T, expressions: Record<string, number | string>): T => {
        if (!expressions || !Object.keys(expressions).length) return obj;

        const isObject = obj !== null && typeof obj === "object";

        const replaced = Object.entries(expressions).reduce(
            (acc, [key, value]) => acc.split(key).join(String(value ?? 0)),
            isObject ? JSON.stringify(obj) : String(obj)
        );

        return isObject ? JSON.parse(replaced) : replaced as T;
    }

    const calculateFromString = <T>(expression: T) => {
        try {
            const func = new Function("return " + expression);
            return func();
        } catch (error) {
            console.error(expression, '---"Недопустимое выражение!"')
            return "Недопустимое выражение!";
        }
    }

    return {
        expressionsReplace,
        calculateFromString
    }

}