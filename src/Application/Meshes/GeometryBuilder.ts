
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

    async createModel(
        data: any,
        loadedProps?: any,
        loaded_size?: any,
        copy?: boolean
    ): Promise<THREE.Object3D> {
        return this.buildProduct.getModel(data, loadedProps, loaded_size);
    }

    public isCopy(value: boolean) {
        this.buildProduct._copy = value
    }
}