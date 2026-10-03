import { nextTick } from "vue";

/**
 * Прокрутка списка открытого редактора опции (полотно, фрезеровка, палитра…) к выбранному
 * элементу — .active, его ставят редакторы по selectedId. Вызывается после смены редактора:
 * ждём его отрисовки (nextTick) и раскладки (requestAnimationFrame)
 */
export const scrollToActiveOption = async (getContainer: () => HTMLElement | null) => {
    await nextTick();

    requestAnimationFrame(() => {
        const container = getContainer();

        if (!container) {
            return;
        }

        const list = container.querySelector(
            ".material-config_list__details_content, .material-config_list",
        ) as HTMLElement | null;
        const activeEl = list?.querySelector(".active") as HTMLElement | null;

        if (!activeEl || !list) {
            return;
        }

        list.scrollTop =
            activeEl.getBoundingClientRect().top -
            list.getBoundingClientRect().top +
            list.scrollTop;
    });
};
