import * as THREE from "three";
import { Application } from "@/Application/Core/Application";
import { Renderer } from "@/Application/Core/Renderer";
import { TrafficManager } from "@/Application/Movement/TrafficManager";
import { MoveManager } from "@/Application/Movement/MoveManager";
import { RoomManager } from "@/Application/Room/RoomManager";
import { Resources } from "@/Application/Utils/Resources";
import { Ruler } from "@/Application/Utils/Ruler";
import { CustomBoxHelper } from "@/Application/Utils/BoxHelperCustom";
import { BuildProduct } from "@/Application/Meshes/BuildProduct";
import { MillingBuilder } from "@/Application/Meshes/MillingBuilder";
import { PaletteBuilder } from "@/Application/Meshes/PaletteBuilder";
import { ShowcaseBuilder } from "@/Application/Meshes/Showcase/ShowcaseBuilder";
import { MeshEvents } from "@/Application/Meshes/Utils/Events";
import { SetObject } from "@/Application/Utils/SetObject";
import { AlumBuilder } from "@/Application/Meshes/AlumBuilder";
import { UniformTextureBuilder } from "@/Application/Meshes/UniformTextureBuilder";
import { KeybordListeners } from "@/Application/Utils/KeybordListeners";
import { UniformTextureEvents } from "@/Application/Meshes/UniformTextureUtils/UniformTextureEvents";
import { UniversalGeometryBuilder } from "@/Application/Meshes/UniversalModuleUtils/UniversalGeometryBuilder.ts";
import { DeepDispose } from "@/Application/Utils/DeepDispose";
import { AppLights } from "@/Application/Lights/Lights";
import { GeometryBuilder } from "@/Application/Meshes/GeometryBuilder";
import { JsonBuilder } from "@/Application/Meshes/JsonProductBuilder";
import { EdgeBuilder } from "@/Application/Meshes/EdgeBuilder/EdgeBuilder";
import { UseEdgeBuilder } from "@/Application/Meshes/EdgeBuilder/useEdgeBuilder";
import { HandlesBuilder } from "@/Application/Meshes/Handles/Handles";
import { ModelsBuilder } from "@/Application/Meshes/ModelsBuilder/ModelsBuilder";
import { PlinthBuilder } from "@/Application/Meshes/PlinthBuilder/PlinthBuilder";
import { ShelfBuilder } from "@/Application/Meshes/Shelf/ShelfBuilder";

import { useEventBus } from "@/store/appliction/useEventBus";
import { useRoomState } from "@/store/appliction/useRoomState";
import { useAppData } from "@/store/appliction/useAppData";
import { useSceneState } from "@/store/appliction/useSceneState";
import { useCustomiserStore } from "@/store/appStore/useCustomiserStore";
import { useObjectData } from "@/store/appliction/useObjectData";
import { useRoomContantData } from "@/store/appliction/useRoomContantData";
import { useUniformState } from "@/store/appliction/useUniformState";
import { useModelState } from "@/store/appliction/useModelState";
import { useMenuStore } from "@/store/appStore/useMenuStore";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";

export type TApplication = Application
export type TRenderer = Renderer
export type TMeshEvents = MeshEvents
export type TTrafficManager = TrafficManager
export type TMoveManager = MoveManager
export type TRoomManager = RoomManager
export type TResources = Resources
export type TRuler = Ruler
export type TScene = THREE.Scene
export type TCustomBoxHelper = CustomBoxHelper
export type TBuildProduct = BuildProduct
export type TMillingBuilder = MillingBuilder
export type TShowcaseBuilder = ShowcaseBuilder
export type TPaletteBulider = PaletteBuilder
export type TSetObject = SetObject
export type TAlumBuilder = AlumBuilder
export type TUniformTextureBuilder = UniformTextureBuilder
export type TKeybordListeners = KeybordListeners
export type TUniformTextureEvents = UniformTextureEvents
export type TDeepDispose = DeepDispose
export type TAppLights = AppLights
export type TUniversalGeometryBuilder = UniversalGeometryBuilder
export type TGeometryBuilder = GeometryBuilder
export type TJSONBuilder = JsonBuilder
export type TEdgeBuilder = EdgeBuilder
export type TUseEdgeBuilder = UseEdgeBuilder
export type THandlesBuilder = HandlesBuilder
export type TModelsBuilder = ModelsBuilder
export type TPlinthBuilder = PlinthBuilder
export type TShelfBuilder = ShelfBuilder

