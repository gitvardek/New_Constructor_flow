
//@ts-nocheck
import * as THREE from "three"
import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { useEventBus } from '@/store/appliction/useEventBus';
import { useSceneState } from "@/store/appliction/useSceneState"
import { useRoomOptions } from "@/components/left-menu/option/roomOptions/useRoomOptons";

export class AppLights {
    parent: THREETypes.TApplication
    eventsStore: ReturnType<typeof useEventBus> = useEventBus()
    sceneState: ReturnType<typeof useSceneState> = useSceneState()
    roomOptions: ReturnType<typeof useRoomOptions> = useRoomOptions()
    scene: THREE.Scene
    params: any
    private lights: THREE.Light[] = []
    private ambientLight: THREE.Light

    constructor(parent: THREETypes.TApplication) {

        this.parent = parent
        this.scene = parent.scene

        this.params = this.sceneState.getStartLightsData
        this.setQuality('low')
        this.vueEvents()

    }

    addPointLight(params: THREEInterfases.IlightData) {
        const pointLight = new THREE.PointLight(
            params.color,
            // this.sceneState.getLightRange.pointLight,
            this.roomOptions.getPointLightRange,
            params.distance,
            params.decay,
        )

        pointLight.castShadow = params.castShadow as boolean;
        pointLight.shadow.mapSize.set(params.mapSize as number, params.mapSize as number)
        // pointLight.shadow.bias = params.bias as number
        // pointLight.shadow.normalBias = 0.02
        // pointLight.shadow.bias = 0.0001
        pointLight.shadow.camera.near = 0.5;
        pointLight.shadow.camera.far = 2000;

        pointLight.shadow.normalBias = 0
        pointLight.shadow.bias = -0.001

        this.lights.push(pointLight)
        this.scene.add(pointLight)
        return pointLight
    }

    addAmbientLight(params: THREEInterfases.IlightData) {

        // this.ambientLight = new THREE.AmbientLight(
        //     params.color,
        //     this.roomOptions.getAmbientLightRange,
        // )
        this.ambientLight = new THREE.HemisphereLight(
            new THREE.Color('rgba(228, 228, 228, 1)'), // Цвет неба
            new THREE.Color('rgba(89, 89, 89, 1)'), // Цвет земли (можно добавить в params)
            this.roomOptions.getAmbientLightRange // Интенсивность
        );

        this.scene.add(this.ambientLight)
    }

    setLight(position: { [key: string]: number } | any, lightCount: number, wallsGroup: THREE.Object3D) {


        const aabb = new THREE.Box3().setFromObject(wallsGroup);
        const obb = new OBB().fromBox3(aabb);
        const productSize = new THREE.Vector3();

        // Очистка существующих источников света
        this.lights.forEach(light => this.scene.remove(light));
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
            this.ambientLight = null;
        }
        this.lights = [];

        if (lightCount === 0) {
            return; // Ничего не добавляем, если lightCount = 0
        }

        const count = lightCount > 0 ? lightCount : 1;
        const shadowValue = this.roomOptions.getShadowValue;
        const margin = 250;
        let step = 0;

        // Избегаем деления на ноль при count = 1
        if (count > 1) {
            step = (position.depth - 2 * margin) / (count - 1);
        }

        for (let i = 0; i < count; i++) {
            const point = this.addPointLight(this.params.pointLight);
            const { x, y, z } = obb.center
            const posZ = z - obb.halfSize.z * 0.5
            const posY = y + obb.halfSize.y * 0.5 - 20


            // const x = position.width * 0.5;
            // Если count = 1, размещаем свет в центре по глубине
            // const z = count === 1 ? 0 : (-position.depth * 0.5) + margin + (i * step);
            // const z = position.depth * 0.5;
            // const y = position.height * 0.8;
            point.position.set(x, posY, posZ);
        }

        this.addAmbientLight(this.params.ambientLight);
        this.toggleShadow(shadowValue);
    }

    setLightPosition(position: { [key: string]: number } | any, lightCount: number) {
        if (lightCount === 0 || this.lights.length === 0) {
            return;
        }

        const count = Math.min(lightCount > 0 ? lightCount : 1, this.lights.length);
        const margin = 250;
        const step = (position.depth - 2 * margin) / (count - 1);

        for (let i = 0; i < count; i++) {
            const x = 0;
            const z = (-position.depth * 0.5) + margin + (i * step);
            const y = position.height * 0.8;
            this.lights[i].position.set(x, y, z);
        }
    }
    setQuality(params: string) {
        switch (params) {
            case 'low':
                this.lights.forEach(light => {

                    if (light instanceof THREE.PointLight) {
                        light.shadow.map?.dispose()
                        light.shadow.map = null;
                        light.shadow.mapSize.set(512, 512)

                        light.shadow.normalBias = 0
                        light.shadow.bias = -0.001

                        light.shadow.needsUpdate = true;
                    }
                })
                break;
            case 'medium':
                this.lights.forEach(light => {

                    if (light instanceof THREE.PointLight) {
                        light.shadow.map?.dispose()
                        light.shadow.map = null;
                        light.shadow.mapSize.set(512 * 2, 512 * 2)

                        light.shadow.normalBias = 0
                        light.shadow.bias = -0.0005

                        light.shadow.needsUpdate = true;
                    }
                })
                break;
            case 'hight':
                this.lights.forEach(light => {
                    if (light instanceof THREE.PointLight) {
                        light.shadow.map?.dispose()
                        light.shadow.map = null;
                        light.shadow.mapSize.set(512 * 4, 512 * 4)


                        light.shadow.normalBias = 0
                        light.shadow.bias = -0.0005

                        light.shadow.needsUpdate = true;
                    }
                })
                break;
            default:
                throw new Error(`Unsupported light type: ${params}`);
        }

    }

    toggleShadow(value: boolean) {
        switch (value) {
            case true:
                this.lights.forEach(light => {
                    if (light instanceof THREE.PointLight) {
                        light.castShadow = true
                    }
                })
                break;

            case false:
                this.lights.forEach(light => {

                    if (light instanceof THREE.PointLight) {
                        light.castShadow = false
                    }
                })
                break;
        }
    }

    changePointLightPower(value: number) {
        this.lights.forEach(light => {
            light.intensity = value
        })
    }

    changeAmbientLightPower(value: number) {

        this.ambientLight.intensity = value

    }

    vueEvents() {

        this.eventsStore.on('A:Quality', (value: string) => {
            this.setQuality(value)
        })

        this.eventsStore.on('A:ToggleShadow', (value: boolean) => {
            this.toggleShadow(value)
        })

        this.eventsStore.on('A:ChangePointLightPower', (value: number) => {
            this.changePointLightPower(value)
        })

        this.eventsStore.on('A:ChangeAmbientLightPower', (value: number) => {
            this.changeAmbientLightPower(value)
        })
    }

}