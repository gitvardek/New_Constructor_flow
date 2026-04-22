// @ts-nocheck
import { Mesh, Color, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import { TBuildProduct, TFasadeItem } from "@/types/types";

export class MirrorBuilder {
    parent: TBuildProduct
    constructor(parent: TBuildProduct) {
        this.parent = parent
    }

    async createMirrorMaterial(mesh: Mesh, material: TFasadeItem) {

        const bodyMaterial = new MeshStandardMaterial()
        await this.parent.getMaterial({ material: bodyMaterial, url: material.TEXTURE })

        const mirrorMaterial = new MeshPhysicalMaterial({
            color: new Color(`#ffffff`),
            metalness: 0.85,
            roughness: 0,
            clearcoat: 1,
            clearcoatRoughness: 0.0,
            reflectivity: 1,
            // transmission: 0.1,
            //  opacity: 0.1,

        })


        setTimeout(() => {
            const geometry = mesh.geometry;

            geometry.groups[0].materialIndex = 0; // +X
            geometry.groups[1].materialIndex = 0; // -X
            geometry.groups[2].materialIndex = 0; // +Y 
            geometry.groups[3].materialIndex = 0; // -Y 
            geometry.groups[4].materialIndex = 1; // +Z 
            geometry.groups[5].materialIndex = 0; // -Z 

            mesh.material = [bodyMaterial, mirrorMaterial];
            geometry.groupsNeedUpdate = true;
            mesh.material.needsUpdate = true;
        }, 10)

    }

}
