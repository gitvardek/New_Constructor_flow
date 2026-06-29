
//@ts-nocheck
import * as THREE from "three"
import * as THREETypes from "@/types/types"

import { BuildUniversalModule } from "./BuildUniversalModule";
export class UniversalGeometryBuilder  {

    root: THREETypes.TApplication
    buildProduct: BuildUniversalModule

    constructor(root: THREETypes.TApplication) {

        this.root = root
        this.buildProduct = new BuildUniversalModule(root)
    }

    async createModel(
        data: any,
        loadedProps?: any,
        loaded_size?: any
    ): Promise<THREE.Object3D> {
        return this.buildProduct.getModel(data, loadedProps, loaded_size);
    }
}