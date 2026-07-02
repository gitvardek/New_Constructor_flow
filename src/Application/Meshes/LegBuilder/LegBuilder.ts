// @ts-nocheck
import * as THREE from 'three'
import type { TBuildProduct, TRootOptionType, TTotalProps } from '@/types/types'

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
}
