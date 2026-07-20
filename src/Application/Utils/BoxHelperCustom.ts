
//@ts-nocheck
import * as THREE from "three";
import * as THREETypes from "@/types/types"
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { OBBHelper } from "./CalculateBoundingBox";

export class CustomBoxHelper {

    private scene: THREE.Scene
    private selectedObject: THREE.Object3D | null = null;
    private boxHelper: THREE.Mesh | THREE.BoxHelper | null = null;
    private root: THREETypes.TApplication
    private uniformGroupsSelected: THREE.Object3D[] = [];
    private uniformSelectBoxHelperStore: THREE.Box3Helper[] = []
    // private obbh: OBBHelper

    constructor(root: THREETypes.TApplication) {

        this.root = root
        this.scene = root._scene
        // this.obbh = new OBBHelper()

    }

    get _boxHelperCheck() {
        return this.boxHelper
    }

    get _currentObject() {
        return this.root._trafficManager?._currentObject
    }

    set _boxHelperCheck(value) {
        this.boxHelper = value
    }

    addBoxHelper(object: THREE.Object3D) {

        this.selectedObject = object

        if (this.selectedObject) {

            this.boxHelper = new THREE.BoxHelper(this.selectedObject, 0x00ff00)

            // console.log(this.boxHelper, '!!this.boxHelper')
            this.boxHelper.material.depthTest = false;
            this.boxHelper.material.depthWrite = false;
            this.boxHelper.material.opacity = 0.5

            this.boxHelper.material.transparent = true

            this.boxHelper.renderOrder = 1
            this.scene.add(this.boxHelper);
            this.boxHelper.update()

        }
    }

    updateBoxHelper() {

        if (this.boxHelper && this.selectedObject) {
            this.boxHelper.update()
        }
    }

    removeBoxHelper() {
        if (this.boxHelper) {
            this.scene.remove(this.boxHelper);
            this.boxHelper.geometry.dispose();
            (this.boxHelper.material as THREE.Material).dispose();
            this.boxHelper = null;
        }
    }

    /** Для Переходящего рисунка uniformTextureBuilder */

    createGroupBox(
        {
            object,
            color,
            store,
        }: {
            object: THREE.Object3D,
            color: string,
            store: THREE.BoxHelper[],
            toSelect?: boolean
        }) {

        const boxHelper = new THREE.BoxHelper(object, color)

        // console.log(this.boxHelper, '!!this.boxHelper')
        boxHelper.material.depthTest = false;
        boxHelper.material.depthWrite = false;
        boxHelper.material.opacity = 1
        boxHelper.material.transparent = true
        boxHelper.renderOrder = 1
        object.userData.groupBoxHelper = boxHelper

        this.scene.add(boxHelper);
        store.push(boxHelper)
    }


    toggleGroupBox(value: boolean, store: THREE.BoxHelper[]) {
        this.clearGroupBoxStore(this.uniformSelectBoxHelperStore)
  
        if (store.length > 0) {
            store.forEach(box => {
                box.visible = value
                box.update()
            })
        }
    }

    hideGroupBox(store: THREE.BoxHelper[]) {

        store.forEach(box => {
            box.visible = false
        })
    }

    removeGroupBox(object: THREE.Object3D, store: THREE.BoxHelper[]):THREE.BoxHelper[] {

        const box = object.userData.groupBoxHelper
        if (box === null) return

        const preUpdatedGroups = store.filter((element) => {
            return element.uuid !== box.uuid
        });

        box.geometry.dispose();
        (box.material as THREE.Material).dispose();
        object.userData.groupBoxHelper = null;

        this.scene.remove(box);

        return preUpdatedGroups

    }

    clearGroupBoxStore(store: THREE.BoxHelper[]) {
        store.forEach((box: THREE.BoxHelper) => {
            box.geometry.dispose();
            (box.material as THREE.Material).dispose();
            this.scene.remove(box);
        })
        store = []
    }


    createSelectGroup(object) {

        if ('groupBoxHelper' in object.userData) {
            if (object.userData.groupBoxHelper !== null) return
        }


        const preUpdatedGroups: THREE.Object3D = this.uniformGroupsSelected.filter((element) => {
            return element.uuid !== object.uuid
        });

        if (preUpdatedGroups.length === this.uniformGroupsSelected.length) {
            this.uniformGroupsSelected.push(object);
            const helper = this.createSelectBox(object)
            this.uniformSelectBoxHelperStore.push(helper)


        } else {
            this.uniformGroupsSelected = preUpdatedGroups;
            const preHelpered = this.uniformSelectBoxHelperStore.reduce((acc, item) => {
                if (item.userData.id !== object.uuid) {
                    acc.push(item)
                }
                if (item.userData.id === object.uuid) {
                    this.removeSelectBox(item)
                }
                return acc
            }, [])

            this.uniformSelectBoxHelperStore = preHelpered


        }
    }

    clearSelect() {
        this.uniformGroupsSelected = []
        this.clearGroupBoxStore(this.uniformSelectBoxHelperStore)
    }

    createSelectBox(object: THREE.Object3D) {

        const boxHelper = new THREE.BoxHelper(object, '#FFA500')

        boxHelper.material.depthTest = false;
        boxHelper.material.depthWrite = false;
        boxHelper.material.opacity = 1
        boxHelper.material.transparent = true
        boxHelper.renderOrder = 1
        boxHelper.userData.id = object.uuid
        this.scene.add(boxHelper);

        return boxHelper


    }

    removeSelectBox(box: THREE.BoxHelper) {
        box.geometry.dispose();
        (box.material as THREE.Material).dispose();
        this.scene.remove(box);
    }
}