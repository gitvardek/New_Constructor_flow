//@ts-nocheck

import * as THREE from "three"
import * as THREEInterfases from "@/types/interfases"

import { _URL } from "@/types/constants"
import { EventEmitter } from "./EventEmitter"
import { FBXLoader, GLTFLoader, ColladaLoader } from "three/examples/jsm/Addons.js"

export class Resources extends EventEmitter {
    items: { [key: string]: unknown } = {}
    loaders: THREEInterfases.ILoaders | null = null
    loadingManager: THREE.LoadingManager = new THREE.LoadingManager()
    data: any

    constructor() {
        super()
        this.setLoaders()
    }

    get _data() {
        return this.data
    }

    get _loaders(){
        return this.loaders
    }

    setLoaders() {
        this.loaders = {} as THREEInterfases.ILoaders
        this.loaders.gltfLoader = new GLTFLoader(this.loadingManager)
        this.loaders.fbxLoader = new FBXLoader(this.loadingManager)
        this.loaders.daeLoader = new ColladaLoader(this.loadingManager)
        this.loaders.textureLoader = new THREE.TextureLoader(this.loadingManager).setCrossOrigin("anonymous")
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader(this.loadingManager)
    }

    private replaceUrls(obj: string | readonly string[]) {
        return Array.isArray(obj) ? obj.map(o => _URL + o) : _URL + obj
    }

    private loadWith<T>(loader: { load: Function }, path: string | string[]): Promise<T> {
        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (result: T) => resolve(result),
                undefined,
                (err: any) => reject(err)
            )
        })
    }

    async startLoading(
        path: string | readonly string[],
        type: string,
        callback?: (result: unknown) => void
    ): Promise<unknown> {
        if (!this.loaders) throw new Error("Loaders not initialized")

        const call = (res: unknown) => {
            if (callback) callback(res)
            return res
        }

        const handlers: Record<string, () => Promise<unknown>> = {
            GLTF: async () => {
                const file: any = await this.loadWith(this.loaders!.gltfLoader, this.replaceUrls(path) as string)
                this.data = file.scene
                file.scene.traverse((child: any) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true
                        child.receiveShadow = true
                    }
                })
                return call(file.scene)
            },
            FBX: async () => {
                const file = await this.loadWith(this.loaders!.fbxLoader, this.replaceUrls(path) as string)
                return call(file)
            },
            DAE: async () => {
                const file = await this.loadWith(this.loaders!.daeLoader, this.replaceUrls(path) as string)
                return call(file.scene)
            },
            texture: async () => {
                const file = await this.loadWith(this.loaders!.textureLoader, this.replaceUrls(path) as string)
                return call(file)
            },
            localTexture: async () => {
                const file = await this.loadWith(this.loaders!.textureLoader, path as string)
                return call(file)
            },
            cubeTexture: async () => {
                const file = await this.loadWith(this.loaders!.cubeTextureLoader, path as string[])
                this.items["environmentMapTexture"] = file
                this.trigger("cubeTextureLoaded")
                return call(file)
            }
        }

        const handler = handlers[type]
        if (!handler) throw new Error(`Unknown source type: ${type}`)
        return handler()
    }

    async loadAll(
        resources: { path: string | string[]; type: string; key?: string; callback?: (res: unknown) => void }[]
    ): Promise<Record<string, unknown>> {
        const results: Record<string, unknown> = {}

        // параллельная загрузка
        await Promise.all(
            resources.map(async res => {
                const file = await this.startLoading(res.path, res.type, res.callback)
                if (res.key) results[res.key] = file
            })
        )

        return results
    }
}


/**--------------------- */


// import * as THREE from "three"
// import * as THREEInterfases from "@/types/interfases"

// import { _URL } from "@/types/constants"
// import { EventEmitter } from "./EventEmitter"
// import { FBXLoader, GLTFLoader, ColladaLoader } from "three/examples/jsm/Addons.js"

// export class Resources extends EventEmitter {
//     items: { [key: string]: unknown } = {}
//     loaders: THREEInterfases.ILoaders | null = null
//     loadingManager: THREE.LoadingManager = new THREE.LoadingManager()
//     data: any

//     // Добавляем кэш только для текстур
//     private textureCache: Map<string, THREE.Texture> = new Map()

//     constructor() {
//         super()
//         this.setLoaders()
//     }

//     get _data() {
//         return this.data
//     }

//     get _loaders(){
//         return this.loaders
//     }

//     setLoaders() {
//         this.loaders = {} as THREEInterfases.ILoaders
//         this.loaders.gltfLoader = new GLTFLoader(this.loadingManager)
//         this.loaders.fbxLoader = new FBXLoader(this.loadingManager)
//         this.loaders.daeLoader = new ColladaLoader(this.loadingManager)
//         this.loaders.textureLoader = new THREE.TextureLoader(this.loadingManager).setCrossOrigin("anonymous")
//         this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader(this.loadingManager)
//     }

