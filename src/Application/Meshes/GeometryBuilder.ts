
//@ts-nocheck
import * as THREE from "three"
import * as THREETypes from "@/types/types"
import { useToast } from "@/features/toaster/useToast"
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
        loaded_size?: any
    ): Promise<THREE.Object3D | null> {
        try {
            return await this.buildProduct.getModel(data, loadedProps, loaded_size);
        } catch (error) {
            console.error(`[GeometryBuilder] Ошибка построения объекта ID: ${data?.ID}:`, error);
            useToast().error(`Объект с ID: ${data?.ID}, наименование: "${data?.NAME}" не может быть установлен`);
            return null;
        }
    }


    public isCopy(value: boolean) {
        this.buildProduct._copy = value
    }
}