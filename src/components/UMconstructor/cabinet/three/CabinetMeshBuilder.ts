// @ts-nocheck

// ==== Универсальная тумбочка (CABINET) — 3D ====
// Тумбочка с конфигом УМ (item.cabinet.config) строится сборщиком УМ —
// BuildUniversalModule, тем же, что УМ на сцене: корпус, фасады, секции, полки
// из редактора тумбочки. Без конфига (не прошла пересчёт гардеробной,
// cabinet/session/syncCabinetConfig.ts) или при ошибке сборки — запасной
// процедурный корпус из боксов.
//
// Координаты — как у полок в ShelfBuilder: X=0 — центр секции (сдвиг на
// sectionCenterX делает WardrobeFillingMeshBuilder), Y от floorY=-SIZE.height/2,
// Z=0 — ось профиля, +Z — перед; глубина корпуса [-D/2, D/2], как у полок.

import * as THREE from "three";
import { toRaw } from "vue";
import { getWardrobeShelfDepth } from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { cloneUMData } from "@/components/UMconstructor/editor-v2/session/cloneUMData.ts";
import { getCabinetWidth, getCabinetHeight, getCabinetThickness, removeExcludedCabinetOptions } from "../CabinetSystem.ts";
import { getCabinetProduct } from "../cabinetProduct.ts";

export class CabinetMeshBuilder {
    private builder: any

    constructor(builder: any) {
        this.builder = builder
    }

    build(props: any, item: any, sectionWidth: number): THREE.Object3D | null {
        if (item.cabinet?.config?.MODULEGRID) {
            try {
                const mesh = this.buildFromConfig(props, item)
                if (mesh) return mesh
            } catch (error) {
                console.error("Тумбочка: ошибка сборки УМ, запасной корпус", error)
            }
        }
        return this.buildCarcass(props, item, sectionWidth)
    }

    // PROPS собирается заново на каждую сборку из копии конфига: сборщик пишет в
    // PROPS/CONFIG (FASADE, FASADE_POSITIONS, SIZE_OFFSET...), а конфиг тумбочки —
    // источник для её редактора.
    private buildFromConfig(props: any, item: any): THREE.Object3D | null {
        const umBuilder = this.builder.root?._universalGeometryBuilder?.buildProduct
        if (!umBuilder) return null

        const cabinetProps = umBuilder.createStartProps(toRaw(getCabinetProduct(item.productId)))
        cabinetProps.CONFIG = cloneUMData(item.cabinet.config)
        // Конфиги, сохранённые до исключения опций (опоры и т.п.).
        removeExcludedCabinetOptions(cabinetProps.CONFIG)

        const holder = new THREE.Object3D()
        holder.userData.PROPS = cabinetProps
        const body = umBuilder.createProductBody(holder)
        if (!body) return null

        // Стрелки размеров — у объекта сцены, не у тумбочки внутри гардеробной.
        cabinetProps.ARROWS?.removeFromParent()

        // Наполнение тумбочки
        if (item.cabinet?.config) {
            item.cabinet.config.SECTIONS = cloneUMData(cabinetProps.CONFIG.SECTIONS)
        }

        // Положение по измеренному габариту КОРПУСА (PROPS.BODY — его пишет
        // createBody): начало координат модели УМ не обязано совпадать с её
        // центром/низом, а фасады и наполнение выступают за корпус и не должны
        // сдвигать тумбочку.
        body.updateWorldMatrix(true, true)
        const box = new THREE.Box3().setFromObject(cabinetProps.BODY ?? body)
        if (box.isEmpty()) return null
        const center = box.getCenter(new THREE.Vector3())
        const depth = cabinetProps.CONFIG.MODULEGRID.depth || box.max.z - box.min.z
        const floorY = -props.CONFIG.SIZE.height / 2

        body.position.x -= center.x
        body.position.y += floorY + item.positionY - box.min.y
        // Задняя грань корпуса — на -D/2, фасад выступает вперёд на свою толщину.
        body.position.z += -depth / 2 - box.min.z

        const group = new THREE.Object3D()
        group.add(body)
        group.name = 'WARDROBE_CABINET'
        const size = box.getSize(new THREE.Vector3())
        group.userData.trueSizes = { BODY_WIDTH: size.x, BODY_HEIGHT: size.y, BODY_DEPTH: size.z }
        return group
    }

    private getDepth(props: any): number {
        const grid = props.CONFIG?.WARDROBEGRID
        return grid?.sections?.length ? getWardrobeShelfDepth(grid) : props.CONFIG.SIZE.depth
    }

    // Один материал на все детали: текстура _FASADE[colorId] грузится в него асинхронно.
    private createMaterial(colorId?: number): THREE.MeshStandardMaterial {
        const fasade = colorId != null ? this.builder._FASADE?.[colorId] : null
        const material = new THREE.MeshStandardMaterial({ color: fasade?.TEXTURE ? 0xffffff : 0xd8c3a5 })
        if (fasade?.TEXTURE) this.builder.getTexture({ material, url: fasade.TEXTURE })
        return material
    }

    // Запасной корпус: 2 боковины, крышка и дно между ними, задняя стенка на всю
    // ширину/высоту сзади.
    private buildCarcass(props: any, item: any, sectionWidth: number): THREE.Object3D | null {
        const width = getCabinetWidth(sectionWidth)
        const height = getCabinetHeight(item)
        const depth = this.getDepth(props)
        const t = getCabinetThickness(item)
        if (width <= 2 * t.side || height <= t.top + t.bottom || depth <= t.back) return null

        const bottomY = -props.CONFIG.SIZE.height / 2 + item.positionY
        // Детали корпуса стоят перед задней стенкой.
        const carcassDepth = depth - t.back
        const carcassZ = t.back / 2
        const innerWidth = width - 2 * t.side

        const material = this.createMaterial(item.cabinet?.colorId)
        const parts = [
            { name: 'SIDE_LEFT', size: [t.side, height, carcassDepth], pos: [-width / 2 + t.side / 2, bottomY + height / 2, carcassZ] },
            { name: 'SIDE_RIGHT', size: [t.side, height, carcassDepth], pos: [width / 2 - t.side / 2, bottomY + height / 2, carcassZ] },
            { name: 'TOP', size: [innerWidth, t.top, carcassDepth], pos: [0, bottomY + height - t.top / 2, carcassZ] },
            { name: 'BOTTOM', size: [innerWidth, t.bottom, carcassDepth], pos: [0, bottomY + t.bottom / 2, carcassZ] },
            { name: 'BACK', size: [width, height, t.back], pos: [0, bottomY + height / 2, -depth / 2 + t.back / 2] },
        ]

        const group = new THREE.Object3D()
        parts.forEach(({ name, size, pos }) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
            mesh.castShadow = true
            mesh.receiveShadow = true
            mesh.position.set(...pos)
            mesh.name = `WARDROBE_CABINET_${name}`

            group.add(mesh, this.builder.edge_builder.createEdge(mesh), this.builder.edge_builder.createVisibleEdge(mesh))
        })

        group.name = 'WARDROBE_CABINET'
        group.userData.trueSizes = { BODY_WIDTH: width, BODY_HEIGHT: height, BODY_DEPTH: depth }
        return group
    }
}
