//@ts-nocheck

// ==== Гардеробная система (WARDROBE) ====
// Единственная точка входа в гардеробную систему со стороны box-UM:
// UMconstructorClass держит её как this.WARDROBE, и все ветки
// `moduleKind === 'wardrobe'` сводятся к одному вызову отсюда.
//
// Гардеробная и box-UM не пересекаются по данным (у гардеробной сетки нет
// cells/rows/фасадов/царги, у box-UM нет профилей/полок-на-профилях), поэтому
// это не «ещё один менеджер сущности» рядом с FASADES/FILLINGS/SECTIONS, а
// отдельное поддерево: см. wardrobe/managers, wardrobe/render, wardrobe/views.
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import WardrobeSectionsManager from "./managers/WardrobeSectionsManager.ts";
import WardrobeShelvesManager from "./managers/WardrobeShelvesManager.ts";
import WardrobeProfilesManager from "./managers/WardrobeProfilesManager.ts";
import RailsManager from "./managers/RailsManager.ts";
import WardrobeGridReset from "./managers/WardrobeGridReset.ts";
import CabinetManager from "@/components/UMconstructor/cabinet/CabinetManager.ts";

export default class WardrobeModule {
    scope: UMconstructorClass
    sections: WardrobeSectionsManager
    shelves: WardrobeShelvesManager
    profiles: WardrobeProfilesManager
    rails: RailsManager
    // Универсальная тумбочка — components/UMconstructor/cabinet.
    cabinets: CabinetManager
    private gridReset: WardrobeGridReset

    constructor(scope: UMconstructorClass) {
        this.scope = scope
        this.sections = new WardrobeSectionsManager(scope)
        this.shelves = new WardrobeShelvesManager(scope)
        this.profiles = new WardrobeProfilesManager(scope)
        this.rails = new RailsManager(scope)
        this.cabinets = new CabinetManager(scope)
        this.gridReset = new WardrobeGridReset(scope)
    }

    // Выбор ПРОФИЛЯ (уточнение пользователя: клик по профилю в
    // WardrobeProfilesView.vue "Настройка профилей" выделяет его на канвасе, и
    // наоборот) — тот же общий вход, что и box-UM scope.selectCell, но
    // отдельный канал (UM_STORE.selectedWardrobeProfileId), см.
    // SelectionHighlighter.selectWardrobeProfile.
    selectProfile(profileId: number | null) {
        this.scope.UM_STORE.selectedWardrobeProfileId = profileId
        const render = this.scope.RENDER_REF?.value ?? this.scope.RENDER_REF
        render?.selectWardrobeProfile(profileId)
    }

    // Точный ввод ширины ОДНОЙ секции (WardrobeSectionsView.vue) — тонкая
    // debounce-обёртка над sections.updateWardrobeSectorWidth. Свежий grid
    // читается ВНУТРИ колбэка (не в момент вызова), ключ debounce свой на
    // КАЖДУЮ секцию — иначе правка одной отменяла бы отложенную правку другой.
    updateSectorWidth(secIndex: number, value: number) {
        this.scope.debounce(`wardrobeSectorWidth-${secIndex}`, () => {
            const grid = this.scope.UM_STORE.getUMGrid()
            this.sections.updateWardrobeSectorWidth(grid, secIndex, parseInt(value))
        }, 500)
    }

    reset(grid: GridModule) {
        return this.gridReset.reset(grid)
    }
}
