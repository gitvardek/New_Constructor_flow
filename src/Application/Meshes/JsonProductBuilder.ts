// @ts-nocheck

import * as THREE from 'three'
import * as THREETypes from "@/types/types"

import { BuildProduct } from './BuildProduct'

interface CreateMeshParams {
    data: THREETypes.TObject
    parent_size?: THREETypes.TObject
    fasade?: THREETypes.TObject
    left?: THREETypes.TObject
    right?: THREETypes.TObject
    back?: THREETypes.TObject
    top?: THREETypes.TObject
    tsarga?: THREETypes.TObject
    isTopTable?: boolean,
    textureUrl?: string
}

interface ParseDateParams {
    data: THREETypes.TObject
    group: THREE.Object3D
    obj: Record<string, THREE.Mesh>
    parent_size?: THREETypes.TObject
    array?: THREETypes.TObject[]
    isTopTable?: boolean
}

export class JsonBuilder {

    parent: BuildProduct
    material: THREE.Material | null = null
    rightMaterial: THREE.Material | null = null
    leftMaterial: THREE.Material | null = null
    backMaterial: THREE.Material | null = null
    topMaterial: THREE.Material | null = null
    tsargaMaterial: THREE.Material | null = null
    keys: string[] = ['fasade', 'center', 'front', 'front1', 'front2']

    convert: Function

    constructor(parent: BuildProduct) {
        this.parent = parent
        this.convert = parent.calculateFromString
    }

    createMesh({
        data,
        parent_size,
        textureUrl,
        left,
        right,
        back,
        top,
        tsarga,
        isTopTable = false,
        isRoomElement = false,
    }: CreateMeshParams): THREE.Object3D {

        const json = data.json ?? data
        const group = new THREE.Object3D()
        const obj: Record<string, THREE.Mesh> = {}

        this.material = this.createMaterial(json.material, textureUrl, group, isRoomElement) as THREE.Material

        this.leftMaterial = this.resolveSideMaterial(left, json.material)
        this.rightMaterial = this.resolveSideMaterial(right, json.material)
        this.backMaterial = this.resolveSideMaterial(back, json.material)
        this.topMaterial = this.resolveSideMaterial(top, json.material)

        if (tsarga) {
            this.tsargaMaterial = tsarga.PALETTE
                ? this.parent.palette_bulider.getPalette(tsarga.COLOR, tsarga.PALETTE)
                : this.createMaterial(
                    json.material,
                    this.parent._COLOR[tsarga.COLOR].TEXTURE ?? this.parent._FASADE[tsarga.COLOR].TEXTURE
                ) as THREE.Material
        }

        if (Array.isArray(json.items)) {
            json.items.forEach((item: THREETypes.TObject, _: number, array: THREETypes.TObject[]) => {
                this.parseDate({ data: item, group, obj, array, isTopTable, isRoomElement, textureUrl })
            })
        } else if (json.items !== null && typeof json.items === 'object' && !(json.items instanceof Date)) {
            let clone = JSON.parse(JSON.stringify(json.items))

            if (parent_size) {
                clone = this.parent.expressionsReplace(clone, {
                    "#FWIDTH#": parent_size.x,
                    "#FHEIGHT#": parent_size.y,
                    "#FDEPTH#": parent_size.z,
                    "#X#": parent_size.mX,
                    "#Y#": parent_size.mY,
                    "#Z#": parent_size.mZ,
                })
            }

            const values = Object.values(clone)

            if (values.length > 1) {
                values.forEach(el => {
                    this.parseDate({ data: el, group, obj, parent_size, isTopTable, isRoomElement, textureUrl })
                })
            } else {
                const type = this.parent.findKeyInObject(clone, this.keys)
                this.parseDate({ data: clone[type], group, obj, parent_size, isTopTable, isRoomElement, textureUrl })
            }
        }

        group.applyMatrix4(group.matrixWorld)
        this.clearMaterials()
        return group
    }

