
//@ts-nocheck
import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"


export class GlobalsData {


    readonly _APP: THREETypes.TObject
    readonly _WALL: THREETypes.TObject
    readonly _FLOOR: THREETypes.TObject
    readonly _COLOR: THREETypes.TObject
    readonly _FASADE: THREETypes.TObject
    readonly _FILLING: THREETypes.TObject
    readonly _FASADESIZE: THREETypes.TObject
    readonly _FASADENUMBERSIZE: THREETypes.TObject
    readonly _FASADE_SECTION: THREETypes.TObject
    readonly _FASADE_POSITION: THREETypes.TObject
    readonly _FASADE_GROUPS: THREETypes.TObject
    readonly _FASADE_SIZE_RESTRICT: THREETypes.TObject
    readonly _FASADETYPE: THREETypes.TObject
    readonly _MILLING: THREETypes.TObject
    readonly _MODELS: THREETypes.TObject
    readonly _PRODUCTS: THREETypes.TObject
    readonly _SHELF_POSITION: THREETypes.TObject
    readonly _GLASS: THREETypes.TObject
    readonly _USLUGI: THREETypes.TObject
    readonly _LOOP_POSITION: THREETypes.TObject
    readonly _LOOPSIDE: THREETypes.TObject
    readonly _OPTION: THREETypes.TObject
    readonly _OPTIONS_GROUP: THREETypes.TObject
    readonly _PLINTH: THREETypes.TObject
    readonly _PALETTE: THREETypes.TObject
    readonly _PRODUCTS_TYPES: THREETypes.TObject

    constructor(appData: THREETypes.TObject) {

        this._APP = appData
        this._WALL = appData.WALL
        this._FLOOR = appData.FLOOR
        this._COLOR = appData.COLOR
        this._FASADE = appData.FASADE
        this._FILLING = appData.FILLING
        this._FASADESIZE = appData.FASADESIZE
        this._FASADENUMBERSIZE = appData.FASADENUMBERSIZE
        this._FASADE_SECTION = appData.FASADE_SECTION
        this._FASADE_POSITION = appData.FASADE_POSITION
        this._FASADE_GROUPS = appData.FASADE_GROUPS
        this._FASADE_SIZE_RESTRICT = appData.FASADE_SIZE_RESTRICT
        this._FASADETYPE = appData.FASADETYPE
        this._MILLING = appData.MILLING
        this._MODELS = appData.MODELS
        this._PRODUCTS = appData.CATALOG.PRODUCTS
        this._SHELF_POSITION = appData.PRODUCT_SHELF_POSITION
        this._GLASS = appData.GLASS
        this._USLUGI = appData.USLUGI
        this._LOOP_POSITION = appData.LOOP_POSITION
        this._LOOPSIDE = appData.LOOPSIDE
        this._OPTION = appData.OPTION
        this._OPTIONS_GROUP = appData.OPTIONS_GROUP
        this._PLINTH = appData.PLINTH
        this._PALETTE = appData.PALETTE
        this._PRODUCTS_TYPES = appData.PRODUCTS_TYPES
    }

}