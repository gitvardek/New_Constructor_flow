
// @ts-nocheck
import * as THREE from 'three'
import * as THREETypes from "@/types/types"
import { useAppData } from "@/store/appliction/useAppData"

import { GlobalsData } from './Utils/Globals'
import { CUTTER_PARAMS } from "@/ConstructorTabletop/CutterScripts/CutterConst"
import { label, userData } from 'three/webgpu'
export class BuildersHelper extends GlobalsData {

    resources: THREETypes.TResources
    scene: THREE.Scene
    room: THREETypes.TRoomManager
    root: THREETypes.TApplication

    constructor(root: THREETypes.TApplication) {

        super();
        this.resources = root._resources
        this.scene = root._scene
        this.room = root._roomManager
        this.root = root
    }

    public createModelData(data: THREETypes.TObject, props: THREETypes.TObject, size: { width: number, height: number, depth: number }) {
        let model_data = { ...data }
        let color = this._FASADE[props.CONFIG.MODULE_COLOR]
        const colorWidth = color?.DEPTH || 18;
        const leftWidth = props.CONFIG.LEFTSIDECOLOR?.COLOR ? this._FASADE[props.CONFIG.LEFTSIDECOLOR.COLOR]?.DEPTH : colorWidth || 18;
        const rightWidth = props.CONFIG.RIGHTSIDECOLOR?.COLOR ? this._FASADE[props.CONFIG.RIGHTSIDECOLOR.COLOR]?.DEPTH : colorWidth || 18;

        model_data = this.expressionsReplace(
            model_data,
            {
                "#X#": size.width,
                "#Y#": size.height,
                "#Z#": size.depth,
                "#MATERIAL_THICKNESS#": colorWidth,
                "#LEFT_THICKNESS#": leftWidth,
                "#RIGHT_THICKNESS#": rightWidth,
                "#HORIZONT#": props.CONFIG.NOBOTTOM ? 0 :
                    props.CONFIG.HORIZONT || props.CONFIG.HORIZONT === 0 ? props.CONFIG.HORIZONT :
                        props.EXPRESSIONS["#HORIZONT#"] || 78,  //78 - стандартная высота цоколя на случай отсутствия данных
            },
        )

        model_data = this.expressionsReplace(
            model_data,
            props.CONFIG.EXPRESSIONS
        )

        return model_data
    };

    public getProductSize(PARAMS: any, productData: THREETypes.TObject) {

        const product = this._PRODUCTS[PARAMS.ID];
        const materialThickness = this._FASADE[PARAMS.MODULE_COLOR]?.DEPTH ?? 18;
        const horizont = PARAMS.NOBOTTOM ? 0 : PARAMS.HORIZONT ?? 78;

        const filling = this._FILLING[product.FILLING[0]] || {};
        const { FASADE_PROPS, SIZEEDITJOINDEPTH } = PARAMS

        // Вычисляем высоту один раз
        const roomHeight = this.root._roomManager._currentRoomHeight;
        const resolvedHeight = productData.height === "#ROOM_HEIGHT#" ? roomHeight : productData.height;

        // Базовые подстановки
        const expressions: Record<string, any> = {
            "#MWIDTH#": productData.width,
            "#MODUL_MWIDTH#": productData.width,
            "#MODUL_WIDTH#": productData.width,
            "#X#": productData.width,
            "#MHEIGHT#": resolvedHeight,
            "#MODUL_MHEIGHT#": resolvedHeight,
            "#MODUL_HEIGHT#": resolvedHeight,
            "#Y#": productData.height,
            "#MDEPTH#": productData.depth,
            "#MODUL_MDEPTH#": productData.depth,
            "#MODUL_DEPTH#": productData.depth,
            "#Z#": productData.depth,
            "#SIZEEDITJOINDEPTH#": SIZEEDITJOINDEPTH ?? productData.SIZE_EDIT_JOINDEPTH_MIN,
            "#MATERIAL_THICKNESS#": materialThickness,
            "#HORIZONT#": horizont,
            "#VSECTION_MAX#": filling.VSECTION_MAX,
            "#VSECTION_MIN#": filling.VSECTION_MIN,
            "#ROOM_HEIGHT#": roomHeight
        };

        // Обработка фасадных размеров
        Object.entries(PARAMS.FASADE_SIZE).forEach(([_, value], ndx) => {
            const incomeData = FASADE_PROPS[ndx].SIZES
            const customKey = `FASADESIZE${ndx + 1}`
            expressions[`#${customKey}#`] = incomeData.id;

            if (customKey === "FASADESIZE1" || customKey === "FASADESIZE2") {
                const size = this._FASADESIZE[incomeData.id];
                const suffix = customKey.endsWith("1") ? "1" : "2";
                expressions[`#FASADESIZEWIDTH${suffix}#`] = incomeData.params.FASADE_WIDTH ?? size.WIDTH;
                expressions[`#FASADESIZEDEPTH${suffix}#`] = size.DEPTH;
                expressions[`#FASADESIZEDIFFWIDTH${suffix}#`] = size.DIFFWIDTH;
                expressions[`#FASADESIZEDIFFDEPTH${suffix}#`] = size.DIFFDEPTH;
            }
        });

        PARAMS.EXPRESSIONS = expressions;

        const depthCalc = productData.SIZE_EDIT_DEPTH_MAX
            ? PARAMS.SIZE.depth
            : productData.depth;

        const size = {

            width: parseFloat(productData.width),
            height: parseFloat(resolvedHeight),
            depth: parseFloat(depthCalc),
        };

        if (PARAMS.MODELID) {
            const modelData = this._MODELS[PARAMS.MODELID]
            const model = this.expressionsReplace(modelData, expressions);

            if (model.width) size.width = parseInt(eval(model.width));
            if (model.height) size.height = parseInt(eval(model.height));
            if (model.depth) size.depth = parseInt(eval(model.depth));
        }

        // Запасные значения
        size.width ||= parseFloat(productData.width);
        size.height ||= parseFloat(resolvedHeight);
        size.depth ||= parseFloat(productData.depth);

        return size;
    }

