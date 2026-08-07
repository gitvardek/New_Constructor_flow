// @ts-nocheck

import * as THREE from "three"
import * as THREETypes from "@/types/types"
import * as BufferGeometry from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { useAppData } from "@/store/appliction/useAppData"
import { useModelState } from "@/store/appliction/useModelState";
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { useToast } from "@/features/toaster/useToast";
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { useConversationActions } from "@/components/right-menu/actions/useConversationActions";


type TFasadePartPosition = {
    WIDTH: number | null,
    FASADE_NUMBER: number | null
    TYPE_POSITION: string | null,
}

type OptionData = {
    option: THREETypes.TRootOptionType,
    values: boolean
}
interface IncomeOptionData {
    data: OptionData,
    mesh: THREE.Mesh[]
    defaultMesh: THREE.Mesh[],
    disabledOptions: THREETypes.TOption[] | []
}
export class FasadeBuilder {

    modelState: ReturnType<typeof useModelState> = useModelState();
    conversationActions: ReturnType<typeof useConversationActions> = useConversationActions();
    parent: THREETypes.TBuildProduct
    uniformeTextureStartData: TFasadePartPosition[] = []
    _APP: THREETypes.TObject
    _FASADE: Record<string | number, THREETypes.TFasadeItem>
    _FASADE_POSITION: Record<string | number, THREETypes.TFasadePositionData>
    _MILLING: Record<string | number, THREETypes.TMilling>
    _FASADE_TYPE: Record<string | number, THREETypes.TFasadeItem>
    _FASADE_SIZE_RESTRICT: any
    jsonBuilder: THREETypes.TJSONBuilder
    edgeBuilder: THREETypes.TEdgeBuilder
    useEdgeBuilder: THREETypes.TUseEdgeBuilder
    menuStore: THREETypes.TMenuStore
    handlesBuilder: THREETypes.THandlesBuilder
    cutIds: string[] = ['4722787', '4722786'] // ID опций распила фасадов
    additiveIds: string[] = ['5819051', '5819050'] // ID щпций присадок фасада
    additiveMiddleWidth: number = 532


