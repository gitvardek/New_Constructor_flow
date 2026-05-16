
type TFormula = {
    'eco': (id: number, count: number) => boolean
}

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

    const getException = (type: keyof TFormula) => {
        const formulas: TFormula = {
            eco: (id: number, count: number) => {
                if (id === 0) return true;                      // всегда первый
                if (count > 2 && id === count - 1) return true; // последний если > 2
                if (count === 5 && id === 2) return true;       // средний только для 5
                return false;
            }
        };

        const key = type?.toLowerCase() as keyof TFormula;


        if (!(key in formulas)) {
            console.warn(`getException: unknown type "${type}"`);
            return null;
        }

        return formulas[key];
    };

    return {
        expressionsReplace,
        calculateFromString,
        getException
    }

}