    public getSizeEdit(product_data: THREETypes.TObject, props: THREETypes.TObject) {

        let sizeEdit = Object.keys(props.SIZE_EDIT)
        let productArr = this.filterObjectByKeys(product_data, sizeEdit)
        return productArr
    }

    public getExec(obj) {
        Object.entries(obj).forEach(([key, value]) => {


            if (key == "NAME" || key == "drawer" || key == "box_color" || key == "fasade_color" || key.includes("PROPERTY_FASADE_NUMBER_VALUE_ID")) {
                obj[key] = value;
            } else {
                obj[key] = eval(value);
            }
        });
        return obj;
    };

    public expressionsReplace(obj: any, expressions: THREETypes.TObject) {

        if (!expressions || !Object.keys(expressions).length) return obj;

        let objStr: THREETypes.TObject | string | number = obj;

        // Преобразуем объект в строку, если это объект
        if (typeof obj == "object") {
            objStr = JSON.stringify(obj);
        }

        // Заменяем выражения
        Object.entries(expressions).forEach(([k, v]) => {
            if (typeof objStr != "number") {
                objStr = objStr.split(k).join(v);
            }
        });

        // Возвращаем объект или строку
        if (typeof obj == "object") {
            return JSON.parse(objStr as string);
        } else {
            return objStr;
        }
    };

    public calculateFromString(expression) {
        try {
            const func = new Function("return " + expression);
            return func();
        } catch (error) {
            console.error(expression, '---"Недопустимое выражение!"')
            return "Недопустимое выражение!";
        }
    }

    public getStartPosition(size: THREETypes.TObject) {
        return new THREE.Vector3(-size.width * 0.5, -size.height * 0.5, -size.depth * 0.5);
    };

    public checkColor(product: THREETypes.TObject) {
        const { PRODUCT, CONFIG, texture } = product;
        const { BASKET } = CONFIG;
        const curProduct = this._PRODUCTS[PRODUCT];

        const checkModuleColor = () => {
            const moduleColor = BASKET.MODULECOLOR;
            if (!this._FASADE[moduleColor]) {
                BASKET.MODULECOLOR = curProduct.MODULECOLOR[0];
                return this._FASADE[curProduct.MODULECOLOR[0]];
            }
            return this._FASADE[moduleColor];
        };

        if (BASKET.COLOR) {
            return this._COLOR[BASKET.COLOR];
        }
        if (BASKET.MODULECOLOR) {
            return checkModuleColor();
        }
        if (texture) {
            return {
                TEXTURE: texture.src,
                TEXTURE_HEIGHT: texture.height,
                TEXTURE_WIDTH: texture.width,
            };
        }
        return false;
    }

    public calculateHeight(object: THREE.Object3D) {

        let box = new THREE.Box3().setFromObject(object)
        const forTableSize = new THREE.Vector3()
        const tableSize = box.getSize(forTableSize)
        return tableSize.y
    }