export type TContentType = 'gltf' | 'geometry' | 'geometry:buffer' | 'room';
export type TElementType = "element_down" | "element_up"

export type TMaterialType =
  'MeshBasicMaterial'
  | 'MeshStandardMaterial'
  | 'MeshPhongMaterial'
  | 'MeshPhysicalMaterial'
  | 'MeshLambertMaterial'
  | THREE.MeshBasicMaterial
  | THREE.MeshStandardMaterial
  | THREE.MeshPhongMaterial
  | THREE.MeshPhysicalMaterial
  | THREE.MeshLambertMaterial

export type TGeometryType = 'BoxGeometry' | 'ExtrudeGeometry' | 'PlaneGeometry'

export type TAdjustPosition = {
  position: THREE.Vector3,
  rotation: THREE.Euler,
  quaternion: THREE.Quaternion
}

export type TUseUniformState = ReturnType<typeof useUniformState>;
export type TUseEventBus = ReturnType<typeof useEventBus>;
export type TUseAppData = ReturnType<typeof useAppData>;
export type TUseRoomState = ReturnType<typeof useRoomState>;
export type TUseSceneState = ReturnType<typeof useSceneState>;
export type TUseCustomiserStore = ReturnType<typeof useCustomiserStore>;
export type TUseObjectData = ReturnType<typeof useObjectData>;
export type TUseRoomContantData = ReturnType<typeof useRoomContantData>;
export type TUseModelState = ReturnType<typeof useModelState>;
export type TMenuStore = ReturnType<typeof useMenuStore>;


export type TQualityValue = 'low' | 'medium' | 'hight'
export type MenuType = 'tech' | 'roomPar' | 'customiser';
export type TQuality = {
  lable: string,
  value: TQualityValue,
  active?: boolean
}

export type TFasadeSize = {
  ID: number;
  NAME: string;
  SORT: number;
  SIZE_EDIT_WIDTH_MIN: number | null;
  SIZE_EDIT_WIDTH_MAX: number | null;
  WIDTH: number;
  DEPTH: number | null;
  DIFFWIDTH: number | null;
  DIFFDEPTH: number | null;
  active?: boolean;
};

export type TOptionItem = {
  id: number | string;
  palitte?: number | string | null,
  milling?: number | string | null,
  global?: boolean;
  title: string;
  label?: string;
  prefix?: string,
  palitteTitle?: string,
  palitteData?: TPalitte[] | null
  millingTitle?: string,
  millingData?: TMilling[] | null
  plinthTitle?: string,
  plinthSurfase?: number | string | null,
  plinthData?: TFasadeItem[] | null
};

export type TLightRange = {
  pointLight: number | string,
  ambientLight: number | string
}

export type TOptionsMap = {
  wall: TOptionItem;
  floor: TOptionItem;
  moduleTop: TOptionItem;
  moduleBottom: TOptionItem;
  // palitteTop?: TOptionItem;
  // palitteBottom?: TOptionItem;
  fasadsTop: TOptionItem;
  fasadsBottom: TOptionItem;
  tableTop: TOptionItem
  plinth: TOptionItem
};

export type TTextureActionMap = {
  wall: 'A:ChangeWallTexture';
  floor: 'A:ChangeFloorTexture';
  moduleTop: 'A:ChangeModuleTotalTexture';
  moduleBottom: 'A:ChangeModuleTotalTexture';
  fasadsTop: 'A:ChangeFasadsTopTexture';
  fasadsBottom: 'A:ChangeFasadsBottomTexture';
  tableTop: 'A:ChangeTableTop',
  palitteTotal: 'A:ChangePaletteTotal',
  millingTotal: "A:ChangeMillingTotal",
  plinth: "A:ChangePlinthBody",
  plinthColor: "A:ChangePlinthColor"

};

export type TTextureItem = {
  ID: number;
  NAME: string;
  PREVIEW_PICTURE: string;
  DETAIL_PICTURE: string;
  texture: string;
  scale: number;
  sort: number;
};

