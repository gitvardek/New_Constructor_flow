// @ts-nocheck

// Гардеробная система (WARDROBE), см. WardrobeGridParser.ts.
// Продукто-специфичный аналог FillingMeshBuilder: превращает разобранную
// сетку в THREE-меши. Профили строит сам — процедурными боксами, БЕЗ
// WARDROBE_MODEL_DATA/json_builder (та модель описывала ровно 2 хардкод-
// профиля и на N не годится). Полки и штанги делегирует в ShelfBuilder.
//
// ShelfBuilder строит их в ЛОКАЛЬНЫХ координатах СЕКТОРА (X=0 — его центр,
// Y уже абсолютный, от пола модуля), поэтому здесь остаётся только сдвинуть
// готовый меш на sectionCenterX из парсера.

import * as THREE from 'three'
import { WARDROBE_PROFILE_WIDTH, WARDROBE_PROFILE_DEPTH } from "@/Application/F-wardrobeData.ts";
import { ParsedWardrobeGrid } from "./WardrobeGridParser";

// Материал профиля: тот же "металлический" рецепт, что у
// TsargaBuilder.createFillingTsarga (царга — тоже металлический профиль).
// Цвет из _COLOR[colorId] — того же каталога, что читает "Настройка
// профилей" в 2D; при наличии TEXTURE она накладывается через
// builder.getTexture (общий helper для textureUrl по всему проекту), иначе
// сплошной 0xaaaaaa. MeshPhysicalMaterial, а не MeshLambertMaterial, как
// было изначально — тот шёл плоским, без блеска и без реального цвета.
//
// Экспортирована, а не приватный метод: крепёжную пластину "пол-стена"
// (LegBuilder.createWardrobeWallBracket) нужно красить ТЕМ ЖЕ материалом —
// она физически продолжение профиля. Общая функция вместо двух копий.
export function createWardrobeMetalMaterial(builder: any, colorId: number | undefined, defColor:boolean = false): THREE.MeshPhysicalMaterial {
    const color = colorId != null ? builder._COLOR[colorId] : null
    const material = new THREE.MeshPhysicalMaterial({
        color: color?.TEXTURE ? 0xffffff : 0xaaaaaa,
        metalness: 0.9,
        roughness: 0.4,
        clearcoat: 0.3,
        clearcoatRoughness: 0.1,
    })
    if (color?.TEXTURE && !defColor) {
        builder.getTexture({ material, url: color.TEXTURE })
    }
    return material
}

export class WardrobeFillingMeshBuilder {
    private builder: any

    constructor(builder: any) {
        this.builder = builder
    }

    // Профили — процедурные боксы (не через каталожную 3D-модель, см.
    // комментарий выше файла). Материал — см. createWardrobeMetalMaterial
    // выше в этом файле.
    buildProfiles(props: any, parsed: ParsedWardrobeGrid): THREE.Object3D | null {
        if (!parsed.profiles.length) return null

        const group = new THREE.Object3D()
        // floorY = -height/2: геометрия ЦЕНТРИРОВАНА относительно Y=0, так
        // требует комнатное позиционирование — разбор в
        // ShelfBuilder.buildWardrobeShelf.
        const floorY = -props.CONFIG.SIZE.height / 2

        parsed.profiles.forEach((profile, index) => {
            const geometry = new THREE.BoxGeometry(WARDROBE_PROFILE_WIDTH, Math.max(profile.height, 1), WARDROBE_PROFILE_DEPTH)
            const material = createWardrobeMetalMaterial(this.builder, profile.colorId)

            const mesh = new THREE.Mesh(geometry, material)
            mesh.castShadow = true
            mesh.receiveShadow = true

            mesh.position.set(profile.x, floorY + profile.height / 2, profile.z)
            mesh.name = `WARDROBE_PROFILE_${index}`

            group.add(mesh, this.builder.edge_builder.createEdge(mesh))
        })

        group.name = 'WARDROBE_PROFILES'
        return group
    }

    // Полки и штанги — делегирует геометрию ShelfBuilder'у (уже умеет
    // толщину/материал/наклон), здесь только абсолютный X сектора.
    buildShelves(props: any, parsed: ParsedWardrobeGrid): THREE.Object3D | null {
        if (!parsed.shelves.length) return null

        const group = new THREE.Object3D()
        const shelfBuilder = this.builder.shelf_builder

        parsed.shelves.forEach((shelf) => {
            let mesh: THREE.Object3D | null = null

            // Цвет ЛЕВОГО профиля сектора — для кронштейнов полки: они
            // крепятся к профилю и должны быть его материала, а не доски.
            // Сектор i ограничивают profiles[i] и profiles[i+1]; берём левый —
            // если цвета разойдутся, оба кронштейна одной полки логичнее
            // оставить одинаковыми.
            const profileColorId = parsed.profiles[shelf.sectionIndex]?.colorId

            if (shelf.kind === 'rail') {
                mesh = shelfBuilder.buildWardrobeRail(props, shelf.sectionWidth, shelf.positionY, shelf.railHeight)
            } else if (shelf.type === 'angled') {
                mesh = shelfBuilder.buildWardrobeAngledShelf(props, shelf.productId, shelf.sectionWidth, shelf.positionY, shelf.colorId, shelf.material, profileColorId)
            } else {
                mesh = shelfBuilder.buildWardrobeShelf(props, shelf.productId, shelf.sectionWidth, shelf.positionY, shelf.colorId, shelf.material, profileColorId)
            }

            if (!mesh) return

            mesh.position.x += shelf.sectionCenterX
            mesh.name = `${mesh.name}_${shelf.id}`
            group.add(mesh)
        })

        group.name = 'WARDROBE_FILLINGS'
        return group
    }
}