    public isEmpty(obj: {}) {
        return Object.keys(obj).length === 0
    };

    public filterObjectByKeys(obj: THREETypes.TObject, keys: string[]) {
        return Object.fromEntries(
            Object.entries(obj).filter(([key]) => keys.includes(key))
        );
    }


    //----------------------------------------------------------
    /** @Настройка материала */
    //----------------------------------------------------------
    public getTexture({ material, url, texture_size }: { material: any, url: string, texture_size?: THREETypes.TObject }) {

        this.resources.startLoading(url, 'texture', (file) => {
            if (file instanceof THREE.Texture) {
                file.colorSpace = THREE.SRGBColorSpace
                material.map = file
                // material.needsUpdate = true;
                if (texture_size) {
                    material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
                    material.map.repeat.set(
                        1 / texture_size.width,
                        1 / texture_size.height
                    );
                    material.map.offset.set(0.5, 0.5);
                }
                material.needsUpdate = true;

            }
        });
    }


    public async getMaterial({ material, url, texture_size }: { material: any, url: string, texture_size?: THREETypes.TObject }) {
        const loadedMaterial = await this.resources.startLoading(url, 'texture', (file) => {
            if (file instanceof THREE.Texture) {
                file.colorSpace = THREE.SRGBColorSpace
                material.map = file
                if (texture_size) {
                    material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
                    material.map.repeat.set(
                        1 / texture_size.width,
                        1 / texture_size.height
                    );
                    material.map.offset.set(0.5, 0.5);
                }
                material.needsUpdate = true;

            }
        });
        return loadedMaterial
    }

    public createNishaMaterial(url, size, comand) {
        // console.log(comand)


        const material = new THREE.MeshStandardMaterial({
            metalness: 0.5,
            roughness: 0.5,
        });
        const { x, y } = size;

        const TILE_SIZE = 1
        this.resources.startLoading(url, 'texture', (file) => {
            if (file instanceof THREE.Texture) {

                file.colorSpace = THREE.SRGBColorSpace
                material.map = file;
                material.map.wrapS = THREE.RepeatWrapping;
                material.map.wrapT = THREE.RepeatWrapping;
                material.map.repeat.set(
                    (parseFloat(x) * (parseFloat(x) / parseFloat(y)) * TILE_SIZE + parseFloat(x) * TILE_SIZE),
                    (parseFloat(y) * (parseFloat(y) / parseFloat(x)) * TILE_SIZE + parseFloat(y) * TILE_SIZE)
                )

                material.map.offset.set(0.5, 0.5);

            }
            material.needsUpdate = true;

        });


        return material
    }


