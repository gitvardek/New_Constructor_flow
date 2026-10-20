// ==== Универсальная тумбочка (CABINET) — глубина ====
// Корпус, фасад и крышка вместе укладываются в глубину гардеробной системы
// (getWardrobeShelfDepth — та же, что у полок): наружу торчать нечему, поэтому
// глубина КОРПУСА зависит от крышки (накладка/столешница, TOPFASADECOLOR.SHOW)
// и от самого толстого выбранного полотна фасада (t):
//
//   крышки нет, фасада нет:  корпус = D
//   крышки нет, фасад есть:  корпус = D - 2 - t          (перед фасада по D)
//   крышка, фасада нет:      крышка = D, корпус = D - 2
//   крышка и фасад:          крышка = D, корпус = D - 2 - 2 - t
//
// где 2 — CABINET_TOP_FRONT_GAP (свес крышки над передом) и CABINET_FASADE_GAP
// (зазор корпус->фасад, его даёт сборка УМ: ModulegridParser ставит фасад на
// POSITION_Z = SIZE.depth + 2). Задняя грань корпуса при этом всегда на -D/2
// (CabinetMeshBuilder), т.е. все вычеты уходят в перед.
//
// Глубина крышки — всегда D, её подставляет в сборку CabinetMeshBuilder
// (CONFIG.TOPFASADE_DEPTH), а не формула УМ от корпуса.
import { useModelState } from "@/store/appliction/useModelState.ts";
import { UM_PARAMS } from "@/components/UMconstructor/utils/Const.ts";
import { CABINET_TOP_FRONT_GAP, CABINET_FASADE_GAP } from "./cabinetData.ts";
import { hasCabinetTopPanel } from "./cabinetTopPanel.ts";

// Толщина самого толстого ПОЛОТНА фасада сетки, мм; 0 — фасада нет.
// Полотна те же, что сборка складывает в FASADE_PROPS (ModulegridParser):
// двери секций и фасады ящиков. В редакторе FASADE_PROPS не заполняется (его
// пишет только 3D-сборка), поэтому источник — сетка.
export function getCabinetFasadeThickness(grid: any): number {
    const { NO_FASADE_ID } = UM_PARAMS;
    const materials = useModelState()._FASADE;

    const thickness = (fasade: any): number => {
        // fasade.error — полотно, которое сборка пропускает (ModulegridParser),
        // т.е. в 3D его нет и глубину оно не занимает.
        if (!fasade || fasade.error) return 0;
        const color = fasade.material?.COLOR;
        if (!color || +color === NO_FASADE_ID) return 0;
        return materials[color]?.DEPTH ?? 18;
    };

    let max = 0;
    (grid?.sections ?? []).forEach((section: any) => {
        section?.fasades?.forEach((door: any[]) => door?.forEach((fasade) => {
            max = Math.max(max, thickness(fasade));
        }));
        section?.fasadesDrawers?.forEach((fasade: any) => {
            max = Math.max(max, thickness(fasade));
        });
    });

    return max;
}

// Глубина корпуса тумбочки, мм, по глубине системы и состоянию конфига.
// grid — сетка, из которой берутся фасады; по умолчанию сохранённая в конфиге
// (в редакторе фасады меняются в ЖИВОЙ сетке, её передают явно).
export function getCabinetBodyDepth(systemDepth: number, config: any, grid: any = config?.MODULEGRID): number {
    const fasadeThickness = getCabinetFasadeThickness(grid);
    const deduction = (hasCabinetTopPanel(config) ? CABINET_TOP_FRONT_GAP : 0)
        + (fasadeThickness ? CABINET_FASADE_GAP + fasadeThickness : 0);

    // Целые мм: глубина системы бывает дробной у сохранённых гардеробных.
    const depth = Math.floor(systemDepth - deduction);

    if (depth <= 0) {
        console.warn(`Тумбочка: глубина системы ${systemDepth} мм меньше вычета ${deduction} мм, корпус оставлен в глубину системы`);
        return Math.floor(systemDepth);
    }

    return depth;
}