export type TFasadeItem = {
  ID: number;
  NAME: string;
  IBLOCK_SECTION_ID: string;
  DETAIL_PICTURE: string;
  SORT: number;
  TEST: number;
  EN_NAME: string | null;
  ADMIN_COMMENT: string | null;
  ARTICLE: string | null;
  date_shipment: string | null;
  delay_date: number;
  date_build: number;
  DEPTH: number;
  CNAME: string | null;
  TEXTURE_DIRECTION: string | null;
  NOT_IN_KONSTRUKTOR: string;
  TEXTURE: string;
  SHININESS: number;
  SCALE: number;
  COLOR: boolean;
  TYPE: string;
  EDGE_COLOR: boolean;
  MODEL: string | null;
  EDGE_TEXTURE: string | null;
  SIBLINGS_COLOR: string | null;
  ATTACH_MILLINGS: (number | null)[];
  ATTACH_MILLINGS_SIDE: (number | null)[];
  ALT_MILLINGS: (number | null)[];
  ATTACH_GLASS: number[];
  no_fasade: string;
  FACADEALIGNSELECT: number;
  HANDLECOLOR: (number | null)[];
  PATINA: (number | null)[];
  PALETTE: (number | null)[];
  type_showcase: (number | null)[];
  ELEMENT_TYPE: string | null;
  fasade_type: (number | null)[];
  REACH: string | null;
  GLASS_ONLY: number;
  options: number[];
  back_color: string | null;
  MATERIAL: string;
  BUMP: number;
  INCITY: (number | null)[];
  CITY: (number | null)[];
  MIN_WIDTH: (number | null)[];
  MIN_HEIGHT: (number | null)[];
  DENSITY: string;
  DISCOUNT_25: string | null;
  MAX_WIDTH: number;
  MAX_HEIGHT: number;
  PREVIEW_PICTURE: string;
  TEXTURE_HEIGHT: number;
  TEXTURE_WIDTH: number;
  UNSETINPRODUCT: Record<string, number[]>;
};

export type TUniformGroups = {
  id: number;
  parts: THREE.Object3D[][];
  fasadeId: number;
  groupSize: {
    maxWidth: number;
    maxHeight: number;
    currentWidth: number;
    currentHeight: number;
  };
  color: string;
};

export type TSize = {
  width: number;
  height: number;
  depth?: number;
}

type TSizeEdit = {

  SIZE_EDIT_WIDTH_MIN: NumStr | null,
  SIZE_EDIT_WIDTH_MAX: NumStr | null,
  SIZE_EDIT_HEIGHT_MIN: NumStr | null,
  SIZE_EDIT_HEIGHT_MAX: NumStr | null,
  SIZE_EDIT_DEPTH_MIN: NumStr | null,
  SIZE_EDIT_DEPTH_MAX: NumStr | null

}

type TRotationEuler = {
  isEuler: boolean,
  _x: number,
  _y: number,
  _z: number,
  _order: 'XYZ' | string
}

type TModuleGrid = {
  canvasHeight: number;
  canvasWidth: number;
};

export type TMyObject = {
  MODULEGRID: TModuleGrid | false;
  PROPS: any;
  canvasHeight: number;
  canvasWidth: number;
};

export type TDefaultOptionsConfig = {
  defModuleTop: number | string,
  defModuleBottom: number | string,
  defFasadeTop: number | string,
  defFasadeBottom: number | string,
  deffShowcase: number | string,
  defPatina: number | string,
  moduleTop: TOptionItem;
  moduleBottom: TOptionItem;
  fasadsTop: TOptionItem;
  fasadsBottom: TOptionItem;
  tableTop: TOptionItem
  plinth: TOptionItem
}

//------------------
/** @MODEL_JSON */
//------------------

// Утилиты
type NumStr = number | string;

// Материал
interface TMaterial {
  type: "MeshLambertMaterial" | "MeshPhongMaterial" | "MeshStandardMaterial" | "MeshPhysicalMaterial" | string;
  opt: {
    color: number;
    [key: string]: NumStr | boolean | undefined;
  };
}

// Геометрия
interface TGeometry {
  type: string; // "BoxGeometry" | "ExtrudeBoxGeometry" и т.п.
  opt: Record<string, NumStr | boolean>;
}

// Вектор
interface TVector3 {
  x: NumStr;
  y: NumStr;
  z: NumStr;
}

// Элемент сцены
interface TItem {
  id: string;
  type: "object" | string;
  geometry: TGeometry;
  rotation: TVector3;
  position: TVector3;
}

// Итоговый тип
export type TModelJSON = {
  material: TMaterial;
  items: TItem[] | Record<string, TItem>;
  position?: TVector3;
};

