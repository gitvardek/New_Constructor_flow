// @ts-nocheck
import { toRaw } from 'vue';
import * as THREE from 'three';
import { TApplication, TDeepDispose } from "@/types/types"
import * as BufferGeometry from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { MillingBuilder } from '../MillingBuilder';
import { useModelState } from "@/store/appliction/useModelState";
import { HandlePositions } from './HandlePositions';

export class ShowcaseBuilder extends MillingBuilder {
    scene: THREE.Scene
    clear: TDeepDispose
    private modelState = useModelState()

    constructor(root: TApplication) {
        super(root)
        this.scene = root._scene!
        this.clear = root._deepDispose!
    }

    createShowcase({
        fasade,
        fasadePosition,
        data,
        defaultGeometry,
        alum,
        curFasadeData,
        action

    }) {

        const showcaseData = alum ? this.modelState.getCurrentMillingMap(alum) : this.modelState.getCurrentMillingMap(data)

        this.createMillingFasade(fasade, fasadePosition, showcaseData, defaultGeometry);
        this.createGlass(fasade, fasadePosition, alum)

        if (curFasadeData) {
            const haveHandle = this._FASADE[curFasadeData.COLOR].TYPE_HANDLE

            // console.log(haveHandle, action, '==== ❌ haveHandle ❌ ====')

            if (typeof haveHandle == 'string' && typeof action === 'number') {
                this.createHandles({
                    fasade,
                    fasadePosition,
                    action: action,
                    type: haveHandle
                })
            }
        }

    }

    createGlass(fasade, fasadePosition, alum) {

        let offset = alum ? 2 : 10
        let zPos = alum ? 10 : 10

        const { FASADE_WIDTH, FASADE_HEIGHT } = fasade.userData.trueSize

        const glassId = toRaw(this.modelState.getCurrentGlassData[0])
        // console.log(glassId, '--glassId')

        const glassColor = glassId ? `#${glassId.COLOR}` : '#ffffff'

        let roughness

        if (glassId) {
            roughness = glassId.NAME.toLowerCase().includes('матовое') ? 0.2 : 0.05
        }
        else {
            roughness = 0.05
        }


        const params = {
            width: FASADE_WIDTH - offset,
            height: FASADE_HEIGHT - offset,
            depth: 5,
            material: {
                reflectivity: 1,
                transmission: 0.95,
                roughness: roughness,
                metalness: 0.25,
                color: glassColor,
                ior: 1.5,
                thickness: 0.5,
                clearcoat: 0.1,
                clearcoatRoughness: 0.1,
                opacity: 0.8,
            }

        }

        const geometry = new THREE.BoxGeometry(params.width, params.height, params.depth);
        const material = new THREE.MeshPhysicalMaterial({ ...params.material });
        material.encoding = THREE.SRGBColorSpace;

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = zPos
        mesh.userData.type = 'glass'

        if (!fasade.children.some(obj => obj.userData.type === 'glass')) {
            fasade.add(mesh)
        }

    }

    changeGlassColor({ fasade, glassId }) {

        const glassData = this._GLASS[glassId]
        const glassColor = `#${glassData.COLOR}`

        const roughness = glassData.NAME.toLowerCase().includes('матовое') ? 0.2 : 0.05

        // console.log(roughness, glassData, 'AFCHANGE')

        fasade.traverse(children => {
            if (children instanceof THREE.Mesh && children.userData.type == 'glass') {
                children.material.color.set(glassColor)
                children.material.roughness = roughness
                children.material.needsUpdate = true
            }
        })
    }

    createHandles(data) {
        const { fasade, fasadePosition, action, type } = data

        const sizes = fasade.userData.trueSize
        const { FASADE_WIDTH, FASADE_HEIGHT } = fasade.userData.trueSize;

        // 1. Сначала получаем геометрию фасада в ЛОКАЛЬНЫХ координатах (как она и была)
        const fasadeLocalGeometry = fasade.geometry.clone();

        // 2. Создаём геометрию ручки
        const handleGeometry = this.createHandleGeometry(sizes, action, type)

        // 3. ПОЗИЦИОНИРУЕМ И ПОВОРАЧИВАЕМ РУЧКУ ОТНОСИТЕЛЬНО ФАСАДА (всё ещё в локальных координатах!)
        this.setPosition(handleGeometry, sizes, action, type)

        // 4. Приводим обе геометрии к non-indexed (чтобы не было ошибки мёрджа)
        const geom1 = fasadeLocalGeometry.toNonIndexed();
        const geom2 = handleGeometry.toNonIndexed();

        // 5. Мёрджим — теперь обе геометрии в одной локальной системе координат фасада
        const merged = BufferGeometry.mergeGeometries([geom1, geom2]);

        this.planarUV(merged);
        // 6. Заменяем геометрию
        fasade.geometry.dispose();
        fasade.geometry = merged;

        // Обновляем bounding 
        fasade.geometry.computeBoundingBox();
        fasade.geometry.computeBoundingSphere();

    }

    createHandleGeometry(sizes, action, type) {
        const { FASADE_WIDTH, FASADE_HEIGHT } = sizes;

        const handleData = HandlePositions[type][action]
        const prepare = this.expressionsReplace(handleData, {
            "#WIDTH#": FASADE_WIDTH,
            "#HEIGHT#": FASADE_HEIGHT
        })
        const { geometry } = prepare

        let handleGeometry: THREE.BufferGeometry

        if (type == "path") {
            const hendlePath = geometry.svg;
            const paths = this.svgLoader.parse(hendlePath).paths;
            const shape = paths[0].toShapes(true);

            handleGeometry = new THREE.ExtrudeGeometry(shape, {
                steps: 1,
                depth: this.calculateFromString(geometry.width),
                bevelEnabled: false,
            });
            return handleGeometry
        }

        if (type == "full") {
            handleGeometry = new THREE.BoxGeometry(
                this.calculateFromString(geometry.width),
                this.calculateFromString(geometry.height),
                this.calculateFromString(geometry.depth))

        }

        this.planarUV(handleGeometry);

        return handleGeometry

    }

    setPosition(geometry, sizes, action, type) {
        const { FASADE_WIDTH, FASADE_HEIGHT } = sizes;

        const handleData = HandlePositions[type][action]
        const prepare = this.expressionsReplace(handleData, {
            "#WIDTH#": FASADE_WIDTH,
            "#HEIGHT#": FASADE_HEIGHT
        })

        const { position, rotation } = prepare

        geometry.rotateY(this.calculateFromString(rotation.y))
        geometry.rotateX(this.calculateFromString(rotation.x))
        geometry.rotateZ(this.calculateFromString(rotation.z))
        geometry.translate(
            this.calculateFromString(position.x),
            this.calculateFromString(position.y),
            this.calculateFromString(position.z)
        )





        // if (action === 7) {
        //     const depth = FASADE_WIDTH * 0.85;

        //     geometry.rotateY(Math.PI * 0.5);
        //     geometry.rotateX(Math.PI * -0.5);
        //     geometry.translate(
        //         depth * -0.5,
        //         FASADE_HEIGHT * -0.5 + 1.5,
        //         16
        //     );

        //     return

        // }

    }

}  