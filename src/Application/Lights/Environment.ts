
//@ts-nocheck

import * as THREE from "three"
// import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"

import { useEventBus } from '@/store/appliction/useEventBus';
import { useRoomOptions } from "@/components/left-menu/option/roomOptions/useRoomOptons";

export class Environment {

    private boundQuality: ((payload: string) => void) | null = null;

    parent: THREETypes.TApplication
    eventsStore: ReturnType<typeof useEventBus>
    roomOptions: ReturnType<typeof useRoomOptions> = useRoomOptions()
    scene: THREE.Scene

    resources: THREETypes.TResources
    environmentMap: { [key: string]: any } = {}

    constructor(parent: THREETypes.TApplication) {

        this.parent = parent
        this.scene = this.parent.scene

        this.resources = this.parent.resources

        this.eventsStore = useEventBus()

        this.addVueEvents()
    }


    addEnvironmentMap() {
        this.environmentMap = {}
        this.environmentMap.intensity = 0.5
        this.environmentMap.texture = this.resources.items.environmentMapTexture
        this.environmentMap.texture.encoding = THREE.SRGBColorSpace

        this.scene.environment = this.environmentMap.texture as any

        this.environmentMap.updateMaterials = () => {
            this.scene.traverse((child) => {

                if (child instanceof THREE.Mesh && (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhysicalMaterial)) {
                    child.material.envMap = this.environmentMap.texture as any
                    child.material.envMapIntensity = this.environmentMap.intensity as any
                    child.material.needsUpdate = true
                }
            })
        }
        this.environmentMap.updateMaterials()
    }

    toggleEnvironmentMap(enable: boolean) {

        if (enable) {
            this.scene.environment = this.environmentMap.texture as any;
        } else {
            this.scene.environment = null;
        }

        // Обновляем материалы
        this.scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                child.material.envMap = enable ? this.environmentMap.texture : null;
                child.material.needsUpdate = true;
            }
        });
    }

    toggleRefraction(value: boolean) {
        value ? this.addEnvironmentMap() : this.toggleEnvironmentMap(false)
    }

    addVueEvents() {

        this.boundQuality = (value) => {
            this.setQuality(value);
        };

        // this.eventsStore.on('A:Quality', this.boundQuality);

        this.eventsStore.on('A:ToggleRefraction', (value: boolean) => {
            this.toggleRefraction(value)
        })
    }

    removeVueEvents() {

        if (this.boundQuality) {
            this.eventsStore.off('A:Quality', this.boundQuality);
            this.boundQuality = null;
        }
    }
}