    constructor(parent: THREETypes.TBuildProduct) {
        this.parent = parent
        // this.modelState = parent.root._builderContext.modelState
        this.dispose = parent.root._deepDispose
        this._APP = parent._APP
        this._FASADE = parent._FASADE
        this._FASADE_POSITION = parent._FASADE_POSITION
        this._FASADE_SIZE_RESTRICT = parent._FASADE_SIZE_RESTRICT
        this._MILLING = parent._MILLING
        this._FASADETYPE = parent._FASADETYPE
        this.jsonBuilder = parent.json_builder
        this.edgeBuilder = parent.edge_builder
        this.useEdgeBuilder = parent.root.useEdgeBuilder
        this.menuStore = parent.root.menuStore
        this.handlesBuilder = parent.handles_builder
        this.toaster = useToast();

    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private resolveColorId(
        fasadeColor: number,
        MANUAL_NO_FASADE: boolean = false,
        ELEMENT_TYPE: string,
        defaultConfig: THREETypes.TDefaultOptionsConfig,
        isLoad: boolean = false,
        nstShalfs: boolean = false,
    ) {
        const { defFasadeTop, defFasadeBottom, fasadsTop, fasadsBottom } = defaultConfig;
        const isDefault = fasadeColor === this.parent.project.default_fasade_color;

        console.log(nstShalfs, fasadeColor, '<<<< FC >>>>')

        if (nstShalfs && isDefault) return {
            color: fasadeColor,
            pallite: null,
            milling: null
        }

        switch (ELEMENT_TYPE) {
            case "element_down":
                return {
                    color: !MANUAL_NO_FASADE && ((defFasadeBottom && isDefault) || fasadsBottom.global) && !isLoad ? defFasadeBottom : fasadeColor,
                    pallite: fasadsBottom.palitte,
                    milling: fasadsBottom.milling
                }
            case "element_up":
                return {
                    color: !MANUAL_NO_FASADE && ((defFasadeTop && isDefault) || fasadsTop.global) && !isLoad ? defFasadeTop : fasadeColor,
                    pallite: fasadsTop.palitte,
                    milling: fasadsTop.milling
                }
            default:
                return { color: fasadeColor, pallite: null, milling: null };
        }
    }

    private applyDecorations(
        mesh: THREETypes.TObject,
        fasadeData: THREETypes.TFasadeProp,
        key: number,
        haveShowcase: boolean,
        FASADE_DEFAULT: any[],
        FASADE_PROPS: any[],
        mode: 'update' | 'build'
    ): void {
        console.log('FASADE BUILD', fasadeData)

        // Палитра
        if (fasadeData.PALETTE != null) {
            this.parent.palette_bulider.createPaletteColor({
                fasade: mesh,
                data: fasadeData.PALETTE,
                fasadeProps: fasadeData,
            });
        }

        // Фрезеровка
        if (fasadeData.MILLING != null && !haveShowcase) {
            let millingParams;
            if (mode === 'build') {
                const action = this.modelState.getCurrentMillingActionMap(fasadeData.MILLING_TYPE, fasadeData.MILLING) ?? null;
                millingParams = action ?? this.modelState.getCurrentMillingMap(fasadeData.MILLING);
            } else {
                millingParams = this.modelState.getCurrentMillingMap(fasadeData.MILLING);
            }
            this.parent.milling_builder.createMillingFasade(
                mesh,
                mesh.userData.trueSize,
                millingParams,
                FASADE_DEFAULT[key],
                fasadeData.PATINA
            );
        }

        // Окно
        if (fasadeData.SHOWCASE != null) {
            const action = this.modelState.getCurrentFasadeTypesAction(fasadeData.TYPE);
            this.parent.showcase_builder.createShowcase({
                fasade: mesh,
                fasadePosition: mesh.userData.trueSize,
                data: fasadeData.SHOWCASE,
                defaultGeometry: FASADE_DEFAULT[key],
                alum: FASADE_PROPS[key].ALUM,
                curFasadeData: FASADE_PROPS[key],
                action
            });
        }

        // Алюм. профиль
        if (fasadeData.ALUM != null && FASADE_PROPS[key].COLOR != null) {

            console.log('ALUM')

            const alumData = this.parent._FASADE[FASADE_PROPS[key].COLOR];
            this.parent.alum_builder.createAlum({ fasade: mesh, data: alumData });

            const action = this.modelState.getCurrentFasadeTypesAction(fasadeData.TYPE);
            this.parent.showcase_builder.createShowcase({
                fasade: mesh,
                fasadePosition: mesh.userData.trueSize,
                data: fasadeData.SHOWCASE,
                defaultGeometry: FASADE_DEFAULT[key],
                alum: FASADE_PROPS[key].ALUM,
                curFasadeData: FASADE_PROPS[key],
                action
            });
        }

        // Цвет стекла
        if (fasadeData.GLASS != null) {
            this.parent.showcase_builder.changeGlassColor({
                fasade: mesh,
                glassId: FASADE_PROPS[key].GLASS
            });
        }

        // Ручки
        console.log(fasadeData.HANDLES.id, 'ID')

        if (fasadeData.HANDLES.id && fasadeData.HANDLES.id !== this.handlesBuilder.CLEAR_HANDLE_ID) {
            const handleId = fasadeData.HANDLES.id;
            const handleModel = this._APP.CATALOG.PRODUCTS[handleId].models[0];

            this.handlesBuilder.createHandle({ id: handleId, model: handleModel }, mesh, fasadeData);
        }

        // Видимость с учётом исключений
        if (!fasadeData.SHOW) {
            const canKeepException = (mesh.userData.curBodyExceptions && mesh instanceof THREE.Mesh);
            if (canKeepException) {
                if (mode === 'update') {
                    mesh.material = mesh.userData.curBodyExceptionsMaterial.clone();
                    mesh.material.needsUpdate = true;
                }
                mesh.visible = true;
            } else {
                mesh.visible = false;
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Public: первичная сборка всех фасадов (BuildProduct, BuildUniversalModule)
    // ---------------------------------------------------------------------------

    public buildAllFasades({
        props,
        incomingModel,
        isUMmodule = false,
        defaultConfig,
        curBodyExceptions,
        isLoad = false,
        nstShalfs = false
    }: {
        props: THREETypes.TObject,
        incomingModel?: number,
        isUMmodule?: boolean,
        defaultConfig: THREETypes.TDefaultOptionsConfig,
        curBodyExceptions?: boolean,
        isLoad?: boolean
    }): THREE.Object3D {

        console.log('All', props)
        const { FASADE_DEFAULT, FASADE, CONFIG, PRODUCT } = props;
        const { SIZE, FASADE_PROPS, FASADE_POSITIONS, FASADE_TYPE, ELEMENT_TYPE, SHOWCASE, OPTIONS } = CONFIG;
        const { deffShowcase, defPatina } = defaultConfig;
        const currentProduct = this.modelState._PRODUCTS[PRODUCT];

        const startPosition = this.parent.getStartPosition(SIZE);
        const parent = new THREE.Object3D();
        const modelType = this._APP.MODELS[CONFIG.MODELID]?.type ?? "left";

        this.indexedFasadeToUtiformTexturing(props, isUMmodule);

        for (let key = 0; key < FASADE_PROPS.length; key++) {
            const fasadeData = FASADE_PROPS[key];
            const haveShowcase = FASADE_POSITIONS[key].SHOWCASE === 1;
            const fasadePositionData = this.getFasadePosition(CONFIG, key, isUMmodule);
            let result


            const { color, pallite, milling } = this.resolveColorId(
                fasadeData.COLOR, fasadeData.MANUAL_NO_FASADE, ELEMENT_TYPE, defaultConfig, isLoad, nstShalfs
            );

            // Подготовка данных до создания меша
            const curFasadeList = this.parent.modelState.createFlatFasadeData({
                data: currentProduct.FACADE, fasadeNdx: key, def: true, productId: PRODUCT, fasadeCount: FASADE_PROPS.length
            });
            fasadeData.COLOR = curFasadeList.includes(color) ? color : 7397;
            fasadeData.SHOW = curBodyExceptions ? true : fasadeData.COLOR !== 7397;
            fasadeData.SHOWCASE = fasadeData.SHOW && haveShowcase
                ? fasadeData.SHOWCASE ?? SHOWCASE[0] ?? deffShowcase
                : null;

            result = this.processFasadeCreation({
                fasadePositionData,
                startPosition,
                props,
                FASADE_PROPS,
                FASADE,
                FASADE_DEFAULT,
                FASADE_POSITIONS,
                FASADE_TYPE,
                key,
                incomingModel,
                curBodyExceptions,
                parent,
                modelType
            }).result;

            // Пост-создание: проверка и коррекция данных на основе trueSize
            const { trueSize } = result.userData;

            const check = this.conversationActions.validateAndPurgeFasadeOnBuild(fasadeData.COLOR, key, trueSize, result)

            if (!check) {
                result.geometry = FASADE_DEFAULT[key].geometry.clone();

                fasadeData.COLOR = 7397;
                fasadeData.PALETTE = null;
                fasadeData.SHOW = false;
                fasadeData.GLASS = null;
                fasadeData.PATINA = null;
                fasadeData.SHOWCASE = null;
                fasadeData.ALUM = null;
                fasadeData.HANDLES = this.handlesBuilder.restoreDefaultHandleData(fasadeData);
                fasadeData.MILLING_TYPE = null;
                fasadeData.TYPE = null;
                fasadeData.MILLING = null;

                const canKeepException = result.userData.curBodyExceptions && result instanceof THREE.Mesh;
                if (canKeepException) {
                    result.material = result.userData.curBodyExceptionsMaterial.clone();
                    result.material.needsUpdate = true;
                    result.visible = true;
                } else {
                    result.visible = false;
                }

                this.uniformeTextureStartData = [];
                continue;
            }

            const millingList = this.parent.modelState.createCurrentMillingData({
                fasadeId: fasadeData.COLOR,
                productId: PRODUCT,
                fasadeNdx: key,
                fasadeSize: trueSize
            });

            const checkCurrentMilling = millingList.findIndex(el => el.ID === fasadeData.MILLING) > -1;
            const firstValueMilling = millingList[0] as any;
            const firstValuePall = Object.values(
                this.parent.modelState.createCurrentPaletteData(fasadeData.COLOR)
            )[0] as any;
            const firstValueGlass = this.parent.modelState.createCurrentGlassData({
                fasadeId: fasadeData.COLOR, productId: PRODUCT
            })[0] as any;

            if (!checkCurrentMilling && fasadeData.MILLING != null && fasadeData.MILLING != millingList[0].ID) {
                fasadeData.MILLING = millingList[0].ID;
                this.toaster.error(`Не корректный размер фасада. Фрезеровка фасада №${key + 1} была изменена`);
            }

            if (fasadeData.SHOW && pallite && fasadeData.PALETTE === null) {
                fasadeData.PALETTE = pallite;
            }
            if (fasadeData.SHOW && !firstValuePall && fasadeData.PALETTE != null) {
                fasadeData.PALETTE = null;
            }

            if (fasadeData.SHOW && typeof firstValueMilling == 'object') {
                fasadeData.MILLING = fasadeData.MILLING
                    ? fasadeData.MILLING
                    : this.containsValue(millingList, milling) ? milling : firstValueMilling.ID;
                if (!fasadeData.MILLING_TYPE) {
                    const fType = FASADE_POSITIONS[key].FASADE_TYPE;
                    fasadeData.MILLING_TYPE = this.getIntegratedHandleTypeList(milling, fType)[0] ?? null;
                }

                if (this._MILLING[fasadeData.MILLING].PATINAOFF === 1 ||
                    this._FASADE[fasadeData.COLOR].PATINA.length > 0 && !this._FASADE[fasadeData.COLOR].PATINA.includes(null)
                ) {
                    fasadeData.PATINA = null;
                }
                else {
                    fasadeData.PATINA = defPatina ?? 475428
                }
            }

            if (fasadeData.SHOW && typeof firstValueGlass == 'object' && haveShowcase) {
                fasadeData.GLASS = firstValueGlass.ID;
            }

            this.applyDecorations(result, fasadeData, key, haveShowcase, FASADE_DEFAULT, FASADE_PROPS, 'build');
        }

        this.uniformeTextureStartData = [];
        this.checkFasadeOptions(OPTIONS, FASADE, FASADE_DEFAULT)

        return parent;
    }

    // ---------------------------------------------------------------------------
    // Public: обновление одного фасада по индексу (Events)
    // ---------------------------------------------------------------------------

    public updateFasade({
        props,
        fasadeNdx,
        incomingModel,
        isUMmodule = false,
        defaultConfig,
        curBodyExceptions,
        remove = false,
        isLoad = false
    }: {
        props: THREETypes.TObject,
        fasadeNdx: number,
        incomingModel?: number,
        isUMmodule?: boolean,
        defaultConfig: THREETypes.TDefaultOptionsConfig,
        curBodyExceptions?: boolean,
        remove?: boolean,
        isLoad?: boolean
    }): void {
        const { FASADE_DEFAULT, FASADE, CONFIG, PRODUCT } = props;
        const { SIZE, FASADE_PROPS, FASADE_POSITIONS, FASADE_TYPE, ELEMENT_TYPE, SHOWCASE, OPTIONS } = CONFIG;
        const { deffShowcase, defPatina } = defaultConfig;
        const currentProduct = this.modelState._PRODUCTS[PRODUCT];
        const startPosition = this.parent.getStartPosition(SIZE);
        const modelType = this._APP.MODELS[CONFIG.MODELID]?.type ?? "left";

        if (remove) {
            CONFIG.UNIFORM_TEXTURE = {
                group: null,
                level: null,
                index: null,
                column_index: null,
                backupFasadId: null,
                color: null
            };
        }

        this.indexedFasadeToUtiformTexturing(props, isUMmodule);

        const fasadeData: THREETypes.TFasadeProp = FASADE_PROPS[fasadeNdx];
        const { color, pallite, milling } = this.resolveColorId(
            fasadeData.COLOR, fasadeData.MANUAL_NO_FASADE, ELEMENT_TYPE, defaultConfig, isLoad
        );
        const haveShowcase = FASADE_POSITIONS[fasadeNdx].SHOWCASE === 1;

        let curFasade = FASADE[fasadeNdx];
        const curParent = curFasade.parent;
        const { trueSize } = curFasade.userData;
        curFasade.geometry = FASADE_DEFAULT[fasadeNdx].geometry.clone();

        if (remove) {
            fasadeData.COLOR = 7397;
            fasadeData.PALETTE = null;
            fasadeData.SHOW = false;
            fasadeData.GLASS = null;
            fasadeData.PATINA = null;
            fasadeData.SHOWCASE = null;
            fasadeData.ALUM = null;
            fasadeData.HANDLES = this.handlesBuilder.restoreDefaultHandleData(fasadeData);
            fasadeData.MILLING_TYPE = null;
            fasadeData.TYPE = null;
            fasadeData.MILLING = null;

            const canKeepException = (curFasade.userData.curBodyExceptions && curFasade instanceof THREE.Mesh);
            if (canKeepException) {
                curFasade.material = curFasade.userData.curBodyExceptionsMaterial.clone();
                curFasade.material.needsUpdate = true;
                curFasade.visible = true;
            } else {
                curFasade.visible = false;
            }

            this.uniformeTextureStartData = [];
            this.checkFasadeOptions(OPTIONS, FASADE, FASADE_DEFAULT)
            return;
        }

        // Подготовка данных фасада
        const curFasadeList = this.parent.modelState.createFlatFasadeData({
            data: currentProduct.FACADE,
            fasadeNdx,
            def: true,
            productId: PRODUCT,
            fasadeCount: FASADE_PROPS.length
        });

        fasadeData.COLOR = curFasadeList.includes(color) ? color : 7397;
        fasadeData.SHOW = curBodyExceptions ? true : fasadeData.COLOR !== 7397;

        if (fasadeData.SHOW && haveShowcase && !fasadeData.ALUM) {
            fasadeData.SHOWCASE = fasadeData.SHOWCASE ?? SHOWCASE[0] ?? deffShowcase;
        } else {
            fasadeData.SHOWCASE = null;
        }
        if (fasadeData.ALUM) {
            fasadeData.SHOWCASE = null;
        }

        const firstValuePall = Object.values(
            this.parent.modelState.createCurrentPaletteData(fasadeData.COLOR)
        )[0] as any;
        const firstValueGlass = this.parent.modelState.getCurrentGlassData[0] as any;
        const millingList = this.parent.modelState.createCurrentMillingData({
            fasadeId: fasadeData.COLOR,
            productId: PRODUCT,
            fasadeNdx: fasadeNdx,
            fasadeSize: trueSize,
        });
        const firstValueMilling = millingList[0] as any;

        if (fasadeData.SHOW && pallite && firstValuePall && fasadeData.PALETTE === null) {
            fasadeData.PALETTE = pallite;
        } else {
            fasadeData.PALETTE = null;
        }
        if (fasadeData.SHOW && !firstValuePall && fasadeData.PALETTE != null) {
            fasadeData.PALETTE = null;
        }

        if (fasadeData.SHOW && typeof firstValueMilling == 'object') {
            fasadeData.MILLING = fasadeData.MILLING
                ? fasadeData.MILLING
                : firstValueMilling.ID ? firstValueMilling.ID : milling;
            if (!fasadeData.MILLING_TYPE) {
                const fType = FASADE_POSITIONS[fasadeNdx].FASADE_TYPE;
                fasadeData.MILLING_TYPE = this.getIntegratedHandleTypeList(fasadeData.MILLING, fType)[0] ?? null;
            }
            if (this._MILLING[fasadeData.MILLING].PATINAOFF == 1) {
                fasadeData.PATINA = null;
            }
            else {
                fasadeData.PATINA = defPatina ?? 475428
            }
            console.log(defPatina, defaultConfig, 'defPatina')
            console.log(this._FASADE[fasadeData.COLOR], 'COLOR')
            console.log(this._MILLING[fasadeData.MILLING], 'MILLING')
        } else {
            fasadeData.MILLING = null;
            fasadeData.PATINA = null;
        }

        if (fasadeData.SHOW && typeof firstValueGlass == 'object' && haveShowcase) {
            fasadeData.GLASS = firstValueGlass.ID;
        }

        // Пересоздание геометрии, если нет кастомной глубины
        const fasadePositionData = this.getFasadePosition(CONFIG, fasadeNdx, isUMmodule);
        const fasadeList = FASADE_PROPS[fasadeNdx].POSITION ?? props[0]?.POSITION;
        const rawFasadePosition = this.parent._FASADE_POSITION[fasadeList];
        const fasDepthTocheck = rawFasadePosition?.FASADE_DEPTH;

        console.log(fasadePositionData, '<<<<<fasadePositionData>>>>>')

        if (!fasDepthTocheck) {
            const { result } = this.processFasadeCreation({
                fasadePositionData,
                startPosition,
                props,
                FASADE_PROPS,
                FASADE,
                FASADE_DEFAULT,
                FASADE_POSITIONS,
                FASADE_TYPE,
                key: fasadeNdx,
                incomingModel,
                curBodyExceptions,
                parent: curParent,
                modelType,
            });

            curFasade.geometry.dispose();
            curFasade.geometry = null;
            curFasade.geometry = result.geometry.clone();
            try {
                curFasade.userData.trueSize.FASADE_DEPTH = fasadePositionData.FASADE_DEPTH;
            } catch (e) {
                console.log(e);
            }
        }

        curFasade.userData.SHOW = fasadeData.SHOW;
        this.applyDecorations(curFasade, fasadeData, fasadeNdx, haveShowcase, FASADE_DEFAULT, FASADE_PROPS, 'update');

        this.uniformeTextureStartData = [];

        this.checkFasadeOptions(OPTIONS, FASADE, FASADE_DEFAULT)
    }

    // ---------------------------------------------------------------------------
    // Public: применение изменений поверхности одного фасада (вызывается из Events)
    // ---------------------------------------------------------------------------

    public applyFasadeChange({
        data,
        fasadeNdx,
        fasadeProp,
        fasade,
        fasadeDefault,
        incomingModel,
        CONFIG,
    }: {
        data: any,
        fasadeNdx: number,
        fasadeProp: any,
        fasade: THREE.Object3D,
        fasadeDefault: THREE.Object3D,
        incomingModel: any,
        CONFIG: any,
    }): void {
        this._tryApplyShowcaseChange(CONFIG, fasadeProp, fasadeNdx, incomingModel, fasade, fasadeDefault);
        if (this._tryApplyPalette(data, fasadeProp, fasade)) return;
        if (this._tryApplyTexture(data, fasade, fasadeProp)) return;
        this._tryApplyAlumColor(data, fasade, fasadeProp);
    }

    private _tryApplyShowcaseChange(
        CONFIG: any,
        fasadeProp: any,
        fasadeNdx: number,
        incomingModel: any,
        fasade: THREE.Object3D,
        fasadeDefault: THREE.Object3D
    ): void {
        const { SHOWCASE, FASADE_POSITIONS, FASADE_PROPS } = CONFIG;
        const fasadeShowcase = FASADE_POSITIONS[fasadeNdx].SHOWCASE === 1;
        const handleType = FASADE_PROPS[fasadeNdx].TYPE;
        const { ALUM } = fasadeProp;
        const fasadePosition = fasade.userData.trueSize;

        const applyShowcase = (showcaseData: any, action?: any) => {
            this.parent.showcase_builder.createShowcase({
                fasade,
                fasadePosition,
                data: showcaseData,
                defaultGeometry: fasadeDefault,
                alum: ALUM,
                curFasadeData: fasadeProp,
                action,
            });
            FASADE_PROPS[fasadeNdx].SHOW = fasade.visible;
            FASADE_PROPS[fasadeNdx].GLASS = FASADE_PROPS[fasadeNdx].GLASS ?? '76033';
        };

        if (incomingModel) {
            const action = this.modelState.getCurrentFasadeTypesAction(handleType);
            applyShowcase(incomingModel, action);
        } else if (SHOWCASE.length > 0 && fasadeShowcase) {
            applyShowcase(SHOWCASE[0]);
        }
    }

    private _tryApplyPalette(data: any, fasadeProp: any, fasade: THREE.Object3D): boolean {
        if (!data.PALETTE?.[0]) return false;
        fasadeProp.COLOR = data.ID;
        this.modelState.createCurrentPaletteData(data.ID);
        const palette = Object.keys(this.modelState.getCurrentPaletteData)[0];
        this.parent.palette_bulider.createPaletteColor({ fasade, data: palette, fasadeProps: fasadeProp });
        return true;
    }

    private _tryApplyTexture(data: any, fasade: THREE.Object3D, fasadeProp: any): boolean {
        const { COLOR: COLOR_ID } = fasadeProp
        const { _FASADE } = this.modelState
        const incomeData = _FASADE[COLOR_ID]


        if (incomeData.COLOR) return false;
        if (COLOR_ID === 7397) {
            Object.assign(fasadeProp, { SHOW: false, COLOR: incomeData.ID, PALETTE: null });
            fasade.userData.SHOW = fasade.visible;
            return true;
        }

        fasade.visible = true;
        fasade.traverse((child: THREE.Object3D) => {
            if ((child.userData && child.userData.edge) || child.parent?.userData?.edge) return;
            if (child instanceof THREE.Mesh) {
                this.parent.changeColor({
                    object: child,
                    url: incomeData.TEXTURE,
                    textureSize: { x: incomeData.TEXTURE_WIDTH, y: incomeData.TEXTURE_HEIGHT },
                });
                fasade.userData.backupMaterial = child.material;
            }
        });

        Object.assign(fasadeProp, { SHOW: true, COLOR: incomeData.ID, PALETTE: null });
        fasade.userData.SHOW = fasade.visible;
        return true;
    }

    private _tryApplyAlumColor(data: any, fasade: THREE.Object3D, fasadeProp: any): void {
        this.parent.alum_builder.createAlum({ fasade, data });
        Object.assign(fasadeProp, { SHOW: fasade.visible, COLOR: data.ID, PALETTE: null });
        fasade.userData.SHOW = fasade.visible;
    }


    // ---------------------------------------------------------------------------
    // Остальные публичные методы
    // ---------------------------------------------------------------------------

    public createFasade({
        fasade_position,
        start_position,
        props,
        key,
        incomingModel,
        props_array,
        curBodyExceptions = false
    }: {
        fasade_position: THREETypes.TObject,
        start_position: THREETypes.TObject,
        props: THREETypes.TObject,
        key: number,
        incomingModel?: number,
        props_array: THREETypes.TObject[],
        curBodyExceptions: boolean
    }) {
        // const fasadeData = this.parent._FASADE[fasade_id];
        const { FASADE_PROPS, MODEL } = props.CONFIG;
        const currentFasadeColor = FASADE_PROPS[key]?.COLOR;
        const textureCheck = currentFasadeColor && currentFasadeColor != 7397
        const modelName = fasade_position.FASADE_MODEL;

        if (modelName) {
            const fasadeModel = this._APP.MODELS[modelName];

            if (fasadeModel) {


                // Создание фасада из модели
                let createdFasade
                let fasade = this.parent.json_builder.createMesh({
                    data: fasadeModel,
                    parent_size: {
                        x: this.parent.calculateFromString(fasade_position.FASADE_WIDTH ?? props.CONFIG.SIZE.width),
                        y: eval(fasade_position.FASADE_HEIGHT),
                        z: this.parent.calculateFromString(fasade_position.FASADE_DEPTH),
                        mX: props.CONFIG.SIZE.width,
                        mY: props.CONFIG.SIZE.height,
                        mZ: props.CONFIG.SIZE.depth
                    }
                });

                if (fasade.isObject3D && fasade.children.length > 1) {

                    const geometries: THREE.BufferGeometry[] = [];
                    fasade.children.forEach((el: THREE.Object3D, key: number) => { // Добавил key, если нужно
                        const clone = el.geometry.clone();
                        el.updateMatrixWorld();
                        clone.applyMatrix4(el.matrixWorld); // Запекаем мировую трансформацию

                        // КЛЮЧЕВОЕ: Локальная UV для каждой части перед merge — это фиксит размазывание
                        this.parent.normalizeUVsTo01(clone);

                        geometries.push(clone);
                    });

                    const material = new THREE.MeshPhongMaterial();
                    const merged = BufferGeometry.mergeGeometries(geometries, true);
                    this.parent.normalizeUVsTo01(merged);

                    if (textureCheck) {
                        const fasadeInfo = this.parent._FASADE[currentFasadeColor];
                        if (fasadeInfo?.TEXTURE) {

                            this.parent.getTexture({
                                material,
                                url: fasadeInfo.TEXTURE,
                            });
                        }
                    }

                    fasade = new THREE.Mesh(merged, material);
                    fasade.userData.mergedGeometry = true

                }

                const material = new THREE.MeshPhongMaterial();
                if (textureCheck && fasade.children.length == 1) {
                    const fasadeInfo = this.parent._FASADE[currentFasadeColor];
                    if (fasadeInfo?.TEXTURE) {

                        this.parent.getTexture({
                            material,
                            url: fasadeInfo.TEXTURE,
                            texture_size: {
                                width: fasadeInfo.TEXTURE_WIDTH,
                                height: fasadeInfo.TEXTURE_HEIGHT,
                            }
                        });
                    }
                    fasade.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            child.material = material
                            child.material.needsUpdate = true
                        }
                    })
                }

                if (fasade.isObject3D && fasade.children.length == 1) {


                    fasade.children[0].userData.partPosition = this.uniformeTextureStartData[key];
                    if (curBodyExceptions) fasade.userData.curBodyExceptionsMaterial = curExceptionsMaterial.clone()

                    const aabb = new THREE.Box3().setFromObject(fasade.children[0]);
                    const obb = new OBB().fromBox3(aabb);
                    fasade.children[0].userData.obb = obb
                    fasade.children[0].userData.curBodyExceptions = curBodyExceptions
                    fasade.children[0].name = 'fasade'
                    fasade.children[0].receiveShadow = true;
                    fasade.children[0].castShadow = true

                    const fasadeEdge = this.edgeBuilder.createEdge(fasade, fasade);
                    const defaultEdge = this.edgeBuilder.createVisibleEdge(fasade.children[0])

                    return { fasade, fasadeEdge }

                }

                fasade.userData.partPosition = this.uniformeTextureStartData[key];
                if (curBodyExceptions) fasade.userData.curBodyExceptionsMaterial = curExceptionsMaterial.clone()

                const aabb = new THREE.Box3().setFromObject(fasade);
                const obb = new OBB().fromBox3(aabb);
                fasade.userData.obb = obb
                fasade.userData.curBodyExceptions = curBodyExceptions
                fasade.name = 'fasade'
                fasade.receiveShadow = true;
                fasade.castShadow = true

                const fasadeEdge = this.edgeBuilder.createEdge(fasade, fasade);
                const defaultEdge = this.edgeBuilder.createVisibleEdge(fasade)

                return { fasade, fasadeEdge }
            }
        }

        console.log(fasade_position, 'NONE MODEL')
        // Если нет готовой модели — создаём стандартный фасад
        const geometryConfig = {
            x: this.parent.calculateFromString(fasade_position.FASADE_WIDTH),
            y: this.parent.calculateFromString(fasade_position.FASADE_HEIGHT),
            z: this.parent.calculateFromString(fasade_position.FASADE_DEPTH ?? 16),
        };
        const geometry = this.parent.createExtrudeBoxGeometry(geometryConfig);
        const material = new THREE.MeshStandardMaterial();
        const curExceptionsMaterial = new THREE.MeshStandardMaterial({
            transparent: true,
            opacity: 0.5,
            color: new THREE.Color('rgb(255, 0, 0)')
        });

        if (curBodyExceptions && currentFasadeColor == 7397) {
            material.transparent = true
            material.opacity = 0.5
            material.color = new THREE.Color('rgb(255, 0, 0)')
        }
        // Применяем текстуру, если задан цвет фасада
        if (textureCheck) {
            const fasadeInfo = this.parent._FASADE[currentFasadeColor];
            if (fasadeInfo?.TEXTURE) {

                this.parent.getTexture({
                    material,
                    url: fasadeInfo.TEXTURE,
                    texture_size: {
                        width: fasadeInfo.TEXTURE_WIDTH,
                        height: fasadeInfo.TEXTURE_HEIGHT,
                    }
                });
            }
        }

        let fasade = new THREE.Mesh(geometry, material);

        fasade.geometry.computeBoundingBox();
        fasade.userData.partPosition = this.uniformeTextureStartData[key];
        fasade.updateMatrixWorld();
        if (curBodyExceptions) fasade.userData.curBodyExceptionsMaterial = curExceptionsMaterial.clone()
        fasade.userData.curBodyExceptions = curBodyExceptions

        const aabb = new THREE.Box3().setFromObject(fasade);
        const obb = new OBB().fromBox3(aabb);
        fasade.userData.obb = obb

        fasade.name = 'fasade'
        const fasadeEdge = this.edgeBuilder.createEdge(fasade);
        const defaultEdge = this.edgeBuilder.createVisibleEdge(fasade)
        fasade.receiveShadow = true;
        fasade.castShadow = true

        fasade.add(defaultEdge)

        return { fasade, fasadeEdge }
    }

    private processFasadeCreation({
        fasadePositionData,
        startPosition,
        props,
        FASADE_PROPS,
        FASADE,
        FASADE_DEFAULT,
        FASADE_POSITIONS,
        FASADE_TYPE,
        key,
        incomingModel,
        curBodyExceptions,
        parent,
        modelType,
        income = false
    }: {
        fasadePositionData: any,
        startPosition: THREE.Vector3,
        props: THREETypes.TObject,
        FASADE_PROPS: any[],
        FASADE: any[],
        FASADE_DEFAULT: any[],
        FASADE_POSITIONS: any[],
        FASADE_TYPE: string,
        key: number,
        incomingModel?: number,
        curBodyExceptions?: boolean,
        parent: THREE.Object3D,
        modelType: string,
        income?: boolean
    }): THREE.Object3D {
        console.log(fasadePositionData, 'fasadePositionData')

        // Создание фасада
        let { fasade, fasadeEdge, defaultEdge } = this.createFasade({
            fasade_position: fasadePositionData,
            start_position: startPosition,
            props_array: FASADE_PROPS,
            props,
            key,
            incomingModel,
            curBodyExceptions
        }) as THREE.Object3D;

        // // Истинные размеры фасада и запись в CONFIG.FASADE_POSITIONS[key]
        const box = new THREE.Box3().setFromObject(fasade);
        const size = box.getSize(new THREE.Vector3());
        const fasadeDepth = size.z > 1 ? size.z : fasadePositionData.FASADE_DEPTH ?? 16;
        const sizeRec = {
            FASADE_WIDTH: size.x,
            FASADE_HEIGHT: size.y,
            FASADE_DEPTH: fasadeDepth
        };


        // Позиционирование в сцене
        const result = this.setFasadePosition(fasade, fasadePositionData, modelType, startPosition, fasadeEdge);


        FASADE_POSITIONS[key].FASADE_WIDTH = size.x;
        FASADE_POSITIONS[key].FASADE_HEIGHT = size.y;
        FASADE_POSITIONS[key].FASADE_DEPTH = fasadeDepth;

        result.userData.trueSize = sizeRec;
        result.userData.type = FASADE_TYPE;

        // Создание ребра и добавление/восстановление фасада в массивы
        const isNewFasade = FASADE_DEFAULT.length < FASADE_PROPS.length;
        result.userData.edgeID = fasadeEdge.id;

        if (isNewFasade || income) {
            FASADE.push(result);
            const copy = result.clone();
            FASADE_DEFAULT.push(copy);
            result.visible = result.userData.SHOW = FASADE_PROPS[key].SHOW;
            parent.add(result, fasadeEdge);
        }

        return { result, fasadeEdge }
    }

    private checkFasadeDepth = (props, key) => {

        const fasadeData = this._FASADE[props[key]?.COLOR];
        if (!fasadeData?.DEPTH) return null
        return fasadeData?.DEPTH > 0 ? fasadeData.DEPTH : null;
    }

    private getFasadePosition(
        props: THREETypes.TObject,
        key: string | number,
        isUMmodule: boolean = false
    ) {

        console.log('AUF');
        
        if (isUMmodule) return props.FASADE_POSITIONS[key];

        const { SIZE, EXPRESSIONS, FASADE_PROPS, FASADE_POSITIONS, FASADE_SIZE } = props;

        const fasadeList = FASADE_PROPS[key]?.POSITION ?? FASADE_PROPS[0]?.POSITION;

        let fasadePosition = this.parent._FASADE_POSITION[fasadeList];

        const replacedExpressions = this.parent.expressionsReplace(fasadePosition, {
            ...EXPRESSIONS,
            "#X#": SIZE.width,
            "#Y#": SIZE.height || 2100,
            "#Z#": SIZE.depth,
        });

        const curFasadeDepth = this.checkFasadeDepth(FASADE_PROPS, key) ?? replacedExpressions.FASADE_DEPTH

        // console.log(curFasadeDepth)

        const fasadePositionsData: THREETypes.TFasadePositionItem = {

            // FASADE_DEPTH: this.parent.calculateFromString(curFasadeDepth),

            POSITION_2_X: replacedExpressions.POSITION_2_X,
            POSITION_2_Y: replacedExpressions.POSITION_2_Y,
            POSITION_2_Z: replacedExpressions.POSITION_2_Z,
            ROTATE_X: replacedExpressions.ROTATE_X,
            ROTATE_Y: replacedExpressions.ROTATE_Y,
            ROTATE_Z: replacedExpressions.ROTATE_Z,
            ROTATE_2_X: replacedExpressions.ROTATE_2_X,
            ROTATE_2_Y: replacedExpressions.ROTATE_2_Y,
            ROTATE_2_Z: replacedExpressions.ROTATE_2_Z,
            FASADE_MODEL: replacedExpressions.FASADE_MODEL,

            FASADE_WIDTH: this.parent.calculateFromString(replacedExpressions.FASADE_WIDTH),
            FASADE_HEIGHT: this.parent.calculateFromString(replacedExpressions.FASADE_HEIGHT),
            POSITION_X: this.parent.calculateFromString(replacedExpressions.POSITION_X),
            POSITION_Y: this.parent.calculateFromString(replacedExpressions.POSITION_Y),
            POSITION_Z: this.parent.calculateFromString(replacedExpressions.POSITION_Z),
            FASADE_NUMBER: replacedExpressions.FASADE_NUMBER - 1, // массив начинается с 0
            FASADE_DEPTH: 16,
            FILLING: replacedExpressions.filling,
            SHOWCASE: replacedExpressions.glass,
            FASADE_TYPE: replacedExpressions.fasade_type

        };

        // Добавляем фасадную позицию в CONFIG, если ещё не существует
        if (this.parent.addIfNotExists(FASADE_POSITIONS, fasadePositionsData)) {
            if (!FASADE_POSITIONS.length) {
                FASADE_POSITIONS.push(fasadePositionsData);
            } else {
                FASADE_POSITIONS[key] = fasadePositionsData;
            }
        }

        return fasadePositionsData;
    }

    private setFasadePosition(
        fasade: THREE.Mesh,
        fasade_position: THREETypes.TObject,
        product_model_type: string,
        start_position: THREETypes.TObject,
        fasadeEdge: THREE.Mesh,
    ) {
        const { rotation, position } = this.createPositionData(fasade_position, start_position, product_model_type);


        fasade.rotation.set(rotation.x, rotation.y, rotation.z);
        fasade.position.set(position.x, position.y, position.z);

        fasadeEdge.rotation.set(rotation.x, rotation.y, rotation.z);
        fasadeEdge.position.set(position.x, position.y, position.z);

        const cloned: THREE.Mesh = fasade.clone()
        const modelName = fasade_position.FASADE_MODEL


        if (modelName) {
            if (cloned.isObject3D && cloned.children.length == 1) {
                const copy = cloned.children[0].clone()
                cloned.updateMatrixWorld(true);
                const worldMatrix = cloned.matrixWorld;
                copy.applyMatrix4(worldMatrix);

                return copy
            }
        }

        return fasade
    }

    private createPositionData = (positionData, startData, type) => {
        const degToRad = THREE.MathUtils.degToRad;
        const isRightModel = type === "right";

        const rotations = {
            left: {
                x: degToRad(-(positionData?.ROTATE_X ?? 0)),
                y: degToRad(-(positionData?.ROTATE_Y ?? 0)),
                z: degToRad(-(positionData?.ROTATE_Z ?? 0))
            },
            right: {
                x: degToRad(-(positionData?.ROTATE_2_X ?? positionData?.ROTATE_X ?? 0)),
                y: degToRad(-(positionData?.ROTATE_2_Y ?? positionData?.ROTATE_Y ?? 0)),
                z: degToRad(-(positionData?.ROTATE_2_Z ?? positionData?.ROTATE_Z ?? 0))
            },
            default: {
                x: degToRad(positionData?.ROTATE_X ?? 0),
                y: degToRad(positionData?.ROTATE_Y ?? 0),
                z: degToRad(positionData?.ROTATE_Z ?? 0)
            }
        };

        const rotation = {
            x: rotations[type]?.x ?? rotations.default.x,
            y: rotations[type]?.y ?? rotations.default.y,
            z: rotations[type]?.z ?? rotations.default.z
        };

        const pos = {
            x: this.parent.calculateFromString(isRightModel ? (positionData?.POSITION_2_X ?? positionData?.POSITION_X) : positionData?.POSITION_X ?? 0),
            y: this.parent.calculateFromString(isRightModel ? (positionData?.POSITION_2_Y ?? positionData?.POSITION_Y) : positionData?.POSITION_Y ?? 0),
            z: this.parent.calculateFromString(isRightModel ? (positionData?.POSITION_2_Z ?? positionData?.POSITION_Z) : positionData?.POSITION_Z ?? 0)
        };

        const position = new THREE.Vector3(
            startData.x + (this.parent.calculateFromString(positionData?.FASADE_WIDTH ?? 0) / 2) + pos.x,
            startData.y + (this.parent.calculateFromString(positionData?.FASADE_HEIGHT ?? 0) / 2) + pos.y,
            startData.z + pos.z
        );

        return { rotation, position };
    };

    //------------------------------
    /** @Интегрированная_ручка */
    //------------------------------

    private getIntegratedHandleTypeList = (data: TMillingListItem, fType: number[]) => {

        if (!this._MILLING[data]) return [null]

        if (!fType) return [null]

        const prepare = this._MILLING[data].fasade_type.filter(el => {

            return fType.includes(el)
        })

        return prepare;
    }

    private containsValue = (array, searchValue) => {
        return array.some(item =>
            Object.values(item).some(value =>
                String(value).includes(String(searchValue))
            )
        );
    }

    // ---------------------------------------------------------------------------
    // Работа с опциями
    // ---------------------------------------------------------------------------

    public processOptions = (params: IncomeOptionData) => {

        const { data, mesh, defaultMesh } = params;
        const { disabledOptions = [] } = data

        // Распил
        const isCutOption = this.cutIds.includes(data.option.ID);
        const isCutDisabled = disabledOptions.some(item => this.cutIds.includes(item.id));
        // Присадка
        const isAdditiveOption = this.additiveIds.includes(data.option.ID);
        const isAdditiveDisabled = disabledOptions.some(item => this.additiveIds.includes(item.id));

        if (!isCutOption && !isCutDisabled && !isAdditiveOption && !isAdditiveDisabled) return

        if (isCutOption || !isCutOption && isCutDisabled) {
            this.createCutFasade(params)
        }

        if (isAdditiveOption || !isAdditiveOption && isAdditiveDisabled) {
            this.createAdditiveMark(params)
        }

        return;
    }

    private checkFasadeOptions = (OPTIONS, FASADE, FASADE_DEFAULT) => {
        [...this.cutIds, ...this.additiveIds].forEach(id => {
            const isOption = OPTIONS.find(el => el.id === id)
            if (!isOption) return
            const currentOption = this._APP.OPTION[isOption.id]
            if (isOption.active) {
                this.processOptions({
                    data: {
                        option: currentOption,
                        values: true
                    },
                    mesh: FASADE,
                    defaultMesh: FASADE_DEFAULT
                })
            }
        })


    }

    //------------------------------
    /** @Распил_фасада */
    //------------------------------

    private createCutFasade(params: IncomeOptionData) {

        const { data, mesh, defaultMesh } = params;
        const isActive = data.values;
        const { disabledOptions = [] } = data
        const isCutDisabled = disabledOptions.some(item => this.cutIds.includes(item.id));

        const resetMesh = () => {
            mesh.forEach((m, i) => {
                if (m.userData.cutPart) {
                    m.parent?.remove(m.userData.cutPart);
                    m.userData.cutPart.geometry.dispose();
                    m.userData.cutPart = null;
                }
                if (defaultMesh[i]) {
                    const prevGeom = m.geometry;
                    m.geometry = defaultMesh[i].geometry.clone();
                    if (prevGeom !== defaultMesh[i].geometry) prevGeom.dispose();
                    m.position.copy(defaultMesh[i].position);
                }
            });
        }

        const option = data.option;
        const name: string = option?.NAME ?? '';
        const isVertical = name.includes('вертикали');
        const isHorizontal = name.includes('горизонтали');
        const notCut = !isVertical && !isHorizontal


        if (isCutDisabled && notCut) {
            resetMesh();
            return;
        }

        if (notCut) {
            return;
        }

        if (!isActive) {
            resetMesh();
            return;
        }

        const evaluator = new Evaluator();

        mesh.forEach((m, i) => {
            if (m.userData.cutPart) {
                m.parent?.remove(m.userData.cutPart);
                m.userData.cutPart.geometry.dispose();
                m.userData.cutPart = null;
            }

            const defaultGeom = defaultMesh[i]?.geometry;
            if (!defaultGeom) return;

            const { FASADE_WIDTH, FASADE_HEIGHT, FASADE_DEPTH } = m.userData.trueSize ?? {};
            if (!FASADE_WIDTH || !FASADE_HEIGHT || !FASADE_DEPTH) return;

            const baseBrush = new Brush(defaultGeom.clone());
            baseBrush.material = Array.isArray(m.material) ? m.material[0] : m.material;
            baseBrush.updateMatrixWorld();

            const cutterGeom = isHorizontal
                ? new THREE.BoxGeometry(FASADE_WIDTH * 2, 20, FASADE_DEPTH * 2)
                : new THREE.BoxGeometry(20, FASADE_HEIGHT * 2, FASADE_DEPTH * 2);

            const cutterBrush = new Brush(cutterGeom);
            cutterBrush.updateMatrixWorld();

            const result = evaluator.evaluate(baseBrush, cutterBrush, SUBTRACTION);
            result.geometry.computeVertexNormals();

            const prevGeom = m.geometry;
            m.geometry = result.geometry;
            if (prevGeom !== defaultMesh[i].geometry) prevGeom.dispose();

            baseBrush.geometry.dispose();
            cutterGeom.dispose();
        });
    }

    //------------------------------
    /** @Присадки_фасада */
    //------------------------------

    private createAdditiveMark = (params: IncomeOptionData) => {
        const { data, mesh } = params;
        const { disabledOptions = [] } = data;
        const isActive = data.values;
        const isAdditiveDisabled = disabledOptions.some(item => this.additiveIds.includes(item.id));

        const removeMarks = () => {
            mesh.forEach(m => {
                if (m.userData.additiveMarksGroup) {
                    m.userData.additiveMarksGroup.traverse(child => {
                        if (child.isMesh) {
                            child.geometry.dispose();
                            if (!Array.isArray(child.material)) child.material.dispose();
                        }
                    });
                    m.remove(m.userData.additiveMarksGroup);
                    m.userData.additiveMarksGroup = null;
                }
            });
        };

        const option = data.option;
        const name: string = option?.NAME ?? '';
        const isVB = name.includes('под VB стяжку');
        const isEccentric = name.includes('под эксцентрик');

        if (isAdditiveDisabled && !isVB && !isEccentric) {
            removeMarks();
            return;
        }

        if (!isVB && !isEccentric) return;

        if (!isActive) {
            removeMarks();
            return;
        }

        mesh.forEach(m => {
            if (m.userData.additiveMarksGroup) {
                m.userData.additiveMarksGroup.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (!Array.isArray(child.material)) child.material.dispose();
                    }
                });
                m.remove(m.userData.additiveMarksGroup);
                m.userData.additiveMarksGroup = null;
            }

            const { FASADE_WIDTH, FASADE_HEIGHT, FASADE_DEPTH } = m.userData.trueSize ?? {};
            if (!FASADE_WIDTH || !FASADE_HEIGHT || !FASADE_DEPTH) return;

            const group = new THREE.Group();
            const halfX = FASADE_WIDTH * 0.5;
            const halfY = FASADE_HEIGHT * 0.5;
            const halfZ = FASADE_DEPTH * 0.5;

            if (isVB) {
                const material = new THREE.LineBasicMaterial({
                    color: 0xff0000,
                    depthTest: false,
                    depthWrite: false,
                    transparent: true,
                    opacity: 1,
                });
                const geom = new THREE.CylinderGeometry(10, 10, FASADE_DEPTH, 10);
                const edges = new THREE.EdgesGeometry(geom)

                const positions = [
                    // [-halfX + 10, halfY - 35, halfZ],
                    // [halfX - 10, halfY - 35, halfZ],
                    // [-halfX + 10, -halfY + 35, halfZ],
                    // [halfX - 10, -halfY + 35, halfZ],

                    [-halfX + 35, halfY - 10, halfZ],
                    [halfX - 35, halfY - 10, halfZ],
                    [-halfX + 35, -halfY + 10, halfZ],
                    [halfX - 35, -halfY + 10, halfZ],
                ];

                // if (FASADE_HEIGHT >= this.additiveMiddleWidth) {
                if (FASADE_WIDTH >= this.additiveMiddleWidth) {
                    positions.push(
                        // [-halfX + 10, 0, halfZ],
                        // [halfX - 10, 0, halfZ],
                        [0, halfY - 10, halfZ],
                        [0, -halfY + 10, halfZ],
                    );
                }

                positions.forEach(([x, y, z]) => {
                    // const mark = new THREE.Mesh(geom, material);
                    const mark = new THREE.LineSegments(edges, material);
                    mark.rotation.x = Math.PI * 0.5;
                    mark.position.set(x, y, z);
                    mark.renderOrder = 0;
                    group.add(mark);
                });

            } else if (isEccentric) {
                const material = new THREE.LineBasicMaterial({
                    color: 0x0000ff,
                    depthTest: false,
                    depthWrite: false,
                    transparent: true,
                    opacity: 1,
                });

                // Перпендикулярные метки: d=15, длина=FASADE_DEPTH, ось Z
                const perpGeom = new THREE.CylinderGeometry(10, 10, FASADE_DEPTH, 8);
                const perpEdges = new THREE.EdgesGeometry(perpGeom)


                const perpPositions = [
                    // [-halfX + 26, halfY - 68 + 7.5, halfZ],
                    // [halfX - 26, halfY - 68 + 7.5, halfZ],
                    // [-halfX + 26, -halfY + 68 - 7.5, halfZ],
                    // [halfX - 26, -halfY + 68 - 7.5, halfZ],

                    [-halfX + 68 + 7.5, halfY - 26, halfZ],
                    [halfX - 68 - 7.5, halfY - 26, halfZ],
                    [-halfX + 68 + 7.5, -halfY + 26, halfZ],
                    [halfX - 68 - 7.5, -halfY + 26, halfZ],
                ];

                perpPositions.forEach(([x, y, z]) => {
                    // const mark = new THREE.Mesh(perpGeom, material);
                    const mark = new THREE.LineSegments(perpEdges, material);
                    mark.rotation.x = Math.PI * 0.5;
                    mark.position.set(x, y, z);
                    mark.renderOrder = 0;
                    group.add(mark);
                });

                // Параллельные метки: d=10, длина=26, ось Y (в плоскости фасада)
                const parallelGeom = new THREE.CylinderGeometry(5, 5, 26, 8);
                const parallelEdges = new THREE.EdgesGeometry(parallelGeom)

                const parallelPositions = [
                    // [-halfX + 13, halfY - 36 + 7.5, halfZ],
                    // [halfX - 13, halfY - 36 + 7.5, halfZ],
                    // [-halfX + 13, halfY - 68 + 7.5, halfZ],
                    // [halfX - 13, halfY - 68 + 7.5, halfZ],
                    // [-halfX + 13, -halfY + 36 - 7.5, halfZ],
                    // [halfX - 13, -halfY + 36 - 7.5, halfZ],
                    // [-halfX + 13, -halfY + 68 - 7.5, halfZ],
                    // [halfX - 13, -halfY + 68 - 7.5, halfZ],

                    [-halfX + 36 + 7.5, halfY - 13, halfZ],
                    [halfX - 36 - 7.5, halfY - 13, halfZ],
                    [-halfX + 68 + 7.5, halfY - 13, halfZ],
                    [halfX - 68 - 7.5, halfY - 13, halfZ],
                    [-halfX + 36 + 7.5, -halfY + 13, halfZ],
                    [halfX - 36 - 7.5, -halfY + 13, halfZ],
                    [-halfX + 68 + 7.5, -halfY + 13, halfZ],
                    [halfX - 68 - 7.5, -halfY + 13, halfZ],
                ];

                if (FASADE_WIDTH >= this.additiveMiddleWidth) {
                    parallelPositions.push(
                        // [-halfX + 13, 0, halfZ],
                        // [halfX - 13, 0, halfZ],

                        [0, halfY - 13, halfZ],
                        [0, -halfY + 13, halfZ],
                    );
                }


                parallelPositions.forEach(([x, y, z]) => {
                    // const mark = new THREE.Mesh(parallelGeom, material);
                    const mark = new THREE.LineSegments(parallelEdges, material);
                    mark.position.set(x, y, z);
                    // mark.rotateZ(Math.PI * 0.5)
                    mark.renderOrder = 0;
                    group.add(mark);
                });
            }

            m.add(group);
            m.userData.additiveMarksGroup = group;
        });
    }

    // ---------------------------------------------------------------------------

    //------------------------------
    /** @Для_переходящего_рисунка */
    //------------------------------

    private numberingToUniform(FASADE_PROPS, CONFIG, BODY, isUMmodule?: boolean = false) {

        const numered: TFasadePartPosition[] = []

        FASADE_PROPS.forEach((prop, propNdx) => {

            const fasade_position = this.getFasadePosition(CONFIG, propNdx, isUMmodule);

            const { BODY_WIDTH } = BODY.userData.trueSize
            const { FASADE_WIDTH } = fasade_position
            const fasadeWidth = this.parent.calculateFromString(FASADE_WIDTH)

            // console.log(fasade_position, 'fasade_position')


            const partPosition: TFasadePartPosition = {
                TYPE_POSITION: null,
                WIDTH: null,
                FASADE_NUMBER: null,
            }

            partPosition.TYPE_POSITION = fasadeWidth < BODY_WIDTH - 4 ? partPosition.TYPE_POSITION = 'row' : partPosition.TYPE_POSITION = 'col'
            partPosition.WIDTH = fasadeWidth
            partPosition.FASADE_NUMBER = propNdx

            numered.push(partPosition)


        })

        const hasColType = numered.some(obj => obj.TYPE_POSITION === 'col');
        const hasRowType = numered.some(obj => obj.TYPE_POSITION === 'row');
        const hasMixedTypes = hasColType && hasRowType;

        const result = {
            numeredArray: numered,
            hasMixedTypes
        }

        return result

    }

    private rearrangeFasadeNumbers(inputArray) {
        const outputArray = [];
        let tempArray = [];
        const result = []
        const def = []
        let str = []
        let strNdx

        // Шаг 1: Изменяем порядок элементов с TYPE_POSITION: "STRING"
        for (let i = 0; i < inputArray.length; i++) {
            if (inputArray[i].TYPE_POSITION === "col") {
                if (tempArray.length > 0) {
                    outputArray.push(...tempArray.reverse()); // Добавляем элементы в обратном порядке
                    tempArray = []; // Очищаем временный массив
                }
                outputArray.push(inputArray[i]); // Добавляем элемент с DEFAULT
            } else if (inputArray[i].TYPE_POSITION === "row") {
                tempArray.push(inputArray[i]); // Добавляем элемент с STRING во временный массив
            }
        }

        // Если остались элементы в tempArray, добавляем их в outputArray
        if (tempArray.length > 0) {
            outputArray.push(...tempArray.reverse());
        }

        // Шаг 2: Обновляем значения FASADE_NUMBER
        let currentFasadeNumber = outputArray.length - 1; // Начинаем с максимального значения


        for (let i = 0; i < outputArray.length; i++) {
            if (outputArray[i].TYPE_POSITION === "col") {
                outputArray[i].FASADE_NUMBER = currentFasadeNumber;
                currentFasadeNumber--;
            } else if (outputArray[i].TYPE_POSITION === "row") {
                outputArray[i].FASADE_NUMBER = currentFasadeNumber;
                currentFasadeNumber--;
            }
        }

        // Шаг 3: Группируем значения STRING с лева на право
        outputArray.forEach((item, ndx, array) => {

            if (item.TYPE_POSITION === "col") def.push({ id: ndx + 1, type: item })

            if (ndx > 0 && array[ndx - 1].TYPE_POSITION === "col") {
                strNdx = ndx
                str.push({
                    id: ndx,
                    subStr: []
                })

            }

            if (item.TYPE_POSITION === "row") {
                str.forEach(elem => {
                    if (elem.id === strNdx) {
                        elem.subStr.push(item)
                    }
                })

            }

        })

        str.forEach(item => {
            item.subStr.reverse()
        })

        def.forEach((item, ndx) => {

            result.push(item.type)

            str.forEach(elem => {
                if (elem.id === item.id) {
                    result.push(elem.subStr)
                }
            })
        })

        return result.flat();
    }

    private indexedFasadeToUtiformTexturing(props: any, isUMmodule?: boolean = false) {

        const { CONFIG, BODY } = props
        const { FASADE_PROPS } = CONFIG

        const numeredFasade = this.numberingToUniform(FASADE_PROPS, CONFIG, BODY, isUMmodule)

        if (numeredFasade.hasMixedTypes) {
            numeredFasade.numeredArray = this.rearrangeFasadeNumbers(numeredFasade.numeredArray)
        }

        this.uniformeTextureStartData = numeredFasade.numeredArray

    }

}