type TFasadePropsSizes = {
  FASADE_WIDTH?: number,
  min?: number,
  max?: number

}

export type TFasadeTrueSizes = {
  FASADE_WIDTH: number,
  FASADE_DEPTH: number,
  FASADE_HEIGHT: number,
  isDrawer?: boolean,
}

export type TFasadeConversation = {
  NAME: string,
  FASADES: any[],
  SORT: number,
  GROUP_SIZE: Object | null,
}

export type TFasadeProp = {
  SHOW: boolean | null,
  POSITION: number | null,
  COLOR: number,
  RESET_COLOR: number | null,
  TYPE: number | null,
  MILLING: number | null,
  MILLING_TYPE: number | null,
  PALETTE: number | null,
  WINDOW: number | null,
  ALUM: number | null,
  GLASS: number | null,
  PATINA: number | null,
  HANDLES: {
    id: number | null,
    position: number | null
    drawer: null | string
  },
  SIZES: {
    id: number,
    params: TFasadePropsSizes
  },
  DRAWER: TDrawer,
  MANUAL_NO_FASADE?: boolean,
  UMSIZES?: TSize,
  MECHANISM?: NumStr | null,

}

export type TModelData = {
  id: number;
  name: string;
  json: any | null;
  type_label: string;
  type: any | null;
  shininess: number | null;
  material: string;
  color: string;
  DAE: string;
  file: string;
  model_type: string;
  scale: number;
  width: number | null;
  height: number | null;
  depth: number | null;
  corr_x: number | string | null;
  corr_y: number | string | null;
  corr_z: number | string | null;
  loop_position: any | null;
  loop_model: any | null;
  wall_thickness: number | null;
};
type TShelfcount = {
  max: number | null,
  current: number | null,
}

export type TConfig = {
  DISABLE_MOVE: boolean,
  ELEMENT_TYPE: NumStr | null,
  ID: NumStr | null,
  FASADE_PROPS: TFasadeProp[],
  FASADE_SIZE: Record<NumStr, Record<NumStr, TFasadePositionData>>[] | [],
  FASADE_POSITIONS: Record<NumStr, TFasadePositionItem>[],
  FASADE_TYPE: number[] | boolean | null,
  FILLING: number[] | boolean | null,
  FILLING_LIST: number[] | boolean | null,
  HAVETABLETOP: boolean,
  TABLETOP_ID: NumStr | null,
  MODELID: number,
  MODEL: number[],
  MODULE_COLOR: number,
  MECHANISM: NumStr | null,
  MECHANISM_TEMP: TMechanismData[] | [],
  SIZE: TSize,
  SIZE_EDIT: TSizeEdit,
  SHOWCASE: number[],
  SHELFQUANT: TShelfcount,
  POSITION: TVector3,
  PLINTH_ACTIONS: TPlinthActions,
  PRODUCT_SHOWCASE: NumStr | null,
  UNIFORM_TEXTURE: TUniformTexture,
  OPTIONS: TOption[] | [],
  USLUGI: TUsluga[],
  PROFILE: TUsluga[],
  KROMKA: NumStr | null,
  EXPRESSIONS: TExpressions,
  ROTATION: TRotationEuler,
  MODULEGRID?: GridModule,
  BACKWALL?: TFasadeProp,
  LEFTSIDECOLOR?: TFasadeProp,
  RIGHTSIDECOLOR?: TFasadeProp,
  TOPFASADECOLOR?: TFasadeProp,
  LOOPS?: {},
  isHiTech?: boolean,
  isSlideDoor?: boolean,
  isRestrictedModule?: boolean,
}

export type TTotalProps = {
  ARROWS: THREE.Object3D[],
  BODY: THREE.Object3D,
  CONFIG: TConfig,
  DRAWERS: THREE.Object3D[],
  EXPRESSIONS: {},
  FASADE: THREE.Object3D[],
  FASADE_DEFAULT: THREE.Object3D[],
  GLASS: {},
  HANDLES: THREE.Object3D[],
  HIDDENCHILDREN: {},
  HIDDEN: false,
  JSON_FILLINGS: THREE.Object3D[],
  LEG: THREE.Object3D,
  PRODUCT: number,
  PLINTH_MESH: null,
  RASPIL: TCanvasData,
  RASPIL_LIST: TRaspilPart[],
  RASPIL_COUNT: number,
  SHELF: THREE.Object3D[] | THREE.Mesh[] | [],
  SEPARATED: [],
  SECTIONSOBJ: [],
  SECTIONCONTROL: [],
  TABLETOP: null,
  NAME: string
}


