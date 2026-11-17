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
import { getWardrobeShelfDepth, getWardrobeFillingWidth } from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { cloneUMData } from "@/components/UMconstructor/editor-v2/session/cloneUMData.ts";
import { getCabinetWidth, getCabinetHeight, getCabinetThickness, removeExcludedCabinetOptions } from "../CabinetSystem.ts";
import { getCabinetProduct } from "../cabinetProduct.ts";

// Что сборка дописывает в CONFIG и что из этого нужно снаружи:
// - SECTIONS — наполнение секций: его заполняют ModulegridParser (из сетки) и
//   AdjacencyCalculator (ADDITIVES); basketMapper читает SECTIONSFILLING{n}
//   именно из CONFIG.SECTIONS[n].fillings, как у УМ на сцене;
// - TOPFASADECOLOR — габариты накладки на крышку (width/depth/thickness), их
//   считает BuildProduct.applyBodyOverrides по толщине материала и размеру
//   модуля, кроме ширины и глубины: их задаёт buildFromConfig по секции и
//   глубине системы (CONFIG.TOPFASADE_WIDTH / TOPFASADE_DEPTH); в корзину
//   TOPFASADECOLOR уходит как есть, и без них накладка приезжает без размеров
//   (в отличие от обычного УМ).
const BUILDER_FILLED_CONFIG_KEYS = ['SECTIONS', 'TOPFASADECOLOR'] as const

export class CabinetMeshBuilder {
    private builder: any

    constructor(builder: any) {
        this.builder = builder
    }

    build(props: any, item: any, sectionWidth: number): THREE.Object3D | null {
        if (item.cabinet?.config?.MODULEGRID) {
            try {
                const mesh = this.buildFromConfig(props, item, sectionWidth)
                if (mesh) return mesh
            } catch (error) {
                console.error(`Тумбочка ${item.id}: ошибка сборки УМ, запасной корпус (наполнения и фасадов не будет)`, error)
            }
        } else {
            console.warn(`Тумбочка ${item.id}: нет конфига УМ, запасной корпус`, item.cabinet)
        }
        return this.buildCarcass(props, item, sectionWidth)
    }

    // PROPS собирается заново на каждую сборку из копии конфига: сборщик пишет в
    // PROPS/CONFIG (FASADE, FASADE_POSITIONS, SIZE_OFFSET...), а конфиг тумбочки —
    // источник для её редактора.
    private buildFromConfig(props: any, item: any, sectionWidth: number): THREE.Object3D | null {
        const umBuilder = this.builder.root?._universalGeometryBuilder?.buildProduct
        if (!umBuilder) {
            console.warn('Тумбочка: сборщик УМ недоступен')
            return null
        }

        const cabinetProps = umBuilder.createStartProps(toRaw(getCabinetProduct(item.productId)))
        cabinetProps.CONFIG = cloneUMData(item.cabinet.config)
        // Конфиги, сохранённые до исключения опций (опоры и т.п.).
        removeExcludedCabinetOptions(cabinetProps.CONFIG)
        // Накладная крышка идёт по ширине СЕКЦИИ, а не корпуса: зазор от профилей
        // тот же, что у полки, т.е. накладка свисает над корпусом с обеих сторон.
        // Глубина — ровно в глубину системы (вместо формулы УМ от корпуса):
        // корпус уже уменьшен на свес крышки и фасад, см. cabinet/cabinetDepth.ts.
        // Оба поля подставляет BuildProduct.applyBodyOverrides.
        cabinetProps.CONFIG.TOPFASADE_WIDTH = getWardrobeFillingWidth(sectionWidth, 'shelf')
        cabinetProps.CONFIG.TOPFASADE_DEPTH = this.getDepth(props)

        const holder = new THREE.Object3D()
        holder.userData.PROPS = cabinetProps
        const body = umBuilder.createProductBody(holder)
        if (!body) {
            console.warn('Тумбочка: сборщик УМ не вернул тело (нет модели корпуса?)', cabinetProps.CONFIG?.MODELID)
            return null
        }

        // Сколько наполнения разобрано из сетки: пусто при непустой сетке —
        // наполнения не будет и в 3D, и в корзине (оба читают CONFIG.SECTIONS).
        const parsedFillings = Object.values(cabinetProps.CONFIG.SECTIONS ?? {})
            .reduce((sum: number, section: any) => sum + (section.fillings?.length ?? 0), 0)
        if (!parsedFillings) console.warn('Тумбочка: в разобранном конфиге нет наполнения', cabinetProps.CONFIG.MODULEGRID)

        // Стрелки размеров — у объекта сцены, не у тумбочки внутри гардеробной.
        cabinetProps.ARROWS?.removeFromParent()

        // Поля, которые ЗАПОЛНЯЕТ сама сборка, пишутся обратно в конфиг
        // тумбочки: она идёт на КОПИИ конфига, поэтому у товара на сцене эти
        // данные оказываются в живом CONFIG сами собой, а у тумбочки — только
        // отсюда. Без них корзина получает неполный модуль (см.
        // BUILDER_FILLED_CONFIG_KEYS). Копией — чтобы данные тумбочки не делили
        // объекты с props этой сборки.
        if (item.cabinet?.config) {
            BUILDER_FILLED_CONFIG_KEYS.forEach((key) => {
                if (cabinetProps.CONFIG[key] === undefined) return
                item.cabinet.config[key] = cloneUMData(cabinetProps.CONFIG[key])
            })
        }

        // Положение по измеренному габариту КОРПУСА (PROPS.BODY — его пишет
        // createBody): начало координат модели УМ не обязано совпадать с её
        // центром/низом, а фасады и наполнение выступают за корпус и не должны
        // сдвигать тумбочку.
        body.updateWorldMatrix(true, true)
        const box = new THREE.Box3().setFromObject(cabinetProps.BODY ?? body)
        if (box.isEmpty()) {
            console.warn('Тумбочка: пустой габарит собранного корпуса')
            return null
        }
        const center = box.getCenter(new THREE.Vector3())
        // По глубине СИСТЕМЫ, а не корпуса: корпус мельче на свес крышки и
        // фасад (cabinet/cabinetDepth.ts), и эти миллиметры должны уйти в
        // перед, а не развести тумбочку с полками по задней грани.
        const depth = this.getDepth(props) || box.max.z - box.min.z
        const floorY = -props.CONFIG.SIZE.height / 2

        body.position.x -= center.x
        body.position.y += floorY + item.positionY - box.min.y
        // Задняя грань корпуса (и накладки — у неё та же задняя плоскость) —
        // на -D/2, фасад выступает вперёд на свою толщину.
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
