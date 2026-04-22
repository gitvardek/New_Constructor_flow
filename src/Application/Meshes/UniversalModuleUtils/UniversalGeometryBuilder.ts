
//@ts-nocheck
import * as THREE from "three"
import * as THREETypes from "@/types/types"

import { BuildUniversalModule } from "./BuildUniversalModule";
import { GeometryBuilder } from "@/Application/Meshes/GeometryBuilder.ts";

export class UniversalGeometryBuilder extends GeometryBuilder {

    root: THREETypes.TApplication
    buildProduct: BuildUniversalModule

    constructor(root: THREETypes.TApplication) {
        super(root);
        this.root = root
        this.buildProduct = new BuildUniversalModule(root)
    }

    // createModel(data: any, onLoad: (object: THREE.Object3D) => void, loadedProps?: any, loaded_size?: any): void {

    //     this.buildProduct.getModel(data, onLoad, loadedProps, loaded_size)

    // }
    async createModel(
        data: any,
        loadedProps?: any,
        loaded_size?: any
    ): Promise<THREE.Object3D> {
        return this.buildProduct.getModel(data, loadedProps, loaded_size);
    }
}
