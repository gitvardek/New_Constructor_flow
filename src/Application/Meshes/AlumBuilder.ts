//@ts-nocheck

import * as THREE from "three";
import * as THREETypes from "@/types/types";
import roughnessUrl from '@/assets/metall/metal_roughness.jpg';
import metallicUrl from '@/assets/metall/metal_metallic.jpg';

export class AlumBuilder {
    parent: THREETypes.TBuildProduct;
    resources: THREETypes.TResources;
    roughnessMap?: THREE.Texture;
    metalnessMap?: THREE.Texture;

    constructor(parent: THREETypes.TBuildProduct) {
        this.parent = parent;
        this.resources = parent.resources;

        // Предзагрузка текстур
        this.loadTextures();
    }

    private loadTextures() {
        if (!this.parent || !this.resources) return

        this.resources.startLoading(roughnessUrl, 'localTexture', (file) => {
            this.setupTexture(file);
            this.roughnessMap = file;
        });
    }

    private setupTexture(texture: THREE.Texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1 / 512, 1 / 512);
        texture.offset.set(0.5, 0.5);
    }

    createAlum({ fasade, data }: { fasade: THREE.Object3D; data: { COLOR: string } }) {
        if (!fasade) {
            console.log('AlumBuilder: параметр fasade - не определён')
            return
        }

        fasade.visible = true;

        fasade.traverse((child: THREE.Object3D) => {
            // Пропускаем меш чертежа
            if ((child.userData && child.userData.edge) || child.parent?.userData?.edge) return

            if (child instanceof THREE.Mesh && child.userData.type !== 'glass') {
                if (!child.userData.ORIGINAL_COLOR) {
                    child.userData.ORIGINAL_COLOR = child.material;
                }

                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(data.COLOR),
                    metalness: 0.5,
                    roughness: 0.5,
                    roughnessMap: this.roughnessMap,
                    metalnessMap: this.metalnessMap
                });

                material.needsUpdate = true;
                material.receiveShadow = true;
                material.castShadow = true;

                child.material = material;
            }
        });
    }
}