//@ts-nocheck
import * as THREE from "three"
import * as THREETypes from "@/types/types"

import { useEventBus } from "@/store/appliction/useEventBus"
import { useProductInfoStore } from "@/store/appStore/useProductInfoStore"

/**
 * Режим «Информация о товаре»: рейкаст по товарам комнаты на движение мыши.
 *
 * Товар под курсором подсвечивается оранжевой рамкой
 * (CustomBoxHelper.addHoverBox — отдельно от зелёного выделения), а в
 * useProductInfoStore уходит {basketId, productId, координаты курсора}:
 * по basketId подсказка находит позицию корзины.
 *
 * Рейкаст — не чаще кадра (requestAnimationFrame). При зажатой кнопке мыши
 * (перенос товара, вращение камеры) подсветка снимается: обычное поведение
 * сцены режим не меняет.
 */
export class ProductInfoHover {

    private root: THREETypes.TApplication
    private events: ReturnType<typeof useEventBus> = useEventBus()
    private productInfo: ReturnType<typeof useProductInfoStore> = useProductInfoStore()

    private raycaster: THREE.Raycaster = new THREE.Raycaster()
    private pointer: THREE.Vector2 = new THREE.Vector2()

    private enabled: boolean = false
    private frame: number | null = null
    private lastPointer: { x: number, y: number } | null = null
    private hoveredObject: THREE.Object3D | null = null

    private onMouseMoveBound: (event: MouseEvent) => void
    private onMouseLeaveBound: () => void
    private onClearBound: () => void

    constructor(root: THREETypes.TApplication) {

        this.root = root

        this.onMouseMoveBound = this.onMouseMove.bind(this)
        this.onMouseLeaveBound = this.clear.bind(this)
        this.onClearBound = this.clear.bind(this)

        this._canvas?.addEventListener('mousemove', this.onMouseMoveBound, false)
        this._canvas?.addEventListener('mouseleave', this.onMouseLeaveBound, false)

        this.vueEvents()
    }

    get _canvas() {
        return this.root._canvas
    }

    get _boxHelper() {
        return this.root._customBoxHelper
    }

    /** Товары комнаты: те же объекты, по которым идёт обычный выбор */
    get _roomContant(): THREE.Object3D[] {
        return this.root._roomManager?._roomTotalContant ?? []
    }

    /** Включение/выключение режима (эмит A:ToggleProductInfoMode из тулбара) */
    setMode(value: boolean) {
        this.enabled = value
        if (!value) this.clear()
    }

    private onMouseMove(event: MouseEvent) {

        if (!this.enabled) return

        /** Зажата кнопка — идёт перенос товара или вращение камеры */
        if (event.buttons !== 0) {
            this.clear()
            return
        }

        this.lastPointer = { x: event.clientX, y: event.clientY }

        if (this.frame !== null) return

        this.frame = requestAnimationFrame(() => {
            this.frame = null
            if (this.lastPointer) this.update(this.lastPointer.x, this.lastPointer.y)
        })
    }

    private update(clientX: number, clientY: number) {

        const canvas = this._canvas
        const camera = this.root._camera

        if (!canvas || !camera) return

        const rect = canvas.getBoundingClientRect()

        this.pointer.x = ((clientX - rect.left) / canvas.clientWidth) * 2 - 1
        this.pointer.y = -((clientY - rect.top) / canvas.clientHeight) * 2 + 1

        this.raycaster.setFromCamera(this.pointer, camera)

        const intersects = this.raycaster.intersectObjects(this._roomContant.filter(obj => obj.visible))
        const object = intersects.length > 0 ? this.getRootObject(intersects[0].object) : null

        if (!object || !object.visible) {
            this.clear()
            return
        }

        /** Товар, чьи данные показываем: у куска распила своего товара нет —
         *  берём его столешницу-родителя */
        const owner = this.getProductOwner(object)

        /** Под курсором не товар (стена, пол, пустота) */
        if (!owner) {
            this.clear()
            return
        }

        if (object !== this.hoveredObject) {
            this.hoveredObject = object
            this._boxHelper?.removeHoverBox()
            // У выбранного товара уже есть своя рамка — вторую поверх не рисуем
            if (object !== this.root._trafficManager?._currentObject) {
                this._boxHelper?.addHoverBox(object)
            }
        }

        this.productInfo.setHovered({
            basketId: String(owner.userData.basketId ?? owner.id),
            productId: owner.userData.PROPS.PRODUCT ?? null,
            x: clientX,
            y: clientY,
        })
    }

    /** Объект товара под курсором: сам объект либо владелец куска распила
     *  (PROPS.RASPIL_LIST хранит id кусков столешницы) */
    private getProductOwner(object: THREE.Object3D): THREE.Object3D | null {

        if (object.userData?.PROPS?.PRODUCT) return object

        if (object.userData?.elementType !== 'raspil') return null

        const owner = this._roomContant.find(item =>
            (item.userData?.PROPS?.RASPIL_LIST ?? []).some(elem => elem?.id === object.id)
        )

        return owner?.userData?.PROPS?.PRODUCT ? owner : null
    }

    /** Корневой объект товара — как при выборе в MoveManager */
    private getRootObject(object: THREE.Object3D): THREE.Object3D {
        let root = object
        while (root.parent && root.parent.type !== 'Scene') {
            root = root.parent
        }
        return root
    }

    clear() {

        if (this.frame !== null) {
            cancelAnimationFrame(this.frame)
            this.frame = null
        }

        this.lastPointer = null
        this.hoveredObject = null
        this._boxHelper?.removeHoverBox()
        this.productInfo.clearHovered()
    }

    private vueEvents() {
        /** Объект мог исчезнуть вместе с комнатой или товаром */
        this.events.on('A:Load', this.onClearBound)
        this.events.on('U:RemoveModel', this.onClearBound)
    }

    dispose() {
        this.clear()
        this.enabled = false
        this.productInfo.setEnabled(false)

        this.events.off('A:Load', this.onClearBound)
        this.events.off('U:RemoveModel', this.onClearBound)

        this._canvas?.removeEventListener('mousemove', this.onMouseMoveBound, false)
        this._canvas?.removeEventListener('mouseleave', this.onMouseLeaveBound, false)
    }
}
