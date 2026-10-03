//@ts-nocheck

// ==== Гардеробная система (WARDROBE) ====
// Полки сектора: тип (прямая/наклонная), вид (ЛДСП/стекло), материал, цвет,
// положение по Y. Вынесено из ShelvesManager.ts, где жило рядом с box-UM
// addCell/updateCellHeight — те работают с cells, которых у гардеробной
// системы нет вовсе. Штанги и тумбочки лежат в том же section.wardrobeFilling,
// но добавляются через RailsManager/CabinetManager. Точка входа — scope.WARDROBE.shelves.
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import {
    getWardrobeShelfColorOptions,
    findFreeWardrobeShelfPositionY,
    getWardrobeSectionInstallableHeight,
    getWardrobeShelfDepth,
    getWardrobeShelfDragBounds,
} from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { WARDROBE_SHELF_PRODUCT_ID } from "@/components/UMconstructor/wardrobe/createWardrobeGrid.ts";

export default class WardrobeShelvesManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    // Тип (прямая/наклонная), вид (ЛДСП/стекло) и материал (только для ЛДСП,
    // из _WARDROBE_SYSTEM[...].shelf[...].fasade, см.
    // WardrobeSystem.getWardrobeShelfColorOptions).
    private findWardrobeShelf(grid: GridModule, secIndex: number, shelfId: number) {
        return grid.sections[secIndex]?.wardrobeFilling?.find((s) => s.id === shelfId);
    }

    // Тип (прямая/наклонная) и вид (ЛДСП/стекло) задаются один раз при
    // добавлении полки (см. addWardrobeShelf, вкладка "Вставка") и больше не
    // редактируются — во вкладке "Конфигурация" у уже установленной полки
    // доступны только материал (для ЛДСП) и положение по Y, см. чат.
    updateWardrobeShelfColor(grid: GridModule, secIndex: number, shelfId: number, colorId: number) {
        const shelf = this.findWardrobeShelf(grid, secIndex, shelfId);
        if (!shelf) return;

        shelf.colorId = colorId;
        this.scope.reset(grid);
    }

    // Положение полки по вертикали — мм от НИЗА секции до НИЖНЕЙ грани
    // полки ("высота установки от пола"), конвенция подтверждена рендером
    // в WardrobeSceneBuilder.createWardrobeShelf. Дебаунс — тот же паттерн, что и у
    // updateCellHeight (частый ввод через инпут).
    //
    // Границы — та же getWardrobeShelfDragBounds, что уже считает лимиты при
    // перетаскивании мышью (баг, найден пользователем: раньше здесь была
    // отдельная, более простая формула floorGap/ceilingHeight-shelfHeight,
    // не учитывавшая КОЛЛИЗИИ С ДРУГИМИ ПОЛКАМИ секции — инпут позволял
    // увести полку ниже соседней, вплотную к полу, хотя перетаскивание мышью
    // такое уже не разрешало). Единый источник правды для обоих способов
    // задать positionY — драг и числовой ввод.
    updateWardrobeShelfPositionY(grid: GridModule, secIndex: number, shelfId: number, value: number) {
        this.scope.debounce("updateWardrobeShelfPositionY", () => {
            const shelves = grid.sections[secIndex]?.wardrobeFilling;
            const shelf = shelves?.find((s) => s.id === shelfId);
            if (!shelf) return;

            const depthMm = getWardrobeShelfDepth(grid);
            const ceilingHeight = getWardrobeSectionInstallableHeight(grid, secIndex);
            const { minY, maxY } = getWardrobeShelfDragBounds(shelves, shelfId, depthMm, ceilingHeight, grid.productID);

            // Округление до целых мм — minY/maxY считаются с тригонометрией
            // (наклонная полка) и почти всегда дробные, positionY должен
            // оставаться целым для MainInput ("Положение по Y" в
            // WardrobeFillingsView.vue), см. чат.
            shelf.positionY = Math.round(Math.min(Math.max(value, minY), maxY));
            this.scope.reset(grid);
        }, 500);
    }

    // "Вставка" — добавляет count полок заданного типа/вида в секцию
    // (WardrobeInsertView.vue); единственный способ получить полку, новые
    // секции создаются пустыми. При material==='glass' colorId не ставится
    // (материал для стекла не выбирается), иначе берётся явный colorId из
    // панели, а без него — первый доступный из каталога.
    //
    // Условия: (1) полка не накладывается на уже установленные; (2) зазор
    // между двумя ПРЯМЫМИ полками — WARDROBE_SHELF_MIN_GAP_FLAT (52мм);
    // (3-5) наклонная занимает по вертикали больше (проекция повёрнутого
    // прямоугольника) и требует большего зазора от ЛЮБОГО соседа
    // (findFreeWardrobeShelfPositionY/getWardrobeShelfMinGap); (6) установка
    // ограничена "монтажной" высотой секции — МИНИМУМОМ высот двух её
    // профилей, а не section.height/grid.height (те равны МАКСИМУМУ по всем
    // профилям модуля, см. getWardrobeSectionInstallableHeight). Если места
    // нет — вызов прерывается предупреждением, уже добавленные остаются.
    addWardrobeShelf(
        grid: GridModule,
        secIndex: number,
        shelfType: 'flat' | 'angled',
        material: 'ldsp' | 'glass' = 'ldsp',
        count: number = 1,
        reset: boolean = true,
        colorId?: number,
    ) {
        const section = grid.sections[secIndex];
        if (!section) return;

        if (!section.wardrobeFilling) section.wardrobeFilling = [];
        const shelves = section.wardrobeFilling;

        const resolvedColorId = material === 'ldsp'
            ? (colorId ?? getWardrobeShelfColorOptions(grid.productID, WARDROBE_SHELF_PRODUCT_ID)[0]?.id)
            : undefined;

        // Полки крепятся к ЦЕНТРУ профиля, не к переднему краю корпуса —
        // поэтому их длина считается от ТЕКУЩЕЙ grid.depth плюс запас
        // крепления (getWardrobeShelfDepth), а не от grid.depth напрямую и
        // не от потолка getWardrobeProfileMaxDepth (тот не реагирует на
        // правку самого поля "Глубина" — баг, найден пользователем).
        const depthMm = getWardrobeShelfDepth(grid);
        const ceilingHeight = getWardrobeSectionInstallableHeight(grid, secIndex);

        for (let i = 0; i < count; i++) {
            const positionY = findFreeWardrobeShelfPositionY(shelves, { type: 'shelf', shelfType, colorId: resolvedColorId, material }, depthMm, ceilingHeight, grid.productID);

            if (positionY === null) {
                this.scope.callAlert("warning", "В секторе не осталось места для новой полки!");
                break;
            }

            const newId = shelves.reduce((max, s) => Math.max(max, s.id), 0) + 1;

            shelves.push({
                id: newId,
                productId: WARDROBE_SHELF_PRODUCT_ID,
                type: 'shelf',
                shelfType,
                material,
                colorId: resolvedColorId,
                positionY,
            });
        }

        if (reset) this.scope.reset(grid);
    }

    // "Вставка" — кнопка "Применить ко всем" рядом с выбором материала
    // устанавливаемых полок: применяет colorId ко ВСЕМ уже установленным
    // ЛДСП-полкам модуля (во всех секциях, не только в выбранной) — полки
    // material==='glass' не трогает (материал для стекла не выбирается).
    applyMaterialToAllShelves(grid: GridModule, colorId: number, reset: boolean = true) {
        grid.sections.forEach((section) => {
            section.wardrobeFilling?.forEach((shelf) => {
                if (shelf.material === 'ldsp') shelf.colorId = colorId;
            });
        });

        if (reset) this.scope.reset(grid);
    }

    // "Конфигурация" — удаляет уже установленную полку.
    deleteWardrobeShelf(grid: GridModule, secIndex: number, shelfId: number, reset: boolean = true) {
        const shelves = grid.sections[secIndex]?.wardrobeFilling;
        if (!shelves) return;

        const index = shelves.findIndex((s) => s.id === shelfId);
        if (index === -1) return;

        shelves.splice(index, 1);

        if (reset) this.scope.reset(grid);
    }

}
