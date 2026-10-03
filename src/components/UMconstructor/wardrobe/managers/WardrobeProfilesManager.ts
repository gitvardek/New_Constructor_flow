//@ts-nocheck

// ==== Гардеробная система (WARDROBE) ====
// Профили: высота, тип профиля (товар _WARDROBE_SYSTEM[...].profile),
// крепление (_WARDROBE_SYSTEM[...].fastenings), цвет. Вынесено из
// ProfilesManager.ts, где лежало рядом с боковым hi-tech профилем box-UM —
// это разные сущности, общего кода нет. Точка входа —
// scope.WARDROBE.profiles.
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import { getWardrobeProfileMaterials, getWardrobeProfileHeightRange } from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";

export default class WardrobeProfilesManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    // Настройки профиля из вкладки "Секции" → "Настройка профилей"
    // (WardrobeProfilesView.vue).
    private findWardrobeProfile(grid: GridModule, profileId: number) {
        return grid.wardrobeProfiles?.find((p) => p.id === profileId);
    }

    // "Тип профиля" — какой товар-профиль используется (_WARDROBE_SYSTEM[...].
    // profile[profileProductId]) — сегодня в каталоге один товар, но их может
    // стать больше (уточнение пользователя). У каждого товара-профиля СВОЙ
    // список цветов — при смене типа, если текущий colorId не входит в новый
    // список, сбрасываем на первый доступный (тот же принцип, что у
    // WardrobeShelvesManager.updateWardrobeShelfMaterial для полок).
    updateWardrobeProfileType(grid: GridModule, profileId: number, profileProductId: number) {
        const profile = this.findWardrobeProfile(grid, profileId);
        if (!profile) return;

        profile.profileProductId = profileProductId;

        const availableColors = getWardrobeProfileMaterials(grid.productID, profileProductId);
        if (!availableColors.some((c) => c.ID === profile.colorId)) {
            profile.colorId = availableColors[0]?.ID;
        }

        this.scope.reset(grid);
    }

    // "Крепление профиля" (переименовано с "Тип профиля" — раньше был
    // захардкоженный список Потолок/Стена, теперь читается из каталога
    // _WARDROBE_SYSTEM[...].fastenings, см. уточнение пользователя). Меняет
    // допустимый диапазон высоты (getWardrobeProfileHeightRange) — клампим
    // текущую height в новый диапазон, чтобы не остаться с недопустимым
    // значением после смены крепления.
    updateWardrobeProfileFastening(grid: GridModule, profileId: number, fasteningId: number) {
        const profile = this.findWardrobeProfile(grid, profileId);
        if (!profile) return;

        profile.fasteningId = fasteningId;

        const range = getWardrobeProfileHeightRange(grid.productID, fasteningId);
        profile.height = Math.min(Math.max(profile.height, range.min), range.max);

        this.scope.reset(grid);
    }

    // Поле "Высота" в "Размеры модуля" (ModuleSizeView.vue) — общее с box-UM,
    // зовётся из UMconstructorClass.updateTotalHeight(). Для гардеробной
    // системы правки этого поля раньше не сохранялись: reset() тут же
    // пересчитывал grid.height как максимум по wardrobeProfiles.
    //
    // Правило синхронизации: растут/сжимаются только профили, которые СЕЙЧАС
    // на максимуме (их может быть несколько, не "первый найденный"); ставшие
    // выше нового значения подрезаются до него; те, что и так ниже (короткий
    // "пол-стена" рядом с "пол-потолок"), не трогаются — физический смысл
    // разных креплений сохраняется. Каждый профиль клампится в СВОЙ диапазон
    // (getWardrobeProfileHeightRange по его fasteningId), поэтому итоговая
    // высота модуля может отличаться от введённой — предупреждаем алертом.
    applyModuleHeightToProfiles(grid: GridModule, value: number) {
        const profiles = grid.wardrobeProfiles;
        if (!profiles?.length) return;

        const oldMax = Math.max(...profiles.map((p) => p.height || 0));

        profiles.forEach((profile) => {
            const isAtMax = profile.height === oldMax;
            const isOverflowing = profile.height > value;
            if (!isAtMax && !isOverflowing) return;

            const range = getWardrobeProfileHeightRange(grid.productID, profile.fasteningId);
            profile.height = Math.min(Math.max(value, range.min), range.max);
        });

        const newMax = Math.max(...profiles.map((p) => p.height || 0));
        if (newMax !== value) {
            this.scope.callAlert("warning", `Высота модуля установлена как ${newMax}мм — не все профили допускают ${value}мм`);
        }

        this.scope.reset(grid);
    }

    updateWardrobeProfileColor(grid: GridModule, profileId: number, colorId: number) {
        const profile = this.findWardrobeProfile(grid, profileId);
        if (!profile) return;

        profile.colorId = colorId;
        this.scope.reset(grid);
    }

    // Высота — мм, влияет на GridModule.height целиком (см. UMconstructorClass.
    // reset() — высота модуля = максимум по всем профилям). Клампится в
    // диапазон текущего крепления (getWardrobeProfileHeightRange). Дебаунс —
    // тот же паттерн, что и у WardrobeShelvesManager.updateWardrobeShelfPositionY
    // (частый ввод через числовой инпут).
    updateWardrobeProfileHeight(grid: GridModule, profileId: number, value: number) {
        this.scope.debounce("updateWardrobeProfileHeight", () => {
            const profile = this.findWardrobeProfile(grid, profileId);
            if (!profile) return;

            const range = getWardrobeProfileHeightRange(grid.productID, profile.fasteningId);
            profile.height = Math.min(Math.max(value, range.min), range.max);
            this.scope.reset(grid);
        }, 500);
    }

}