    private resolveSideMaterial(
        side: THREETypes.TObject | undefined,
        materialData: THREETypes.TObject
    ): THREE.Material | null {
        if (!side) return null

        return side.PALETTE
            ? this.parent.palette_bulider.getPalette(side.COLOR, side.PALETTE)
            : this.createMaterial(materialData, this.parent._FASADE[side.COLOR].TEXTURE) as THREE.Material
    }

    parseDate({ data, group, obj, parent_size, array, isTopTable = false, isRoomElement = false, textureUrl }: ParseDateParams): boolean | void {

        if (data.id === 'forwardbox' && this.convert(data.geometry?.opt?.x) <= 0) {
            return true
        }

        if (data.type === 'object') {
            const geometry = this.createGeometryByType(data, parent_size, isTopTable, isRoomElement, textureUrl)
            if (!geometry) return

            const material = this.resolveMeshMaterial(data)

            const mesh = new THREE.Mesh(geometry, material)


            mesh.receiveShadow = true
            mesh.castShadow = true
            mesh.userData.geomType = data.geometry.type

            obj[data.id] = mesh
        }

        if (data.type === 'link') {
            if (!obj[data.link]) {
                console.warn(`JsonBuilder: link target "${data.link}" not found for id "${data.id}"`)
                return
            }
            obj[data.id] = obj[data.link].clone()
            obj[data.id].name = data.id
        }

        if (!obj[data.id]) return

        if (data.position) {
            obj[data.id].position.set(
                this.convert(data.position.x),
                this.convert(data.position.y),
                this.convert(data.position.z)
            )
        }

        if (data.id === 'back' && data.position) {
            obj[data.id].position.y = this.convert(data.position.y) ?? 0
        }

        if (data.rotation) {
            obj[data.id].rotation.set(
                this.convert(data.rotation.x),
                this.convert(data.rotation.y),
                this.convert(data.rotation.z)
            )
        }

        if (!data.geometry) {
            const source = array?.find(item => item.id === data.link)
            if (source) {
                group.userData.geometryType = source.geometry.type
            } else {
                console.warn(`JsonBuilder: geometry source not found for link "${data.link}"`)
            }
        } else {
            group.userData.geometryType = data.geometry.type
        }

        group.add(obj[data.id])
    }

    private createGeometryByType(
        geometryData: THREETypes.TObject,
        parent_size?: THREETypes.TObject,
        isTopTable?: boolean,
        isRoomElement?: boolean,
        textureUrl?: string
    ): THREE.BufferGeometry | null {

        switch (geometryData?.geometry.type) {
            case 'BoxGeometry':
            case 'ExtrudeBoxGeometry':
                return this.createGeometry(geometryData, parent_size)
            case 'ExtrudeGeometry':
                return this.createShapeGeometry(geometryData, parent_size, isTopTable)
            case 'PlaneGeometry':
                return this.createPlaneGeometry(geometryData, parent_size, isRoomElement, textureUrl)
            default:
                console.warn(`JsonBuilder: unknown geometry type "${geometryData?.type}"`)
                return null
        }
    }

    private resolveMeshMaterial(data: THREETypes.TObject): THREE.Material {
        if (data.glass) {
            const mat = new THREE.MeshPhongMaterial({
                color: "#939393",
                transparent: true,
                opacity: 0.5,
                shininess: 100,
                specular: 0x999999,
            })
            mat.color.convertSRGBToLinear()
            return mat
        }


        const id: string = data.id ?? ''

        if (id.includes('left') && this.leftMaterial) return this.leftMaterial
        if (id.includes('right') && this.rightMaterial) return this.rightMaterial
        if (id.includes('back') && this.backMaterial) return this.backMaterial
        if (id.includes('top_fasade') && this.topMaterial) return this.topMaterial
        if (id.includes('horizontalline') && this.tsargaMaterial) return this.tsargaMaterial

        return this.material!
    }

    createGeometry(geometry_data: THREETypes.TObject, parent_size?: THREETypes.TObject, isRoomElement?: boolean): THREE.BoxGeometry {
        const geometry = new THREE.BoxGeometry(
            this.convert(geometry_data.geometry.opt.x),
            this.convert(geometry_data.geometry.opt.y),
            this.convert(geometry_data.geometry.opt.z)
        )

        if (isRoomElement) {
            this.parent.normalizeUVsTo01(geometry);
        }

        geometry.computeBoundingBox();

        return geometry
    }

