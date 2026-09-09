// @ts-nocheck
import * as THREE from 'three'
import type { TBuildProduct, TRootOptionType, TTotalProps } from '@/types/types'
import { WARDROBE_LEG_HEIGHT, WARDROBE_PROFILE_WIDTH, WARDROBE_PROFILE_DEPTH } from '@/Application/F-wardrobeData.ts'
import { createWardrobeMetalMaterial } from '@/Application/Meshes/Wardrobe/WardrobeFillingMeshBuilder.ts'

type OptionData = {
    option: THREETypes.TRootOptionType,
    values: boolean
}
interface IncomeOptionData {
    data: OptionData,
    mesh: THREE.Mesh[]
    defaultMesh: THREE.Mesh[],
    disabledOptions: THREETypes.TOption[] | []
}

type LagsOptions = {
    default: number,
    withOption: number,
}

export class LegBuilder {
    private parent: TBuildProduct
    private legsGroup: THREE.Object3D | null = null
    private readonly legsIds: Record<string, LagsOptions> = {
        '1419199': {
            default: 150,
            withOption: 100,
        },
        '1419200': {
            default: 100,
            withOption: 150
        }
    }

    constructor(parent: TBuildProduct) {
        this.parent = parent
    }

    buildLegs(
        props: TTotalProps,
        model_data: any,
        group: THREE.Object3D,
        custom_leg_length?: number
    ): THREE.Object3D {


        const size = props.CONFIG.SIZE;
        const leg_length = custom_leg_length ?? this.getLegLength(props);
        const legs = new THREE.Object3D();
        const start_position = this.parent.getStartPosition(size);
        const leg_position = model_data.json.legs ?? this.getLegPositions(start_position, size, model_data);

        Object.values(leg_position as any[]).forEach((position) => {
            const leg = this.createLeg(leg_length)
            leg.position.set(
                this.parent.calculateFromString(position.x),
                this.parent.calculateFromString(position.y),
                this.parent.calculateFromString(position.z),
            )
            legs.add(leg);
        })

        legs.name = 'LEGS'
        props.LEG = legs
        this.legsGroup = legs
        return legs
    }

    // FIX: убрана мутация входного параметра start_position — теперь работаем с копией
    getLegPositions(
        start_position: any,
        size: any,
        model: any
    ) {
        const corr_x = model ? this.parent.calculateFromString(model.corr_x) : 0
        const corr_y = model ? this.parent.calculateFromString(model.corr_y) : 0
        const corr_z = model ? this.parent.calculateFromString(model.corr_z) : 0

        const x = start_position.x + corr_x
        const y = start_position.y + corr_y
        const z = start_position.z + corr_z

        const leg_position: { [key: string]: { x: number; y: number; z: number } } = {
            '1': { x: x + 70, y, z: z + 70 },
            '2': { x: x + size.width - 70, y, z: z + 70 },
            '3': { x: x + size.width - 70, y, z: z + size.depth - 70 },
            '4': { x: x + 70, y, z: z + size.depth - 70 },
        }

        if (model?.json?.sixLegs) {
            leg_position['5'] = { x: x + size.width / 2, y, z: z + 70 }
            leg_position['6'] = { x: x + size.width / 2, y, z: z + size.depth - 70 }
        }

        return leg_position
    }

    createLeg(leg_length: number): THREE.Object3D {
        const material = new THREE.MeshPhongMaterial({
            emissive: '#000000',
            color: '#000000',
            reflectivity: 0.05,
        })

        const topGeometry = new THREE.CylinderGeometry(14, 14, leg_length, 8)
        const bottomGeometry = new THREE.CylinderGeometry(25, 25, 20, 12)
        topGeometry.computeBoundingBox()
        bottomGeometry.computeBoundingBox()

        const group = new THREE.Object3D()
        const top = new THREE.Mesh(topGeometry, material)
        const bottom = new THREE.Mesh(bottomGeometry, material)

        top.castShadow = true
        bottom.castShadow = true

        top.position.setY(-(leg_length / 2))
        bottom.position.setY(-leg_length + 10)

            // Запекаем трансформации в геометрию и сбрасываем позиции
            ;[top, bottom].forEach(mesh => {
                mesh.updateMatrix()
                mesh.geometry.applyMatrix4(mesh.matrix)
                mesh.position.set(0, 0, 0)
            })

        group.add(top, bottom, this.parent.edge_builder.createEdge(top), this.parent.edge_builder.createEdge(bottom))
        return group
    }

    getLegLength(props: TTotalProps) {
        const isLengthLags = props.CONFIG.OPTIONS.find(el => this.legsIds[el.id]);

        return isLengthLags?.active ? this.legsIds[isLengthLags.id].withOption : this.parent.modelState.getModels[props.PRODUCT].leg_length;
    }