    public changeColor({
        object,
        url,
        textureSize,
        type
    }: {
        object: THREE.Object3D;
        url: string;
        textureSize?: { x: number, y: number };
        type?: string;
    }) {


        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#ffffff'),
            // opacity: 1
        });
        object.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            if (child.userData.type === "glass") return;
            if (child.userData.mergedGeometry) {
                child.material = material
                this.getTexture({
                    material,
                    url: url,
                });
                return
            }

            this.resources.startLoading(url, "texture", (file) => {
                if (!(file instanceof THREE.Texture)) return;
                child.material = material
                this.applyTexture(child, file, textureSize, type);
            });
        });
    }

    //----------------------------------------------------------
    /** @Настройка текстуры и параметров материала */
    //----------------------------------------------------------
    public applyTexture(
        child: THREE.Mesh,
        texture: THREE.Texture,
        textureSize?: THREE.Vector3,
        type?: string
    ) {
        texture.colorSpace = THREE.SRGBColorSpace;
        child.material.map = texture;

        // Настройка повторения и смещения
        if (textureSize) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1 / textureSize.x, 1 / textureSize.y);
            texture.offset.set(0.5, 0.5);
        }

        // Настройки для палитры
        if (type === "Palette" && child.material instanceof THREE.MeshStandardMaterial) {
            Object.assign(child.material, {
                metalness: 0.7,
                roughness: 0.05,
                clearcoat: 1,
                clearcoatRoughness: 0
            });
        }

        child.material.needsUpdate = true;
    }

    public createExtrudeBoxGeometry(options: THREETypes.TObject) {
        let extrusionSettings = Object.assign({
            depth: 16,
            curveSegments: 1,
            bevelThickness: 0,
            bevelSize: 1,
            bevelSegments: 1,
            bevelEnabled: false,
        }, options);

        extrusionSettings.depth = options.z;

        if (options.bevelEnabled) {
            options.x -= extrusionSettings.bevelSize * 2;
            options.y -= extrusionSettings.bevelSize * 2;
        }

        let geometry = new THREE.ExtrudeGeometry(
            new THREE.Shape([
                new THREE.Vector2(-options.x / 2, -options.y / 2),
                new THREE.Vector2(options.x / 2, -options.y / 2),
                new THREE.Vector2(options.x / 2, options.y / 2),
                new THREE.Vector2(-options.x / 2, options.y / 2),
            ]),
            extrusionSettings
        );

        // console.log(geometry, 'KKgeometry')

        return geometry;
    }

    public addIfNotExists(array, obj) {
        const exists = array.some(item =>
            Object.keys(obj).every(key => item[key] === obj[key])
        );

        if (!exists) {
            return true
        }
        return false
    }

    public getRandomInt(min: number, max: number) {
        const minCeiled = Math.ceil(min);
        const maxFloored = Math.floor(max);
        return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
    }

    public planarUV(geometry) {


        geometry.computeBoundingBox();

        var max = geometry.boundingBox.max,
            min = geometry.boundingBox.min;
        var offset = new THREE.Vector2(0 - min.x, 0 - min.y);
        var range = new THREE.Vector2(max.x - min.x, max.y - min.y);
        // var faces = geometry.faces;

        const faces = geometry.getAttribute('position');

        for (let i = 0; i < faces.count; i += 3) {

            const a = i;
            const b = i + 1;
            const c = i + 2;

        }

        geometry.getAttribute('uv')[0] = [];

        for (var i = 0; i < faces.length; i++) {

            var v1 = geometry.vertices[faces[i].a],
                v2 = geometry.vertices[faces[i].b],
                v3 = geometry.vertices[faces[i].c];

            geometry.faceVertexUvs[0].push([
                new THREE.Vector2((v1.x + offset.x) / range.x, (v1.y + offset.y) / range.y),
                new THREE.Vector2((v2.x + offset.x) / range.x, (v2.y + offset.y) / range.y),
                new THREE.Vector2((v3.x + offset.x) / range.x, (v3.y + offset.y) / range.y)
            ]);
        }
        geometry.uvsNeedUpdate = true;
    }

    public normalizeUVsTo01(geometry: THREE.BufferGeometry) {
        const uv = geometry.attributes.uv;
        if (!uv) return;

        // Находим bounding box геометрии в локальных координатах
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox!;

        const sizeX = bbox.max.x - bbox.min.x;
        const sizeY = bbox.max.y - bbox.min.y;

        // Если размеры нулевые или почти нулевые — ничего не делаем
        if (sizeX < 0.001 || sizeY < 0.001) return;

        // Нормализуем UV: приводим к диапазону [0..1] по реальным размерам
        for (let i = 0; i < uv.count; i++) {
            const u = uv.getX(i);
            const v = uv.getY(i);

            // Предполагаем, что UV изначально в миллиметрах (от 0 до width/height)
            const normalizedU = (u - bbox.min.x) / sizeX;
            const normalizedV = (v - bbox.min.y) / sizeY;

            uv.setXY(i, normalizedU, normalizedV);
        }

        uv.needsUpdate = true;
    }

    public addAdditionalKeys = (obj, additionalKeys) => (
        Object.entries(additionalKeys).forEach(([newKey, existingKey]) =>
            obj[newKey] = obj[existingKey] ?? console.warn(`Ключ "${existingKey}" не найден в объекте.`)
        ), obj
    );

    public getRootObject(object: THREE.Object3D): THREE.Object3D {
        let root = object;
        while (root.parent && root.parent.type !== 'Scene') {
            root = root.parent;
        }

        return root;
    }

    public createStartTopTableCutData(uslugi, product_data) {


        const { width, depth, height } = product_data
        const startCutData = {
            groupID: `f${(~~(Math.random() * 1e8)).toString(16)}`, // Идентификатор группы
            modelHeight: height, // Высота для итогового объекта в THREE js
            canvasHeight: depth, // Высота для PIXI js
            data: [
                [
                    {
                        width,
                        height: depth,
                        roundCut: {},
                        holes: [],
                        serviseData: uslugi,
                        disabled: false

                    }
                ]
            ]
        }

        return startCutData
    }

    public createCutterParams(uslugi) {
        // const SERVISES = CUTTER_PARAMS.CUT_SERVISES
        // console.log(uslugi, ' ====== uslugi =====', SERVISES)

        const result = uslugi.map(obj1 => {
            const obj2 = SERVISES.find(o => o.ID === obj1.ID);
            let merged;
            if (obj2) {
                const extras = Object.fromEntries(
                    Object.entries(obj2).filter(([key]) => {
                        return !(key in obj1) && key != 'pos'
                    })
                )

                merged = { ...obj1, ...extras };
                merged.POSITION = merged.POSITION.toLowerCase()
                if (merged.POSITION === 'center') {
                    let sercher
                    if (merged.radiogroups.length) {
                        sercher = merged.radiogroups.join('_');
                        merged.POSITION = sercher;
                    }
                }
            }

            else {
                merged = { ...obj1 };

                if (!merged.POSITION) {
                    let sercher
                    if (merged.radiogroups.length) {
                        sercher = merged.radiogroups.join('_');
                        ['left', 'right'].forEach(el => {
                            if (sercher.includes(el)) sercher += '_bottom'
                        })
                        merged.POSITION = sercher;
                    }
                    else {
                        merged.POSITION = 'global';
                    }


                }
            }
            // if (!merged) return
            if ("width" in merged) {
                const w1 = obj1.width;
                const w2 = obj2 ? obj2.width : undefined;

                if (typeof w1 === "string" && typeof w2 === "number") {
                    merged.width = w2;
                }

                if (typeof w1 === "string" && w2 === undefined) {
                    delete merged.width;
                }
            }

            if (merged.POSITION.includes('kromka')) {
                merged.POSITION = merged.POSITION + '_global'
            }

            return merged;

        })

        // .filter(el => el.ID !== 98683);
        return result

        // .filter(el => parseInt(el.separated) !== 0);
    }

    public createPlinthParams(models) {
        const basePlinth = Object.values(this._PLINTH)[0]
        const inProdModel = this._MODELS[models[0]]
        const jsonPlinth = inProdModel.json.plinth

        if (jsonPlinth) {
            return {
                front: { value: true, modelId: basePlinth, surfaceId: null, label: 'Центральный цоколь' },
            }
        }

        return {
            front: { value: true, modelId: basePlinth, surfaceId: null, label: 'Центральный цоколь' },
            left: { value: false, modelId: basePlinth, surfaceId: null, label: 'Левый цоколь' },
            right: { value: false, modelId: basePlinth, surfaceId: null, label: 'Правый цоколь' }
        }
    }

    public findElementsBySectorId(data, sectorId) {
        let result = null;

        // Рекурсивная функция для обхода массива
        function traverse(arr) {
            for (const item of arr) {
                if (Array.isArray(item)) {
                    // Если элемент — массив, рекурсивно обходим его
                    traverse(item);
                } else if (item && typeof item === 'object' && item.sectorId === sectorId) {
                    // Если элемент — объект и его sectorId совпадает, добавляем в результат
                    result = item;
                }
            }
        }

        traverse(data);

        return result;
    }

    public findKeyInObject(obj, keys) {
        for (const key of keys) {
            if (obj.hasOwnProperty(key)) {
                return key;
            }
        }
        return null;
    }

    public computeAABB(object: THREE.Object3D): THREE.Box3 {
        const box = new THREE.Box3();
        const size = new THREE.Vector3()


        object.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.name !== 'TABLETOP' && child.name !== "ARROWS" && child.name !== 'FASADE') {
                const geometry = child.geometry;
                if (!geometry.boundingBox) {
                    geometry.computeBoundingBox();
                }

                const childBox = geometry.boundingBox!.clone();
                childBox.applyMatrix4(child.matrixWorld);

                box.union(childBox);
            }
        });

        box.getSize(size)

        return box;
    }

    public mergeArrays(arr1, arr2, { key = "ID", overwrite = false } = {}) {

        return arr1.map(obj1 => {
            const obj2 = arr2.find(o => o[key] === obj1[key]);
            let merged;

            if (obj2) {
                if (overwrite) {
                    merged = { ...obj1, ...obj2 };
                } else {
                    const extras = Object.fromEntries(
                        Object.entries(obj2).filter(([k]) => !(k in obj1))
                    );
                    merged = { ...obj1, ...extras };
                }
            } else {
                merged = { ...obj1 };
                if (!("pos" in merged)) {
                    merged.pos = "CENTER";
                }
            }

            // обработка width у всех объектов
            if ("width" in merged) {
                const w1 = obj1.width;
                const w2 = obj2 ? obj2.width : undefined;

                if (typeof w1 === "string" && typeof w2 === "number") {
                    merged.width = w2;
                }

                if (typeof w1 === "string" && w2 === undefined) {
                    delete merged.width;
                }
            }

            return merged;
        });
    }

}