//     private replaceUrls(obj: string | readonly string[]) {
//         return Array.isArray(obj) ? obj.map(o => _URL + o) : _URL + obj
//     }

//     private loadWith<T>(loader: { load: Function }, path: string | string[]): Promise<T> {
//         return new Promise((resolve, reject) => {
//             loader.load(
//                 path,
//                 (result: T) => resolve(result),
//                 undefined,
//                 (err: any) => reject(err)
//             )
//         })
//     }

//     /**
//      * Загружает текстуру с использованием кэша
//      * @param url - полный или относительный путь к текстуре
//      * @param isLocal - если true, url используется как есть (без префикса _URL)
//      */
//     private async loadCachedTexture(url: string, isLocal: boolean = false): Promise<THREE.Texture> {
//         const cacheKey = isLocal ? url : (this.replaceUrls(url) as string)

//         if (this.textureCache.has(cacheKey)) {
//             // Возвращаем клон, чтобы избежать изменения одной текстуры из разных материалов
//             // return this.textureCache.get(cacheKey)!.clone()
//                 return this.textureCache.get(cacheKey)
//         }

//         const texture = await this.loadWith<THREE.Texture>(
//             this.loaders!.textureLoader,
//             isLocal ? url : (this.replaceUrls(url) as string)
//         )

//         // Здесь можно задать общие настройки текстур один раз
//         // texture.flipY = false
//         // texture.colorSpace = THREE.SRGBColorSpace  // или LinearSRGBColorSpace в зависимости от версии three.js
//         // texture.wrapS = THREE.RepeatWrapping
//         // texture.wrapT = THREE.RepeatWrapping
//         // texture.needsUpdate = true

//         this.textureCache.set(cacheKey, texture)

//         return texture
//     }

//     async startLoading(
//         path: string | readonly string[],
//         type: string,
//         callback?: (result: unknown) => void
//     ): Promise<unknown> {
//         if (!this.loaders) throw new Error("Loaders not initialized")

//         const call = (res: unknown) => {
//             if (callback) callback(res)
//             return res
//         }

//         const handlers: Record<string, () => Promise<unknown>> = {
//             GLTF: async () => {
//                 const file: any = await this.loadWith(this.loaders!.gltfLoader, this.replaceUrls(path) as string)
//                 this.data = file.scene
//                 file.scene.traverse((child: any) => {
//                     if (child instanceof THREE.Mesh) {
//                         child.castShadow = true
//                         child.receiveShadow = true
//                     }
//                 })
//                 return call(file.scene)
//             },
//             FBX: async () => {
//                 const file = await this.loadWith(this.loaders!.fbxLoader, this.replaceUrls(path) as string)
//                 return call(file)
//             },
//             DAE: async () => {
//                 const file = await this.loadWith(this.loaders!.daeLoader, this.replaceUrls(path) as string)
//                 return call(file.scene)
//             },
//             texture: async () => {
//                 const file = await this.loadCachedTexture(path as string, false)
//                 return call(file)
//             },
//             localTexture: async () => {
//                 const file = await this.loadCachedTexture(path as string, true)
//                 return call(file)
//             },
//             cubeTexture: async () => {
//                 const file = await this.loadWith(this.loaders!.cubeTextureLoader, path as string[])
//                 this.items["environmentMapTexture"] = file
//                 this.trigger("cubeTextureLoaded")
//                 return call(file)
//             }
//         }

//         const handler = handlers[type]
//         if (!handler) throw new Error(`Unknown source type: ${type}`)
//         return handler()
//     }

//     async loadAll(
//         resources: { path: string | string[]; type: string; key?: string; callback?: (res: unknown) => void }[]
//     ): Promise<Record<string, unknown>> {
//         const results: Record<string, unknown> = {}

//         await Promise.all(
//             resources.map(async res => {
//                 const file = await this.startLoading(res.path, res.type, res.callback)
//                 if (res.key) results[res.key] = file
//             })
//         )

//         return results
//     }

//     /**
//      * Очистка кэша текстур (рекомендуется вызывать при смене сцены/уровня)
//      */
//     public clearTextureCache(): void {
//         for (const texture of this.textureCache.values()) {
//             texture.dispose()
//         }
//         this.textureCache.clear()
//     }

//     /**
//      * Полное освобождение ресурсов (опционально)
//      */
//     public dispose(): void {
//         this.clearTextureCache()
//         // При необходимости можно добавить очистку других loaders / items
//         this.items = {}
//         this.data = null
//     }
// }