    // ==== Гардеробная система (WARDROBE) - Регулировочная ножка профиля ====
    // Высота фиксирована — WARDROBE_LEG_HEIGHT,
    // той же цифрой пользуется 2D-рендер профилей (SceneBuilder.ts).
    // ЧЕРНОВИК: форма (плита + стержень) собрана из примитивов по аналогии с
    // createLeg() выше, с реальной опорой не сверялась.
    //
    // direction: -1 — вниз от точки примыкания (нижняя опора), +1 — вверх.
    // Локально y=0 — сама точка примыкания к торцу профиля, геометрия
    // строится только в сторону direction, поэтому при позиционировании
    // ровно на торец нога не утапливается в тело профиля.
    createWardrobeLeg(direction: 1 | -1 = 1): THREE.Object3D {
        const material = new THREE.MeshPhongMaterial({
            emissive: '#000000',
            color: '#333333',
            reflectivity: 0.05,
        })

        const plateHeight = 8
        const stemHeight = WARDROBE_LEG_HEIGHT - plateHeight

        const plateGeometry = new THREE.CylinderGeometry(12, 12, plateHeight, 16)
        const stemGeometry = new THREE.CylinderGeometry(5, 5, stemHeight, 12)
        plateGeometry.computeBoundingBox()
        stemGeometry.computeBoundingBox()

        const group = new THREE.Object3D()
        const plate = new THREE.Mesh(plateGeometry, material)
        const stem = new THREE.Mesh(stemGeometry, material)

        plate.castShadow = true
        stem.castShadow = true

        // стержень примыкает к профилю (ближе к y=0), плита — на дальнем
        // конце (опорная площадка у пола/потолка)
        stem.position.setY(direction * stemHeight / 2)
        plate.position.setY(direction * (stemHeight + plateHeight / 2))

            ;[plate, stem].forEach(mesh => {
                mesh.updateMatrix()
                mesh.geometry.applyMatrix4(mesh.matrix)
                mesh.position.set(0, 0, 0)
            })

        group.add(plate, stem, this.parent.edge_builder.createEdge(plate), this.parent.edge_builder.createEdge(stem))
        return group
    }

    // ==== Гардеробная система (WARDROBE) — крепление "пол-стена" ====
    // Сверху у этого крепления нет ножки (buildWardrobeLegs, hasTopLeg=false)
    // — вместо неё пластина от верхнего торца профиля к стене:
    // X = WARDROBE_PROFILE_WIDTH (чтобы не торчала по бокам), Y = 50,
    // Z = (глубина модуля - WARDROBE_PROFILE_DEPTH) / 2. Длина не
    // произвольная: профиль занимает центральные WARDROBE_PROFILE_DEPTH мм
    // (Z от -25 до +25), и пластина дотягивается ровно до грани модуля
    // (25 + (moduleDepth-50)/2 = moduleDepth/2) — там стена.
    //
    // Локально (0,0,0) — точка примыкания к верхнему торцу профиля (как у
    // createWardrobeLeg): пластина строится ниже неё по Y и дальше по Z.
    // colorId тот же, что у профилей (createWardrobeMetalMaterial).
    //
    createWardrobeWallBracket(moduleDepth: number, colorId: number | undefined): THREE.Object3D {
        const material = createWardrobeMetalMaterial(this.parent, colorId)

        const width = WARDROBE_PROFILE_WIDTH
        const height = 50
        const length = Math.max((moduleDepth - WARDROBE_PROFILE_DEPTH) / 2, 0)

        const geometry = new THREE.BoxGeometry(width, height, length)
        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true

        mesh.position.set(0, -height / 2, -WARDROBE_PROFILE_DEPTH / 2 - length / 2)
        mesh.updateMatrix()
        mesh.geometry.applyMatrix4(mesh.matrix)
        mesh.position.set(0, 0, 0)

        const group = new THREE.Object3D()
        group.add(mesh, this.parent.edge_builder.createEdge(mesh))
        return group
    }

    // profilePositions — X/Z профилей в локальных координатах модуля
    // (раскладку считает WardrobeGridParser, строит
    // WardrobeFillingMeshBuilder.buildProfiles).
    //
    // height — СОБСТВЕННАЯ высота ЭТОГО профиля, а не size.height: "Пол-стена"
    // короче "Пол-потолок", и верхняя ножка короткого иначе повисла бы на
    // уровне соседнего высокого. Нижняя всегда на полу — профили растут вверх.
    //
    // fasteningType читается буквально как "низ_верх": "floor" — ножка снизу
    // (нужна везде, кроме "wall_wall"), "ceiling" — ножка сверху, "wall" —
    // вместо неё крепёжная пластина (createWardrobeWallBracket).
    buildWardrobeLegs(
        props: TTotalProps,
        profilePositions: { x: number, z: number, height?: number, fasteningType?: 'floor_ceiling' | 'floor_wall' | 'wall_wall', colorId?: number }[]
    ): THREE.Object3D {
        const size = props.CONFIG.SIZE
        const legsGroup = new THREE.Object3D()

        // floorY = -size.height/2: геометрия ЦЕНТРИРОВАНА относительно Y=0,
        const floorY = -size.height / 2

        profilePositions.forEach(({ x, z, height, fasteningType, colorId }, index) => {
            const hasBottomLeg = fasteningType !== 'wall_wall'
            const hasTopLeg = fasteningType === 'floor_ceiling'
            const topY = floorY + (height ?? size.height)

            if (hasBottomLeg) {
                const bottomLeg = this.createWardrobeLeg(-1)
                bottomLeg.position.set(x, floorY, z)
                bottomLeg.name = `WARDROBE_LEG_BOTTOM_${index}`
                legsGroup.add(bottomLeg)
            }

            if (hasTopLeg) {
                const topLeg = this.createWardrobeLeg(1)
                topLeg.position.set(x, topY, z)
                topLeg.name = `WARDROBE_LEG_TOP_${index}`
                legsGroup.add(topLeg)
            }

            // 'floor_wall' — сверху вместо ножки крепёжная пластина к стене,
            // см. createWardrobeWallBracket выше.
            if (fasteningType === 'floor_wall') {
                const bracket = this.createWardrobeWallBracket(size.depth, colorId)
                bracket.position.set(x, topY, z)
                bracket.name = `WARDROBE_WALL_BRACKET_TOP_${index}`
                legsGroup.add(bracket)
            }
        })

        legsGroup.name = 'WARDROBE_LEGS'
        return legsGroup
    }
}
