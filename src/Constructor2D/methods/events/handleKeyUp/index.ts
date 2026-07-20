// import { Events } from "@/store/constructor2d/events";

export function handleKeyUp(this: any, e: KeyboardEvent): void {

  // Проверяем, находится ли фокус на элементе ввода
  const isInputFocused = 
    document.activeElement?.tagName === 'INPUT' || 
    document.activeElement?.tagName === 'TEXTAREA';

  // Если фокус на элементе ввода, игнорируем обработку
  if (isInputFocused) {
    return;
  }
  
  if(e.key === "Shift") {
    if(this.layers.planner){
      this.state.keys.shift = false;
    }
  }else if(e.key === "Control") {
    this.state.keys.ctrl = false;
  }
  
};