/** @Product */

export type TNullable = string | number | null;
export type TNullableArray = Array<TNullable>;

export type TIpropertyValues = {
  SECTION_META_TITLE: string | null;
  ELEMENT_META_TITLE: string | null;
  ELEMENT_META_DESCRIPTION: string | null;
  SECTION_META_DESCRIPTION: string | null;
  SECTION_PAGE_TITLE: string | null;
};

export type TTexture = {
  src: string;
  width: number;
  height: number;
  size: string;
};

export type IProductFull = {
  ID: number;
  SORT: number;
  NAME: string;
  IPROPERTY_VALUES: TIpropertyValues;
  FACADE: number[]; // массив id фасадов
  OPTION: number[];
  GLASS: TNullableArray;
  MILLING: number[];
  CITY: TNullableArray;
  COLOR: TNullableArray;
  SIZE_EDIT: TNullable;
  SIZE_EDIT_HEIGHT: TNullableArray;
  SIZE_EDIT_WIDTH_MIN: number;
  SIZE_EDIT_WIDTH_MAX: number;
  SIZE_EDIT_HEIGHT_MIN: TNullable;
  SIZE_EDIT_HEIGHT_MAX: TNullable;
  SIZE_EDIT_WIDTH: TNullableArray;
  models: number[];
  width: number;
  depth: number;
  element_type: TNullable;
  tabletop: TNullable;
  height: number;
  HEM: TNullableArray;
  SIZE_EDIT_STEP_WIDTH: number;
  SIZE_EDIT_TERMS_MULTIPLICITY: TNullable;
  SIZE_EDIT_STEP_HEIGHT: TNullable;
  texture: TTexture;
  INCITY: TNullableArray;
  plinth_length: TNullable;
  disable_raycast: number;
  count_in_basket: TNullable;
  SIZE_EDIT_STEP_DEPTH: TNullable;
  SIZE_EDIT_DEPTH: TNullableArray;
  SIZE_EDIT_DEPTH_MIN: TNullable;
  SIZE_EDIT_DEPTH_MAX: TNullable;
  MILLING_ALT: TNullable;
  USLUGI: TNullableArray;
  SIZE_EDIT_CALC_TYPE: TNullable;
  FILLING: TNullableArray;
  leg_length: number;
  profile: TNullableArray;
  FACADEALIGNSELECT: TNullable;
  substitution_width: TNullable;
  substitution_height: TNullable;
  substitution_depth: TNullable;
  texture_type: TNullable;
  texture_rotation: TNullable;
  texture_scale: TNullable;
  EN_NAME: string;
  MODULECOLOR: number[];
  SHELFQUANT: TNullable;
  type_showcase: TNullableArray;
  fasade_type: number[];
  other_models: TNullableArray;
  DE_NAME: string;
  FASADE_SIZES: TNullableArray;
  texture_map: TNullable;
  ACTUAL_DEPT: TNullable;
  IS_BOX_SECTION: number;
  CAN_HIDE_EL: number;
  SIZE_EDIT_JOINDEPTH_MIN: TNullable;
  SIZE_EDIT_JOINDEPTH_MAX: TNullable;
  PRODUCT_MECHANISM: TNullableArray;
  DATA_PETROVICH: TNullable;
  CNSTR_MIN_WIDTH: TNullable;
  NULL_PRICE: number;
  TEST: number;
  MIN_FASADE_SIZE: TNullable;
  MAX_FASADE_SIZE: TNullable;
  LOOPSIDE: TNullableArray;
  REC_HEM: TNullableArray;
  productType: TNullable;
  DOP_PRODUCT: TNullableArray;
  HANDLES: TNullableArray;
  canSetSideProfile: number;
  ALTERNATIVE_PRODUCT: number[];
  LANG: string;
  OPTIONSECTION_ID: number;
  PREVIEW_PICTURE: string;
  FILLING_SECTION: boolean;
  FASADE_POSITION: number[];
}

export type TPalitte = {
  ID: number;
  NAME: string;
  TYPE: string;
  UNAME: string;
  HTML: string;
  PREVIEW_PICTURE: string | null;
  DETAIL_PICTURE: string | null;
}

