// @ts-nocheck 

import * as THREE from "three";
import * as THREETypes from "@/types/types";
import * as BufferGeometry from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class PaletteBuilder {
    parent: THREETypes.TBuildProduct;

    constructor(parent: THREETypes.TBuildProduct) {
        this.parent = parent;
    }

    private createMaterial(colorHex: string, roughness: number = 0): THREE.MeshStandardMaterial {
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(`#${colorHex}`),
            metalness: 0.7,
            roughness
        });

        material.receiveShadow = true;
        material.castShadow = true;
        material.encoding = THREE.SRGBColorSpace;
        material.needsUpdate = true;

        return material;
    }

    private async applyTexture(child: THREE.Mesh, url: any, fasadeSize: THREE.Vector3) {
        await this.parent.changeColor({
            object: child,
            url,
            type: "Palette",
            textureSize: fasadeSize
        });
    }

    private applyMaterial(child: THREE.Mesh, palette: any, roughness: number) {
        const material = this.createMaterial(palette.HTML, roughness);
        child.material = material;
        child.userData.millingMaterial = material;
    }

    private async applyKant(paletteData, fasadeMesh: THREE.Mesh, fasadeTexture:string) {

        const rootMaterial = new THREE.MeshStandardMaterial()
        await this.parent.getTexture({material:rootMaterial, url:fasadeTexture, texture_size: {width:1024, height:1024}})
        const kantMaterial = this.createMaterial(paletteData.HTML, 0.5)

        const geometry = fasadeMesh.geometry;

        // Важно: гарантируем наличие нормалей
        if (!geometry.attributes.normal) {
            geometry.computeVertexNormals();
        }

        geometry.clearGroups();

        const positions = geometry.attributes.position.array;
        const normals = geometry.attributes.normal.array;

        const vertexCount = positions.length / 3;
        const hasIndex = geometry.index !== null;
        const indexArray = hasIndex ? geometry.index.array : null;

        let currentStart = 0;
        let currentIsCap = null;

        for (let i = 0; i < vertexCount; i += 3) {
            // Индекс первой вершины треугольника
            const vIdx = hasIndex ? indexArray[i] : i;
            const nz = normals[vIdx * 3 + 2]; 

            const isCap = Math.abs(Math.abs(nz) - 1) < 0.001;

            if (currentIsCap === null) {
                currentIsCap = isCap;
            }

            if (isCap !== currentIsCap) {
                geometry.addGroup(currentStart, i - currentStart, currentIsCap ? 0 : 1);
                currentStart = i;
                currentIsCap = isCap;
            }
        }

        if (currentStart < vertexCount) {
            geometry.addGroup(currentStart, vertexCount - currentStart, currentIsCap ? 0 : 1);
        }

        fasadeMesh.material = [rootMaterial, kantMaterial];
        geometry.groupsNeedUpdate = true;

    }

    getPalette(fasadeId: number, paletteId: number) {
        const { _APP, _FASADE } = this.parent;
        const palette = _APP.PALETTE[paletteId];
        const fasadeName = _FASADE[fasadeId].NAME.toLowerCase();

        const roughnessValue = fasadeName.includes("матовый") ? 0.5 : 0.02;

        return this.createMaterial(palette.HTML, roughnessValue)
    }

    async createPaletteColor({
        fasade,
        data,
        fasadeProps,
    }: {
        fasade: THREE.Object3D;
        data: number | string;
        fasadeProps: { [key: string]: any };
    }) {


        const { _APP, _FASADE } = this.parent;
        const palette = _APP.PALETTE[data];
        const fasadeId = fasadeProps.COLOR ?? 567323;
        const fasadeName = _FASADE[fasadeId].NAME.toLowerCase();
        const fasadeTexture = _FASADE[fasadeId].TEXTURE


        fasade.visible = true;

        const useTexture = palette.TYPE === "KANT"

        const roughnessValue = !useTexture && fasadeName.includes("матовый") ? 0.5 : 0.02;

        if (useTexture && fasadeTexture) {
            this.applyKant(palette, fasade, fasadeTexture)
        } else {
            this.applyMaterial(fasade, palette, roughnessValue);
        }


        fasadeProps.SHOW = true;
        fasadeProps.PALETTE = palette.ID;
    }
}