    createPlaneGeometry(
        geometry_data: THREETypes.TObject,
        parent_size?: THREETypes.TObject,
        isRoomElement?: boolean,
        textureUrl?: string
    ): THREE.PlaneGeometry {

        const geometry = new THREE.PlaneGeometry(
            this.convert(geometry_data.geometry.opt.x),
            this.convert(geometry_data.geometry.opt.y)
        )

        geometry.userData.comand = geometry_data.id

        if (isRoomElement) {
            this.parent.normalizeUVsTo01(geometry);
            this.material = this.parent.createNishaMaterial(textureUrl, { x: geometry_data.geometry.opt.x, y: geometry_data.geometry.opt.y }, geometry_data.id);

        }
        return geometry;
    }

    createShapeGeometry(
        geometry_data: THREETypes.TObject,
        parent_size?: THREETypes.TObject,
        isTopTable?: boolean,
        isRoomElement?: boolean
    ): THREE.ExtrudeGeometry | THREE.ShapeGeometry | null {


        // Вычисляем числовые значения опций
        const opts = { ...geometry_data.geometry.opt }
        for (const key in opts) {
            opts[key] = this.convert(opts[key])
            if (key === 'amount') {
                opts.depth = opts[key]
            }
        }

        const shape = new THREE.Shape()

        for (const command of geometry_data.geometry.command as { type: string, opt: Record<string, string> }[]) {
            const args = Object.values(command.opt).map(v => this.convert(v))

            const method = shape[command.type as keyof THREE.Shape]
            if (typeof method === 'function') {
                (method as Function).apply(shape, args)
            } else {
                console.warn(`JsonBuilder: method "${command.type}" not found on THREE.Shape`)
            }
        }

        let geometry: THREE.ExtrudeGeometry | THREE.ShapeGeometry

        switch (geometry_data.geometry.type) {
            case 'ExtrudeGeometry':
                geometry = new THREE.ExtrudeGeometry(shape, opts)
                break
            case 'ShapeGeometry':
                geometry = new THREE.ShapeGeometry(shape, opts)
                break
            default:
                console.warn(`JsonBuilder: unknown shape geometry type "${geometry_data.type}"`)
                return null
        }

        geometry.computeBoundingBox()

        if (!isTopTable) {
            this.parent.normalizeUVsTo01(geometry)
        }
        if (isRoomElement) {
            this.parent.normalizeUVsTo01(geometry)
        }

        return geometry
    }

    update(parent: BuildProduct): void {
        this.parent = parent
    }

    createMaterial(data: THREETypes.TObject, url?: THREETypes.TObject, group?: THREE.Object3D, isRoomElement?: boolean): THREE.Material | null {
        if (!data) return null

        if (data instanceof THREE.Material) return data

        let material: THREE.Material | null = null

        if (data.type) {
            switch (data.type as THREETypes.TMaterialType) {
                case 'MeshBasicMaterial':
                    material = new THREE.MeshBasicMaterial(data.opt)
                    break
                case 'MeshStandardMaterial':
                    material = new THREE.MeshStandardMaterial(data.opt)
                    break
                case 'MeshPhongMaterial':
                    material = new THREE.MeshPhongMaterial(data.opt)
                    break
                case 'MeshPhysicalMaterial':
                    material = new THREE.MeshPhysicalMaterial(data.opt)
                    break
                case 'MeshLambertMaterial':
                    material = new THREE.MeshLambertMaterial()
                    break
                default:
                    console.warn(`JsonBuilder: unknown material type "${data.type}"`)
            }
        }

        if (url && material && !isRoomElement) {
            this.parent.getTexture({ material, url })
        }

        // if (url && material && isRoomElement) {
        //     this.parent.getTexture({ material, url, texture_size: { width: 512, height: 512 } })
        // }

        return material
    }

    clearMaterials(): void {
        this.material = null
        this.rightMaterial = null
        this.leftMaterial = null
        this.backMaterial = null
        this.topMaterial = null
        this.tsargaMaterial = null
    }
}