export type TMilling = {
  ID: number;
  NAME: string;
  IBLOCK_SECTION_ID: string;
  '~IBLOCK_SECTION_ID': string;
  DETAIL_PICTURE: string;
  PREVIEW_PICTURE: string;
  SORT: number;
  '~SORT': string;
  FACADEALIGNSELECT: 0 | 1;
  PATINAOFF: 0 | 1;
  MODEL: string | null;
  INCITY: (string | null)[];
  CITY: (string | null)[];
  delay_date: string | null;
  date_shipment: string | null;
  date_build: string | null;
  type_showcase: number[];
  fasade_type: number[];
  DENSITY: number | string | null;
}

export type TFasadePositionData = {
  ID: number;
  NAME: string;
  PROPERTY_FASADE_NUMBER_VALUE: string;
  PROPERTY_FASADE_NUMBER_VALUE_ID: string;
  FASADE_NUMBER: number;
  FASADE_HEIGHT: string;
  FASADE_WIDTH: string;
  FASADE_DEPTH: string;
  POSITION_X: string;
  POSITION_Y: string;
  POSITION_Z: string;
  ROTATE_Y: string;
  ROTATE_X: string | null;
  ROTATE_Z: string | null;
  POSITION_2_X: string; // например: "#X#-396 - 2"
  POSITION_2_Y: string;
  POSITION_2_Z: string;
  ROTATE_2_Y: string | null;
  ROTATE_2_X: string | null;
  ROTATE_2_Z: string | null;
  glass: number;
  is_glass_fasade: number;
  PRODUCT: number;
  FASADE_SIZE: number;
  models: null[];
  FASADE_MODEL: null;
  inherit_fasade_number: number[];
  conditions: null;
  filling: null[];
  fasade_type: number[];
  handle_position: null;
  animation: null;
  SITEOFF: number;
  drawer: null;
  box_color: null;
  fasade_color: null;
  built_in: number;
  ignore_main_catalog: number;
};

export type TFasadePositionItem = {
  FASADE_WIDTH: number | null,
  FASADE_HEIGHT: number | null,
  FASADE_DEPTH: number | null,
  POSITION_X: number | null,
  POSITION_Y: number | null,
  POSITION_Z: number | null,
  POSITION_2_X: number | null,
  POSITION_2_Y: number | null,
  POSITION_2_Z: number | null,
  ROTATE_X: number | null,
  ROTATE_Y: number | null,
  ROTATE_Z: number | null,
  ROTATE_2_X: number | null,
  ROTATE_2_Y: number | null,
  ROTATE_2_Z: number | null,
  FASADE_NUMBER: number | null,
  FASADE_MODEL: number | null,
  SHOWCASE: number | null
  FASADE_TYPE: number[] | null[] | null
}

export type TPlinthActions = {
  front: TPlinthAction,
  left: TPlinthAction,
  right: TPlinthAction
}


type TPlinthAction = {
  value: boolean,
  modelId: number | null,
  surfaceId: number | null,
}

type TMechanismData = {
  ID: number,
  NAME: string,
  CLOSE_OTHER_OPTIONS: NumStr,
  TYPE: string,
  active: boolean,
  visible: boolean
}

type TUniformTexture = {
  group: NumStr | null,
  level: NumStr | null,
  index: NumStr | null,
  column_index: NumStr | null,
  backupFasadId: NumStr | null,
  color: NumStr | null
}

type TOption = {
  id: NumStr | null,
  active: boolean,
  group: NumStr | null,
  close: NumStr | null,
  visible: boolean
}

type TUsluga = {
  ID: NumStr;
  NAME: NumStr;
  CODE: NumStr;
  default: NumStr;
  model: NumStr;
  sub_uslugi: boolean;
  INCITY: NumStr | null;
  SEPARATE_MAX: NumStr;
  RASPIL_VIS_HIDE: NumStr;
  PROPIL: NumStr;
  isseparate: NumStr;
  show_props: NumStr[] | boolean;
  hide_props: boolean;
  radiogroups: NumStr[] | boolean;
  separated: NumStr;
  TERMS_MULTIPLICITY: NumStr;
  TERMS_MULTIPLICITY_PRODUCT: NumStr;
  disablegroups: boolean;
  group: NumStr;
  depth: NumStr;
  delay_date: NumStr;
  date_build: NumStr;
  height: NumStr;
  conditions: NumStr;
  width_setting: NumStr;
  WIDTHMOM: NumStr;
  DOP_PRODUCT: NumStr;
  QUANTITY_PRODUCT: NumStr;
  POSITION: NumStr;
  PATH_MAX_WIDTH: NumStr;
  PATH_MIN_WIDTH: NumStr;
  TEST: NumStr;
  width?: string;
  visible: boolean;
  value: boolean;
};

