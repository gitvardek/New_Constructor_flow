//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import * as THREE from "three";
import {GridModule, GridSection, LOOPSIDE} from "@/components/UMconstructor/types/UMtypes.ts";

type TProfileSide = "left" | "right"

// Петли у левой и у правой стенки секции
const LEFT_LOOPS = [LOOPSIDE.left, LOOPSIDE.left_on_partition]
const RIGHT_LOOPS = [LOOPSIDE.right, LOOPSIDE.right_on_partition]

export default class ProfilesManager {
    scope: UMconstructorClass

    constructor(scope: UMconstructorClass) {
        this.scope = scope
    }

    // Стоят ли у секции петли с указанной стороны. Фасады ящиков и сегменты разделённого
    // фасада без материала пропускаем — петель у них нет (то же правило, что в calcLoops)
    hasLoopsOnSide(section: GridSection, sideLoops: number[]): boolean {
        const { NO_FASADE_ID } = this.scope.CONST

        return (section?.fasades ?? []).some(door => door?.some(fasade => {
            const color = fasade?.material?.COLOR
            const hasMaterial = !!color && +color !== NO_FASADE_ID

            if (fasade.manufacturerOffset || (fasade.splitGroup && !hasMaterial)) {
                return false
            }

            return sideLoops.includes(+fasade.loopsSide)
        }))
    }

    // Стенки модуля, к которым не прижаты петли. Профиль прилегает только к крайним
    // секциям, поэтому левую стенку занимают петли первой секции, правую — последней.
    // У односекционного модуля это одна и та же секция
    getFreeSides(grid: GridModule): { left: boolean, right: boolean } {
        const sections = grid?.sections ?? []

        return {
            left: !this.hasLoopsOnSide(sections[0], LEFT_LOOPS),
            right: !this.hasLoopsOnSide(sections[sections.length - 1], RIGHT_LOOPS),
        }
    }

    // Выбрать сторону вручную можно, только пока петли не заняли ни одну из стенок
    isSideSelectable(grid: GridModule): boolean {
        const free = this.getFreeSides(grid)
        return free.left && free.right
    }

    // Сторона профиля — противоположная петлям. Свободны обе стенки — берём выбор
    // пользователя, по умолчанию левую. null — заняты обе, профилю встать некуда
    resolveProfileSide(grid: GridModule): TProfileSide | null {
        const free = this.getFreeSides(grid)

        if (free.left && free.right) {
            return grid.profilesConfig?.sideProfile?.manualSide ?? "left"
        }
        if (free.left) {
            return "left"
        }
        if (free.right) {
            return "right"
        }
        return null
    }

    // Ставит профиль к стенке. side — сторона самого профиля, в этом же смысле она уходит
    // на бек (SIDE). Позицию считаем заново: она зависит от ширины модуля и размеров профиля
    applyProfileSide(side: TProfileSide, grid: GridModule = this.scope.UM_STORE.getUMGrid()) {
        const profile = grid?.profilesConfig?.sideProfile

        if (!profile) {
            return
        }

        const offset = profile.manufacturerOffset + profile.size.y / 2

        const profileSidesMap = {
            "left": new THREE.Vector2(-offset, 0),
            "right": new THREE.Vector2(grid.width + offset, 0),
        }
        const profileRotationMap = {
            "left": Math.PI / 2,
            "right": -Math.PI / 2,
        }

        profile.side = side
        profile.position = profileSidesMap[side]
        profile.rotation = new THREE.Vector3(0, 0, profileRotationMap[side])
    }

    // Ручной выбор стороны из панели цвета профилей
    setManualSide(side: TProfileSide, grid: GridModule = this.scope.UM_STORE.getUMGrid()) {
        const profile = grid?.profilesConfig?.sideProfile

        if (!profile || !this.isSideSelectable(grid)) {
            return
        }

        profile.manualSide = side
        this.applyProfileSide(side, grid)
    }

    // Можно ли сменить петли секции, не оставив профиль без стенки. Смена стороны
    // открывания применяется ко всей секции, поэтому крайнюю секцию оцениваем по новой
    // стороне целиком
    canApplyLoopside(secIndex: number, newSide: number, grid: GridModule = this.scope.UM_STORE.getUMGrid()): boolean {
        if (!grid?.profilesConfig?.sideProfile) {
            return true
        }

        const free = this.getFreeSides(grid)

        if (secIndex === 0) {
            free.left = !LEFT_LOOPS.includes(+newSide)
        }
        if (secIndex === grid.sections.length - 1) {
            free.right = !RIGHT_LOOPS.includes(+newSide)
        }

        if (free.left || free.right) {
            return true
        }

        this.scope.callAlert("error", "Нельзя сменить сторону открывания: петли встанут у обеих боковых стенок, и боковому профилю не останется места")
        return false
    }

    // Пересчёт после изменения сетки — вызывается из reset, когда петли уже пересчитаны.
    // Петли могли занять обе стенки (снята опция «Без петель», удалена или добавлена
    // секция, calcLoops развёл петли на перегородке) — такой профиль собрать нельзя, снимаем его
    updateSideProfile(grid: GridModule = this.scope.UM_STORE.getUMGrid()) {
        if (!grid?.profilesConfig?.sideProfile) {
            return
        }

        const side = this.resolveProfileSide(grid)

        if (!side) {
            delete grid.profilesConfig.sideProfile
            this.scope.UM_STORE.onSideProfile = false
            this.scope.callAlert("error", "Боковой профиль снят: петли крайних секций стоят у обеих боковых стенок")
            return
        }

        this.applyProfileSide(side, grid)
    }
}
