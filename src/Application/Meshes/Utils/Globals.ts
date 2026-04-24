
//@ts-nocheck
import { useAppData } from "@/store/appliction/useAppData"
import * as THREEInterfases from "@/types/interfases"
import * as THREETypes from "@/types/types"


export class GlobalsData {

    readonly _APP: THREETypes.TObject = useAppData().getAppData

    readonly _WALL: THREETypes.TObject = this._APP.WALL
    readonly _FLOOR: THREETypes.TObject = this._APP.FLOOR
    readonly _COLOR: THREETypes.TObject = this._APP.COLOR
    readonly _FASADE: THREETypes.TObject = this._APP.FASADE;
    readonly _FILLING: THREETypes.TObject = this._APP.FILLING;
    readonly _FASADESIZE: THREETypes.TObject = this._APP.FASADESIZE;
    readonly _FASADENUMBERSIZE: THREETypes.TObject = this._APP.FASADENUMBERSIZE;
    readonly _FASADE_SECTION: THREETypes.TObject = this._APP.FASADE_SECTION;
    readonly _FASADE_POSITION: THREETypes.TObject = this._APP.FASADE_POSITION;
    readonly _FASADE_GROUPS: THREETypes.TObject = this._APP.FASADE_GROUPS
    readonly _FASADE_SIZE_RESTRICT: THREETypes.TObject = this._APP.FASADE_SIZE_RESTRICT
    readonly _FASADETYPE: THREETypes.TObject = this._APP.FASADETYPE
    readonly _MILLING: THREETypes.TObject = this._APP.MILLING
    readonly _MODELS: THREETypes.TObject = this._APP.MODELS
    readonly _PRODUCTS: THREETypes.TObject = this._APP.CATALOG.PRODUCTS
    readonly _SHELF_POSITION: THREETypes.TObject = this._APP.PRODUCT_SHELF_POSITION
    readonly _GLASS: THREETypes.TObject = this._APP.GLASS
    readonly _USLUGI: THREETypes.TObject = this._APP.USLUGI
    readonly _LOOP_POSITION: THREETypes.TObject = this._APP.LOOP_POSITION
    readonly _LOOPSIDE: THREETypes.TObject = this._APP.LOOPSIDE
    readonly _OPTION: THREETypes.TObject = this._APP.OPTION
    readonly _OPTIONS_GROUP: THREETypes.TObject = this._APP.OPTIONS_GROUP
    readonly _PLINTH: THREETypes.TObject = this._APP.PLINTH
    readonly _PALETTE: THREETypes.TObject = this._APP.PALETTE;
    readonly _PRODUCTS_TYPES: THREETypes.TObject = this._APP.PRODUCTS_TYPES

}