export type TExpressions = {
  "#MWIDTH#": NumStr
  "#MODUL_MWIDTH#": NumStr
  "#MODUL_WIDTH#": NumStr
  "#X#": NumStr
  "#MHEIGHT#": NumStr
  "#MODUL_MHEIGHT#": NumStr
  "#MODUL_HEIGHT#": NumStr
  "#Y#": NumStr
  "#MDEPTH#": NumStr
  "#MODUL_MDEPTH#": NumStr
  "#MODUL_DEPTH#": NumStr
  "#Z#": NumStr
  "#SIZEEDITJOINDEPTH#": NumStr | null;
  "#MATERIAL_THICKNESS#": NumStr
  "#HORIZONT#": NumStr,
  "#DRAWHEIGHT#"?: NumStr,
  "#DRAWWIDTH#"?: NumStr,
  "#DRAWDEPTH#"?: NumStr,
}

type TRaspilPart = {
  id: NumStr,
  sectorId: NumStr,
  position: TVector3,
  rotation: TRotationEuler
}

type TDrawer = {
  drawer: string | null,
  buildIn: NumStr | null

}

/** @Столешница */

export type TTabelTopServiceItem = {
  ID: number;
  NAME: string;
  CODE: string;
  default: string;
  model: string;
  sub_uslugi: boolean;
  INCITY: string | null;
  SEPARATE_MAX: string;
  RASPIL_VIS_HIDE: string;
  PROPIL: string;
  isseparate: string;
  show_props: string[] | boolean;
  hide_props: string[] | boolean;
  radiogroups: string[] | boolean;
  separated: string;
  TERMS_MULTIPLICITY: string;
  TERMS_MULTIPLICITY_PRODUCT: string;
  disablegroups: boolean;
  group: string;
  depth: string;
  delay_date: string;
  date_build: string;
  height: string;
  conditions: string;
  width_setting: string;
  WIDTHMOM: string;
  DOP_PRODUCT: string;
  QUANTITY_PRODUCT: string;
  POSITION: string;
  PATH_MAX_WIDTH: string;
  PATH_MIN_WIDTH: string;
  TEST: string;
  visible: boolean;
  value: boolean;
}

export type TKromkaMaterialItem = {
  ID: number;
  NAME: string;
  CODE: string;
  PREVIEW_PICTURE: string;
  DETAIL_PICTURE: string;
  INCITY: number[] | null;
  CITY: string | null;
  delay_date: string | null;
  date_build: string | null;
  date_shipment: string | null;
}


type PathCommand = {
  action:
  | "moveTo"
  | "lineTo"
  | "closePath";
  data: number[];
};

type TServiceItem = {
  ID: NumStr;
  NAME: NumStr;
  POSITION: NumStr;
  CODE: NumStr;
  value: boolean;
  separated: NumStr;
  visible: boolean;
  error: boolean;

  corner?: NumStr;
  radius?: NumStr;
  width?: NumStr;
};

type TPanel = {
  width: NumStr;
  height: NumStr;
  roundCut: Record<string, unknown>; // пустой объект
  holes: unknown[]; // пустой массив
  aventData: TServiceItem[];
  xOffset: NumStr;
  yOffset: NumStr;
  path: PathCommand[];
  maxWidth: NumStr;
  maxHeight: NumStr;
  sectorId: string;
  position: TSize;
  rotation: TRotationEuler;
};

type TCanvasData = {
  modelHeight: number;
  canvasHeight: number;
  data: TPanel[][];
};

// ==================================================================

export enum FasadeTextAlignAction {
  right_top = 0,
  top = 1,
  left_top = 2,

  right = 3,
  right_open = 3,
  right_side = 3,
  right_p = 3,

  center = 4,

  left = 5,
  left_open = 5,
  left_side = 5,
  left_p = 5,

  right_down = 6,
  bottom = 7,
  left_down = 8,

}



/** Заглушка */

export type TObject = { [key: string]: any }