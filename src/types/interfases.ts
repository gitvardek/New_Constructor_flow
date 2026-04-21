import * as THREE from "three";
import { TSize, TTrafficManager, TCustomBoxHelper } from "../types/types";
import { FBXLoader, GLTFLoader, ColladaLoader } from "three/examples/jsm/Addons.js";

declare global {

    interface Window {
        requestFileSystem?: (
            type: number,
            size: number,
            successCallback: FileSystemEntryCallback,
        ) => void;

        webkitRequestFileSystem?: (
            type: number,
            size: number,
            successCallback: FileSystemEntryCallback,
        ) => void;
    }
}

/** THREE JS */


//------------------
/** @PROJECT_PARAMS */
//------------------

export interface IProjectParams {
    projectId: number | string | null,
    type: string,
    rooms: IRoom[],
    camera?: ICameraData,
    lights?: ILightsObjects,
    height_clamp?: number,
    table_color?: number | null,
    table_top_type_auto?: number | null,
    default_table_color?: number | null,
    default_fasade_top?: number | null,
    default_fasade_bottom?: number | null,
    default_fasade_color?: number | null,
    default_floor?: number | null,
    default_wall?: number | null,
    default_module_color_bottom?: number | null,
    default_module_color_top?: number | null,
    default_module_color?: number | null,
    default_milling_down?: number | null,
    default_milling_up?: number | null,
    default_palit_down?: number | null,
    default_palit_up?: number | null,
    default_overlay_id?: number[],
    default_table_model?: number,
    default_handles?: number,
    project_name?: number | null | string,
    default_plinth_body?: number | null,
    default_plinth_color?: number | null
    default_showcase?: number | null,
    default_milling?: number | null,
    mirror_type?: number | null,

}

export interface IContentItem {
    id?: number;
    uuid?: string;
    position?: IVector3;
    rotation?: IRotationEuler;
    size?: TSize;
}

export interface IRoom {
    id: number | string;
    label?: string;
    description?: string;
    params: IWallSizes;
    content?: IContentItem[] | any[];
    basket?: any[]
}

export interface IWallSizes {

    walls: IWallData[]
    floor: string | number
    wall: string | number
}

interface IVector3 {
    x: number;
    y: number;
    z: number;
}

interface IGeometryOpt {
    x: number | string,
    y: number | string,
    z: number | string
}

interface IGeometry {
    type: string,
    opt: IGeometryOpt
}

export interface IProductGeometry {
    id: string,
    type: string,
    geometry: IGeometry,
    rotation: IRotation,
    position: IPosition
}

export interface IRotationEuler {
    isEuler: boolean,
    _x: number,
    _y: number,
    _z: number,
    _order: 'XYZ' | string
}

export interface IRotation {
    x: number | string,
    y: number | string,
    z: number | string,
}

export interface IPosition {
    x: number | string,
    y: number | string,
    z: number | string,
}

export interface IWallData {
    id: number | string
    width: number;
    height: number;
    depth?: number;
    position: IVector3,
    rotation: IRotationEuler,
    side: number
}

/**---------------------------------------------- */

export interface ICameraData {
    position: number[],
    target: { x: number, y: number, z: number },
    fov: number,
    near: number,
    far: number

}

export interface IOrtoCameraData {
    position: [number, number, number],
    target: { x: number, y: number, z: number },
    near: number,
    far: number
}

export interface IMaterialData {
    type?: THREE.Material,
    side?: number,
    clearcoat?: number,
    clearcoatRoughness?: number,
    metalness?: number,
    roughness?: number,
    color?: THREE.Color | number | string,
    transparent?: boolean,
}

export interface IPbrMaterialData extends IMaterialData {
    map?: THREE.Texture,
    aoMap?: THREE.Texture,
    aoMapIntensity?: number
    metalnessMap?: THREE.Texture,
    roughnessMap?: THREE.Texture,
    normalMap?: THREE.Texture,
}

export interface IlightData {
    type?: string,
    normalBias?: number,
    bias?: number,
    castShadow?: boolean,
    receiveShadow?: boolean,
    mapSize?: number,
    color?: THREE.Color | number | string,
    intensity?: number,
    distance?: number,
    position?: [number, number, number]
    decay?: number
}

export interface ILightsObjects {
    ambientLight: IlightData;
    pointLight: IlightData;
}

export interface Source {
    type: 'gltfModel' | 'texture' | 'cubeTexture';
    path: string;
    name: string;
}

export interface ILoader {
    load: (path: string, callback: (file: unknown) => void, loaded?: (url: any, itemsLoaded: any, itemsTotal: any) => void, error?: (file: unknown) => void) => void;
}

export interface ILoaders {
    gltfLoader: GLTFLoader;
    textureLoader: THREE.TextureLoader;
    cubeTextureLoader: THREE.CubeTextureLoader;
    fbxLoader: FBXLoader;
    daeLoader: ColladaLoader;
}

export interface IModelsData {
    ID?: string | number;
    id: string;
    name: string;
    json: any | null;
    type_label: string;
    type: string;
    shininess: number;
    material: string | null;
    color: string | null;
    DAE: string;
    file: string | null;
    model_type: string;
    scale: number;
    width: number | null;
    height: number | null;
    depth: number | null;
    corr_x: number | null;
    corr_y: number | null;
    corr_z: number | null;
    loop_position: number | null;
    loop_model: string | null;
    wall_thickness: number | null;
    moduleType: any
}

export interface IShelfData {
    X: number[],
    Y: number[],
    WIDTH_CORRECTION: number
}

export interface IMouseData {
    "x": number,
    "y": number
}

export interface ISetProduct {


    object?: THREE.Object3D,
    point?: THREE.Vector3,
    rotate?: THREE.Vector3 | THREE.Euler | null,


