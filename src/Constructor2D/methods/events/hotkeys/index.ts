// Клавиатура планировщика. Движок обращается к ядру хоткеев напрямую: core/* не
// зависит от Vue и Pinia.

import { Events } from "@/store/constructor2d/events";
import { modifiers, scopeStack } from "@/features/hotkeys/runtime";
import { registerById } from "@/features/hotkeys/registerById";
import { SCOPES } from "@/features/hotkeys/registry/scopes";
import { HOTKEY_IDS } from "@/features/hotkeys/registry/hotkeys.config";
import type { TUnregister } from "@/features/hotkeys/types";

/** false — удалять было нечего, событие остаётся свободным для других скоупов. */
const deleteActive = (c2d: any): boolean => {
  const planner = c2d.layers?.planner;
  if (!planner) return false;

  let handled = false;

  if (planner.state.activeWall) {
    c2d.eventBus.emit(Events.C2D_HIDE_FORM_MODIFY_WALL);
    handled = true;
  }

  if (c2d.layers.doorsAndWindows?.state.activeObject) {
    c2d.layers.doorsAndWindows.removeObject(null, true);
    handled = true;
  }

  return handled;
};

/** Снятие — в destroy(). */
export function registerHotkeys(this: any): TUnregister {
  const c2d = this;

  const releases: TUnregister[] = [
    // Пока движок жив, планировщик — верхний скоуп
    scopeStack.push(SCOPES.PLAN_2D),

    registerById(HOTKEY_IDS.PLAN2D_DELETE_ACTIVE, () => deleteActive(c2d)),

    // state.keys читают Planner (направление стены) и StartPointActiveObject
    modifiers.subscribe(state => {
      c2d.state.keys.shift = state.shift;
      c2d.state.keys.ctrl = state.ctrl;
    }),
  ];

  return () => releases.forEach(release => release());
}
