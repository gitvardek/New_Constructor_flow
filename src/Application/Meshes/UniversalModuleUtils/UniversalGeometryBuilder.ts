
//@ts-nocheck
import * as THREE from "three"
import * as THREETypes from "@/types/types"
import { useToast } from "@/features/toaster/useToast"

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
    ): Promise<THREE.Object3D | null> {
        try {
            return await this.buildProduct.getModel(data, loadedProps, loaded_size);
        } catch (error) {
            console.error(`[UniversalGeometryBuilder] Ошибка построения объекта ID: ${data?.ID}:`, error);
            useToast().error(`Объект с ID: ${data?.ID}, наименование: "${data?.NAME}" не может быть установлен`);
            return null;
        }
    }
}