import { FasadeTextAlignAction } from "@/types/types";

interface ActionButton {
    btnShow: string;
    icon: string;
    size: number;
    fontSize: number;
    id: number | null;
    action: FasadeTextAlignAction;
    active: boolean | null;
}

type TDirectionMap = {
    rotateMap: number[];
    centerOnly: number[];
};

type integrateHandleAction = {
    action: string;
    id: number;
    active: boolean;
};

type TDirectionType = 'rotateMap' | 'integratedHandle' | 'centerOnly' | null;
type THandlesPositionType = string[] | integrateHandleAction[] | [];

// Источник истины для кнопок — неизменяемый на уровне модуля
const BASE_ACTIONS: ActionButton[] = [
    { btnShow: "", icon: "icon-t-45-l",   size: 20, fontSize: 10, id: null, action: FasadeTextAlignAction.left_top,   active: null },
    { btnShow: "", icon: "icon-t-90",     size: 25, fontSize: 10, id: null, action: FasadeTextAlignAction.top,        active: null },
    { btnShow: "", icon: "icon-t-45-r",   size: 20, fontSize: 10, id: null, action: FasadeTextAlignAction.right_top,  active: null },
    { btnShow: "", icon: "icon-l-90",     size: 25, fontSize: 15, id: null, action: FasadeTextAlignAction.left,       active: null },
    { btnShow: "", icon: "icon-centered", size: 25, fontSize: 25, id: null, action: FasadeTextAlignAction.center,     active: null },
    { btnShow: "", icon: "icon-r-90",     size: 25, fontSize: 15, id: null, action: FasadeTextAlignAction.right,      active: null },
    { btnShow: "", icon: "icon-b-45-l",   size: 20, fontSize: 10, id: null, action: FasadeTextAlignAction.left_down,  active: null },
    { btnShow: "", icon: "icon-b-90",     size: 25, fontSize: 10, id: null, action: FasadeTextAlignAction.bottom,     active: null },
    { btnShow: "", icon: "icon-b-45-r",   size: 20, fontSize: 10, id: null, action: FasadeTextAlignAction.right_down, active: null },
];

// Индексы активных кнопок для каждого режима отображения
const directionMap: TDirectionMap = {
    rotateMap: [3, 1, 4, 5, 7],
    centerOnly: [4],
};

const useDerectionAction = () => {
    // Каждый экземпляр компонента получает своё изолированное состояние
    let type: TDirectionType = null;
    let handlePosition: THandlesPositionType = [];

    // Локальная копия BASE_ACTIONS — доступна вызывающему компоненту для чтения размеров
    const actions: ActionButton[] = BASE_ACTIONS.map(a => ({ ...a }));

    const getControlsData = (): ActionButton[] => {
        if (type === 'rotateMap') {
            const visibleIndices = directionMap.rotateMap;
            return actions.map((el, ndx) =>
                visibleIndices.includes(ndx)
                    ? { ...el }
                    : { btnShow: "disabled", icon: "", size: 20, fontSize: 10, id: null, action: NaN as FasadeTextAlignAction, active: null }
            );
        }

        if (type === 'centerOnly') {
            return [{ ...actions[4] }];
        }

        if (handlePosition.length > 0) {
            // Строим индекс из свежей копии, чтобы не мутировать actions
            const localActions = actions.map(a => ({ ...a }));
            const actionsMap = localActions.reduce((map, item) => {
                map[item.action] = item;
                return map;
            }, {} as Record<FasadeTextAlignAction, ActionButton>);

            return (handlePosition as Array<string | integrateHandleAction>)
                .map((key): ActionButton | null => {
                    let actionValue: FasadeTextAlignAction | undefined;

                    if (typeof key === 'string') {
                        actionValue = FasadeTextAlignAction[key as keyof typeof FasadeTextAlignAction];
                    } else {
                        const enumKey = key.action as keyof typeof FasadeTextAlignAction;
                        actionValue = FasadeTextAlignAction[enumKey];
                        if (actionValue !== undefined && actionsMap[actionValue]) {
                            actionsMap[actionValue].id = key.id;
                            actionsMap[actionValue].active = key.active;
                        }
                    }

                    return actionValue !== undefined ? actionsMap[actionValue] : null;
                })
                .filter((item): item is ActionButton => item !== null);
        }

        return actions.map(a => ({ ...a }));
    };

    const setType = (value: TDirectionType) => { type = value; };
    const setHandlePosition = (value: THandlesPositionType) => { handlePosition = value; };

    return { getControlsData, setType, setHandlePosition, actions };
};

export { useDerectionAction };
