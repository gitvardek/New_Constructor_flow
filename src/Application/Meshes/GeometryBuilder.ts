
//@ts-nocheck
import * as THREE from "three"
import * as THREETypes from "@/types/types"

import { BuildProduct } from "./BuildProduct";

export class GeometryBuilder {

    root: THREETypes.TApplication
    buildProduct: BuildProduct

    constructor(root: THREETypes.TApplication) {
        this.root = root
        this.buildProduct = new BuildProduct(root)
    }

    // craeteModel(data: any, onLoad: (object: THREE.Object3D) => void, loadedProps?: any, loaded_size?:any): void {

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