    trafficManager?: TTrafficManager,
    boxHelper?: TCustomBoxHelper,
    wall?: THREE.Object3D | THREE.Mesh,
}

export interface IClampPosition {
    position: THREE.Vector3,
    rotation: THREE.Vector3 | THREE.Euler | null,
    quaternion: THREE.Quaternion
}

//------------------
/** @PRODUCT */
//------------------

type Nullable<T> = T | null;
type NullableArray<T> = Array<Nullable<T>>;

interface IIPropertyValues {
    SECTION_META_DESCRIPTION: string;
    ELEMENT_META_DESCRIPTION: string;
    ELEMENT_META_TITLE: string;
    SECTION_META_TITLE: string;
    SECTION_PAGE_TITLE: string;
}

interface ITexture {
    src: string;
    width: number;
    height: number;
    size: string;
}

export interface IProduct {
    ID: number;
    SORT: number;
    NAME: string;
    IPROPERTY_VALUES: IIPropertyValues;

    FACADE: NullableArray<number>;
    OPTION: NullableArray<number>;
    GLASS: NullableArray<number>;
    MILLING: NullableArray<number>;
    CITY: NullableArray<number>;
    COLOR: NullableArray<number>;

    SIZE_EDIT: Nullable<number>;
    SIZE_EDIT_HEIGHT: NullableArray<number>;
    SIZE_EDIT_WIDTH_MIN: Nullable<number>;
    SIZE_EDIT_WIDTH_MAX: Nullable<number>;
    SIZE_EDIT_HEIGHT_MIN: Nullable<number>;
    SIZE_EDIT_HEIGHT_MAX: Nullable<number>;
    SIZE_EDIT_WIDTH: NullableArray<number>;

    models: number[];
    width: number;
    depth: number;
    height: number;

    element_type: Nullable<string>;
    tabletop: Nullable<string>;
    HEM: NullableArray<number>;

    SIZE_EDIT_STEP_WIDTH: Nullable<number>;
    SIZE_EDIT_TERMS_MULTIPLICITY: Nullable<number>;
    SIZE_EDIT_STEP_HEIGHT: Nullable<number>;

    texture: ITexture;
    INCITY: NullableArray<number>;

    plinth_length: Nullable<number>;
    disable_raycast: number;
    count_in_basket: Nullable<number>;
    SIZE_EDIT_STEP_DEPTH: Nullable<number>;
    SIZE_EDIT_DEPTH: NullableArray<number>;
    SIZE_EDIT_DEPTH_MIN: Nullable<number>;
    SIZE_EDIT_DEPTH_MAX: Nullable<number>;
    MILLING_ALT: Nullable<number>;

    USLUGI: number[];
    SIZE_EDIT_CALC_TYPE: Nullable<number>;
    FILLING: NullableArray<number>;
    leg_length: number;
    profile: NullableArray<number>;
    FACADEALIGNSELECT: Nullable<number>;
    substitution_width: Nullable<number>;
    substitution_height: Nullable<number>;
    substitution_depth: Nullable<number>;

    texture_type: Nullable<string>;
    texture_rotation: Nullable<string>;
    texture_scale: Nullable<string>;

    EN_NAME: string;
    MODULECOLOR: NullableArray<number>;
    SHELFQUANT: Nullable<number>;
    type_showcase: NullableArray<number>;
    fasade_type: NullableArray<number>;
    other_models: NullableArray<number>;

    DE_NAME: string;
    FASADE_SIZES: NullableArray<number>;
    texture_map: Nullable<string>;
    ACTUAL_DEPT: Nullable<number>;
    IS_BOX_SECTION: number;
    CAN_HIDE_EL: number;
    SIZE_EDIT_JOINDEPTH_MIN: Nullable<number>;
    SIZE_EDIT_JOINDEPTH_MAX: Nullable<number>;
    PRODUCT_MECHANISM: NullableArray<number>;

    DATA_PETROVICH: Nullable<number>;
    CNSTR_MIN_WIDTH: Nullable<number>;
    NULL_PRICE: number;
    TEST: number;
    MIN_FASADE_SIZE: Nullable<number>;
    MAX_FASADE_SIZE: Nullable<number>;
    LOOPSIDE: NullableArray<number>;
    REC_HEM: NullableArray<number>;
    productType: Nullable<string>;
    DOP_PRODUCT: NullableArray<number>;
    HANDLES: NullableArray<number>;
    canSetSideProfile: number;
    ALTERNATIVE_PRODUCT: NullableArray<number>;

    LANG: string;
    OPTIONSECTION_ID: false | number;
    PREVIEW_PICTURE: string;
    FILLING_SECTION: false | number;
}

export interface IFillingConfig {
    readonly ID: number;
    readonly NAME: string;
    readonly IMG: string;
    readonly SMALL: string;
    readonly NO_FASADE: boolean | null;

    /** Условие в виде строки, например: "(#X#>=600&&#X#<=1200) && (#Y#>2100)" */
    readonly CONDITIONS: string;

    readonly VSECTION: number;
    readonly VSECTION_MIN: number;
    readonly VSECTION_MAX: number;
    readonly SHELFQUANT: number;
    readonly VSECTION_DEPTH: number | null;

    readonly HEIGHT_PLINTH: number;
    readonly HEIGHT_CORNICE: number;

    readonly PROP_ALIGN: {
        VALUE: string | null;
        VALUE_ENUM: string | null;
        PROPERTY_VALUE_ID: string | null;
        VALUE_XML_ID: string | null;
    } | null;

    /** ID связанных 3D-моделей */
    readonly MODELS: readonly number[];

    readonly GROUP_SECTION: unknown | null;
    readonly SORT: number;
}
