// Логика, специфичная для Hi-Tech профилей. Вынесено из FillingsManager.ts
// (Фаза 1d рефакторинга, см. C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md).
//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import FillingsCore from "./FillingsCore.ts";
import { GridModule, GridSection, FillingObject } from "@/components/UMconstructor/types/UMtypes.ts";

export default class ProfileFillingHandler {
    scope: UMconstructorClass
    core: FillingsCore

    constructor(scope: UMconstructorClass, core: FillingsCore) {
        this.scope = scope
        this.core = core
    }

    // Проверки перед размещением профиля. true — можно продолжать размещение.
    validatePlacement(
        isHiTechProfile: boolean,
        isBottomHiTechProfile: boolean,
        grid: GridModule,
        row: number | null,
        extra: number | null,
    ): boolean {
        if (isBottomHiTechProfile && !this.scope.UM_STORE.onWallModule) {
            this.scope.callAlert("error", "Г-образный профиль доступен только для навесного модуля")
            return false;
        }

        if (isHiTechProfile) {
            if (grid.profilesConfig?.sideProfile) {
                this.scope.callAlert("error", "Нельзя добавить горизонтальный профиль вместе с боковым!")
                return false;
            }
            if (row || extra) {
                this.scope.callAlert("error", "Нельзя установить профиль в вертикальный разделитель!")
                return false;
            }
        }
        return true
    }

    // Считает ширину/высоту профиля и заполняет profileData (цвет, тип C/L, смещения
    // производителя). Может подвинуть startFillingData.x/.y и завести grid.profilesConfig
    // при первом профиле в модуле — мутирует переданные объекты, как и исходный код.
    computeProfileGeometry(
        product: any,
        isBottomHiTechProfile: boolean,
        grid: GridModule,
        PROPS: any,
        startFillingData: any,
        currentSection: GridSection,
        initialWidth: number,
    ): { width: number, height: number, profileData: any } {
        let profileData: any = {}

        if (!grid.profilesConfig) {
            grid.profilesConfig = { COLOR: product.COLOR[0] != null ? product.COLOR[0] : grid.moduleColor }
            grid.profilesConfig.colorsList = [...product.COLOR]
            grid.profilesConfig.onSectionSize = false

            PROPS.CONFIG['PROFILECOLOR'] = grid.profilesConfig.COLOR
        }

        let height = product.height || grid.moduleThickness
        let width = initialWidth
        if (!isBottomHiTechProfile && !this.scope.APP.PRODUCTS_TYPES[product.productType]?.CODE.includes("section")) {
            width = grid.profilesConfig.onSectionSize ? startFillingData.width : startFillingData.width + grid.moduleThickness * 2

            if (!grid.profilesConfig.onSectionSize) {
                width = startFillingData.width + grid.moduleThickness * 2
                startFillingData.x -= grid.moduleThickness
            } else {
                width = startFillingData.width
            }
        }

        profileData.COLOR = grid.profilesConfig?.COLOR ? grid.profilesConfig?.COLOR : grid.moduleColor

        let typeProfile = product.NAME.toLowerCase().split("-")[0].replace(/\s/g, '')
        if (typeProfile !== "c" && typeProfile !== "l")
            typeProfile = typeProfile.split(",").pop().replace(/\s/g, '')

        profileData.TYPE_PROFILE = typeProfile
        profileData.offsetFasades = typeProfile == "c" ? 36 : typeProfile == "l" ? 38 : 0
        profileData.manufacturerOffset = typeProfile == "c" ? -18.5 : typeProfile == "l" ? -19.5 : 0

        if (isBottomHiTechProfile) {
            profileData.isBottomHiTechProfile = true
            startFillingData.y = grid.height - grid.horizont - height
        }

        if (!currentSection.hiTechProfiles)
            currentSection.hiTechProfiles = []

        profileData.id = currentSection.hiTechProfiles.length + 1

        return { width, height, profileData }
    }

    // Регистрирует готовый fillingObject как профиль: помечает isProfile, кладёт
    // в section.hiTechProfiles и в общий массив наполнения, пересчитывает фасады.
    finalizeProfile(
        fillingObject: FillingObject,
        profileData: any,
        sec: number,
        currentSection: GridSection,
        currentFillingsArray: FillingObject[],
        grid: GridModule,
    ): void {
        fillingObject.isProfile = profileData
        fillingObject.moduleThickness = grid.moduleThickness
        currentSection.hiTechProfiles.push(fillingObject)
        currentFillingsArray.push(fillingObject);

        this.scope.FASADES.EXTERNAL_FASADES.calcDrawersFasades(sec, false, grid)
        this.scope.callAlert('warning', 'Проверьте корректность рассчитанной позиции профиля!')
    }

    // Ренумерация section.hiTechProfiles при удалении профиля (вызывается из FillingsManager.deleteFilling)
    beforeDeleteProfile(curItemProfile: any, sec: GridSection): void {
        sec.hiTechProfiles = sec.hiTechProfiles.filter((el) => {
            return el.isProfile.id !== curItemProfile.isProfile.id;
        });
    }
}
