//@ts-nocheck
import * as THREE from "three"
import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"
import { useEventBus } from "@/store/appliction/useEventBus";
import { useBasketStore } from "@/store/appStore/useBasketStore";

export class DragAndDropManager {

    canvas: HTMLElement;
    scene: THREE.Scene;
    eventBus: ReturnType<typeof useEventBus> = useEventBus();

    root: THREETypes.TApplication
    geometryBuilder: THREETypes.TGeometryBuilder;
    universalGeometryBuilder: THREETypes.TUniversalGeometryBuilder;
    raycaster: THREE.Raycaster
    mouse: THREE.Vector2
    camera: THREE.Camera

    roomManager: THREETypes.TRoomManager
    trafficManager: THREETypes.TTrafficManager
    boxHelper: THREETypes.TCustomBoxHelper

    setObject: THREETypes.TSetObject

    // roomParams: { [key: string]: number | 0 } | THREEInterfases.IWallSizes

    handleDragOverBound: (event: DragEvent) => void;
    handleDropBound: (event: DragEvent) => void

    constructor(root: THREETypes.TApplication, mouse: THREE.Vector2, raycaster: THREE.Raycaster, trafficManager: THREETypes.TTrafficManager) {

        this.root = root as THREETypes.TApplication
        this.canvas = root._canvas as HTMLElement
        this.scene = root._scene as THREE.Scene
        this.camera = root._camera
        this.roomManager = root._roomManager as THREETypes.TRoomManager
        this.trafficManager = trafficManager
        this.setObject = root._setObject as THREETypes.TSetObject
        // this.roomParams = root._roomManager?._roomParams
        this.geometryBuilder = root._geometryBuilder as THREETypes.TGeometryBuilder;
        this.universalGeometryBuilder = trafficManager.universalGeometryBuilder
        this.boxHelper = root._customBoxHelper as THREETypes.TCustomBoxHelper

        this.raycaster = raycaster;
        this.mouse = mouse;

        this.handleDragOverBound = this.handleDragOver.bind(this)
        this.handleDropBound = this.handleDrop.bind(this)

        this.setupDragAndDrop();

    }

    setupDragAndDrop() {
        this.canvas.addEventListener('dragover', this.handleDragOverBound, false);
        this.canvas.addEventListener('drop', this.handleDropBound, false);
    }

    dispose() {
        this.canvas.removeEventListener('dragover', this.handleDragOverBound, false);
        this.canvas.removeEventListener('drop', this.handleDropBound, false);
    }

    private handleDragOver(event: DragEvent) {

        event.preventDefault();
    }

    private async handleDrop(event: DragEvent) {

        event.preventDefault();

        if (!this.roomManager._roomFloor) return;

        const data = event.dataTransfer?.getData('text');

        if (data && data.trim() !== '') {
            try {
                const productData = JSON.parse(data) as THREEInterfases.IModelsData;

                this.mouse.x = ((event.clientX - this.canvas.getBoundingClientRect().left) / this.canvas.clientWidth) * 2 - 1;
                this.mouse.y = -((event.clientY - this.canvas.getBoundingClientRect().top) / this.canvas.clientHeight) * 2 + 1;

                this.raycaster.setFromCamera(this.mouse, this.camera);

                const intersects = this.raycaster.intersectObjects([...this.roomManager._roomWalls, this.roomManager._roomFloor]);
                let object: THREE.Object3D;

                if (intersects.length === 0) return;

                const point = intersects[0].point;
                const surface = intersects[0].object;
                // this.eventBus.emit('U:Drop')


                if (productData.moduleType || productData.ID == 3954672) {
                    object = await this.universalGeometryBuilder.createModel(productData)
                } else {
                    object = await this.geometryBuilder.createModel(productData);
                }

                await this.setObject.create({
                    object,
                    point,
                    wall: surface,
                    trafficManager: this.trafficManager,
                    boxHelper: this.boxHelper
                });

                this.trafficManager._currentObject = object;
                this.trafficManager.ruler.drawRulerToObjects(object);

                object.userData.MOUSE_POSITION = {
                    x: object.position.clone().project(this.camera).x * this.root._sizes!.width * 0.5,
                    y: object.position.clone().project(this.camera).y * this.root._sizes!.height * -0.5,
                };

                this.eventBus.emit('U:Drop')

            } catch (error) {
                console.error('Error parsing JSON data:', error);
            }
        }
    }

    updateRoomData(roomManager: THREETypes.TRoomManager) {
        this.roomManager = roomManager
    }
}
