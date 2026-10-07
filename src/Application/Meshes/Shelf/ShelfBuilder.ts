import { TTotalProps, TBuildProduct, TEdgeBuilder } from "@/types/types";
import { IShelfData } from "@/types/interfases";
import {
    WARDROBE_ANGLED_SHELF_ANGLE_DEG,
    WARDROBE_ANGLED_SHELF_PIVOT_HEIGHT,
    WARDROBE_SHELF_BRACKET_WIDTH,
    WARDROBE_SHELF_BRACKET_DEPTH,
    WARDROBE_SHELF_BRACKET_HEIGHT_FLAT,
    WARDROBE_SHELF_BRACKET_HEIGHT_ANGLED,
} from "@/Application/F-wardrobeData.ts";
import { getWardrobeShelfThickness, getWardrobeAngledShelfLength, getWardrobeAngledShelfPivotOffset, getWardrobeShelfDepth } from "@/components/UMconstructor/wardrobe/WardrobeSystem.ts";
import { createGlassMaterial } from "@/Application/Meshes/Utils/glassMaterial.ts";
import { createWardrobeMetalMaterial } from "@/Application/Meshes/Wardrobe/WardrobeFillingMeshBuilder.ts";
import {
    Material,
    Vector3,
    Box3,
    MeshBasicMaterial,
    MeshStandardMaterial,
    MeshPhongMaterial,
    MeshPhysicalMaterial,
    MeshLambertMaterial,
    BoxGeometry,
    CylinderGeometry,
    Mesh,
    Object3D
} from "three";



export class ShelfBuilder {
    private parent: TBuildProduct

    private edgeBuilder: TEdgeBuilder
    materialMap: Record<string, Material> = {
        MeshBasicMaterial: new MeshBasicMaterial(),
        MeshStandardMaterial: new MeshStandardMaterial(),
        MeshPhongMaterial: new MeshPhongMaterial(),
        MeshPhysicalMaterial: new MeshPhysicalMaterial(),
        MeshLambertMaterial: new MeshLambertMaterial(),
    };

    constructor(parent: TBuildProduct) {
        this.parent = parent

        this.edgeBuilder = parent.edge_builder;
        parent.getStartPosition

    }

    createShelfs(props: TTotalProps, shelfs: IShelfData, material: Material, move: Vector3) {

        const parent = new Object3D();
        const { depth, width: initWidth } = props.CONFIG.SIZE;
        const correction = shelfs.WIDTH_CORRECTION;
        const startPos = this.parent.getStartPosition(props.CONFIG.SIZE);
        const { BODY_DEPTH } = props.BODY.userData.trueSize
        const correctDepth = depth > BODY_DEPTH ? BODY_DEPTH : depth


        const matType = props.BODY.userData.MATERIAL_TYPE ?? "MeshStandardMaterial";
        const shelfMaterial = material || this.materialMap[matType] || this.materialMap.MeshStandardMaterial;

        props.SHELF = [];

        // Вспомогательная функция для создания полок по оси
        const createShelves = (
            axis: "X" | "Y",
            sizeKey: keyof typeof props.CONFIG.SIZE,
            posKey: "x" | "y",
            namePrefix: string
        ) => {

            const { height } = props.CONFIG.SIZE;
            let accumulatedWidth = initWidth;

            shelfs[axis].forEach((shelfExpression, index) => {
                if (correction && index > 0) {
                    accumulatedWidth += correction;
                }

                const geometry = posKey === "x"
                    ? new BoxGeometry(16, height - 32, correctDepth)
                    : new BoxGeometry(accumulatedWidth - 32, 16, correctDepth);
                const mesh: Mesh = new Mesh(geometry, shelfMaterial);


                mesh.receiveShadow = true;
                mesh.castShadow = true;

                // Вычисление позиции по выражению (например, "50%", "#Y#/2 + 100" и т.д.)
                const positionValue = eval(
                    this.parent.expressionsReplace(shelfExpression, {
                        [`#${axis}#`]: props.CONFIG.SIZE[sizeKey],
                    })
                );

                mesh.position[posKey] = startPos[posKey] + positionValue;
                mesh.position.z = move.z;
                mesh.name = `${namePrefix}_${index}`;

                (props.SHELF as Mesh[]).push(mesh);

                // Создаём кромки (если edge_builder доступен в контексте)
                const edge = this.edgeBuilder.createEdge(mesh);
                const defEdge = this.edgeBuilder.createVisibleEdge(mesh);
                parent.add(mesh, edge, defEdge);
            });
        };

        createShelves("Y", "height", "y", "SHELF_HORIZONT");
        createShelves("X", "width", "x", "SHELF_VERTICAL");

        return parent;

    }

    buildShelves(props: TTotalProps, material: Material) {

        const parent = new Object3D();
        const { SHELF, CONFIG } = props
        const { SHELFQUANT, SIZE, MECHANISM } = CONFIG

        // console.log(MECHANISM, '==== MECHANISM ====')

        const total = SHELFQUANT.max!
        const current = SHELFQUANT.current!
        // const total = 10
        // const current = 10
        const { width, height, depth } = SIZE
        const mechanizmTemp = height * 0.5 - 216


        const matType = props.BODY?.userData.MATERIAL_TYPE ?? "MeshStandardMaterial";
        const shelfMaterial = material || this.materialMap[matType] || this.materialMap.MeshStandardMaterial;

        const startPos = this.parent.getStartPosition(SIZE);


        for (let i = 1; current >= i && current <= total; i++) {
            const position = startPos.y + (height / (current + 1)) * i;
            const mechanizm = position > mechanizmTemp && MECHANISM
            const correctDepth = mechanizm ? depth - 50 : depth

            let mesh = new Mesh(
                new BoxGeometry(width - 32, 16, correctDepth),
                shelfMaterial
            );
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.position.y = position;
            mesh.position.z = mechanizm ? -25 : 0
            const positionToBascet = (mesh.position.y + height * 0.5).toFixed(4);
            mesh.userData.positionY = positionToBascet;

            (SHELF as Mesh[]).push(mesh);

            const edge = this.edgeBuilder.createEdge(mesh);
            const defEdge = this.edgeBuilder.createVisibleEdge(mesh);
            parent.add(mesh, edge, defEdge);
        }

        return parent;
    }

    // ==== Гардеробная система (WARDROBE) — реальная длина полки ====
    // Через ту же getWardrobeShelfDepth(grid), что и 2D — чтобы длина полки
    // была ОДНА для канваса и 3D-геометрии. Сегодня она возвращает ровно
    // grid.depth, т.е. численно то же, что props.CONFIG.SIZE.depth, но ходим
    // через функцию: если состав глубины снова уточнится, обе стороны поедут
    // вместе. Именно так и возникло расхождение, пойманное на сверке 2D с
    // 3D-ортографией. Откат на SIZE.depth — если сетки в CONFIG нет.
    private getWardrobeShelfDepthFromProps(props: TTotalProps): number {
        const grid = (props.CONFIG as any)?.WARDROBEGRID
        return grid?.sections?.length
            ? getWardrobeShelfDepth(grid)
            : props.CONFIG.SIZE.depth
    }

    // ==== Гардеробная система (WARDROBE) — крепёжные кронштейны полки ====
    // Пара пластин 4×50, держащих полку — по одной у левого и правого
    // профиля сектора; ставятся вровень с торцами доски, внутри её габарита.
    // Раньше кронштейн учитывался только в формулах зазоров, но не рисовался.
    //
    // topY — Y ВЕРХА кронштейна в системе координат полки, высота идёт вниз
    // от него: у прямой полки это низ доски (она на нём лежит), у наклонной —
    // точка от оси поворота (см. вызовы).
    //
    // colorId — цвет ПРОФИЛЯ (_COLOR), а не полки (_FASADE): кронштейн — та
    // же фурнитура, что профиль (как LegBuilder.createWardrobeWallBracket).
    private buildWardrobeShelfBrackets(
        sectionWidth: number,
        topY: number,
        height: number,
        profileColorId?: number
    ): Object3D {
        const brackets = new Object3D()
        const shelfWidth = sectionWidth - 4
        const offsetX = (shelfWidth - WARDROBE_SHELF_BRACKET_WIDTH + 4) / 2

        console.log(height, 'height')

            // Свой материал на каждый кронштейн, не общий инстанс: в него
            // может грузиться текстура (createWardrobeMetalMaterial)
            ;[-offsetX, offsetX].forEach((x, index) => {
                const geometry = new BoxGeometry(WARDROBE_SHELF_BRACKET_WIDTH, height, WARDROBE_SHELF_BRACKET_DEPTH)
                const mesh = new Mesh(geometry, createWardrobeMetalMaterial(this.parent, profileColorId, true))
                mesh.castShadow = true
                mesh.receiveShadow = true
                mesh.position.set(x, topY - height / 2, 0)
                mesh.name = `WARDROBE_SHELF_BRACKET_${index}`

                brackets.add(mesh, this.edgeBuilder.createEdge(mesh), this.edgeBuilder.createVisibleEdge(mesh))
            })

        brackets.name = 'WARDROBE_SHELF_BRACKETS'
        return brackets
    }

    // ==== Гардеробная система (WARDROBE) — временно, черновик ====
    // В отличие от createShelfs/buildShelves выше (BoxGeometry с обобщённым
    // материалом), строится из реального товара _PRODUCTS[shelfProductId] —
    // нужны настоящие толщина/кромка/цвет. Ширина = ширина сектора - 4 (по
    // 2мм зазора от каждого профиля).
    //
    // colorId — материал из _FASADE (WardrobeFillingsView.vue): DEPTH даёт
    // толщину, TEXTURE — текстуру. Только для 'ldsp', у стекла не ставится.
    //
    // material — 'ldsp' | 'glass'. Толщина для обоих через ту же
    // WardrobeSystem.getWardrobeShelfThickness, что и в 2D (для стекла берёт
    // _PRODUCTS[<товар type:"glass">].height, а не _FASADE.DEPTH). Материал
    // стекла — createGlassMaterial() (как у ShowcaseBuilder), подменяется
    // ПОСЛЕ создания меша; геометрия и позиционирование общие.
    //
    // positionY — из 2D, НИЖНЯЯ грань полки в мм от пола МОДУЛЯ (floorY),
    // поэтому центр геометрии смещается на positionY + полтолщины. X не
    // считается: полка строится в координатах сектора (X=0 — центр), сдвиг
    // делает WardrobeFillingMeshBuilder.
    buildWardrobeShelf(
        props: TTotalProps,
        shelfProductId: number,
        sectionWidth: number,
        positionY: number,
        colorId?: number,
        material?: 'ldsp' | 'glass',
        profileColorId?: number
    ): Object3D | null {
        const productInfo = this.parent._PRODUCTS[shelfProductId]
        if (!productInfo) return null

        const isGlass = material === 'glass'
        const shelfWidth = sectionWidth - 4
        const shelfColor = !isGlass && colorId ? this.parent._FASADE[colorId] : null

        const wardrobeProductId = props.CONFIG.ID != null ? Number(props.CONFIG.ID) : undefined

        const desiredThickness = getWardrobeShelfThickness(colorId, material, wardrobeProductId)

        const shelfSize = {
            width: shelfWidth,
            height: desiredThickness,
            depth: this.getWardrobeShelfDepthFromProps(props),   // см. хелпер выше — тот же источник, что у 2D
        }

        const data = this.parent.createModelData(this.parent._MODELS[productInfo.models[0]], props, shelfSize)

        const textureUrl = shelfColor?.TEXTURE ?? this.parent._FASADE[props.CONFIG.MODULE_COLOR]?.TEXTURE
        const body = this.parent.json_builder.createMesh({ data, textureUrl }) as Mesh
        body.name = 'WARDROBE_SHELF'

        // json_builder.createMesh возвращает Object3D-ГРУППУ (children —
        // Mesh), а не Mesh, несмотря на приведение "as Mesh" (см.
        // JsonProductBuilder.parseDate: group.add(...)). Присваивание
        // body.material писало бы несуществующее для Object3D поле, которое
        // рендерер не читает — полка так и оставалась ЛДСП-текстурой.
        // Материал нужно ставить РЕАЛЬНЫМ дочерним мешам через traverse.
        if (isGlass) {
            body.traverse((child) => {
                if (child instanceof Mesh) child.material = createGlassMaterial()
            })
        }

        // Толщину доски задаёт НЕ #Y# (shelfSize.height), а отдельный токен
        // #MATERIAL_THICKNESS# в BuildersHelper.createModelData — он берётся
        // из props.CONFIG.MODULE_COLOR (_FASADE[...]?.DEPTH || 18). Товар
        // общий с box-UM, где MODULE_COLOR всегда есть; у гардеробной системы
        // его нет, и токен молча падает на 18 при любом shelfSize.height (на
        // стекле в 6мм было видно сразу).
        //
        // createModelData — общая функция с десятками вызывающих, не трогаем:
        // измеряем построенную толщину и досчитываем. Правим ГЕОМЕТРИЮ, а не
        // body.scale.y — createEdge/createVisibleEdge строят кромку из
        // mesh.geometry и явно игнорируют scale (matrix.decompose(...,
        // Vector3(1,1,1))), так что кромка осталась бы прежней. Геометрия
        // правится ДО createEdge; у прямоугольной доски масштаб по Y меняет
        // только толщину.
        const rawThickness = new Box3().setFromObject(body).getSize(new Vector3()).y
        if (rawThickness > 0 && Math.abs(rawThickness - desiredThickness) > 0.01) {
            const scaleFactor = desiredThickness / rawThickness
            body.traverse((child) => {
                if (child instanceof Mesh) child.geometry.scale(1, scaleFactor, 1)
            })
        }

        // Центрируем по X/Z ИЗМЕРЕННЫМ bounding box'ом, а не position.set:
        // локальный (0,0,0) каталожной JSON-модели не обязан совпадать с её
        // геометрическим центром, и полка съезжала относительно профиля.
        const box = new Box3().setFromObject(body)
        const size = box.getSize(new Vector3())
        const center = box.getCenter(new Vector3())

        // floorY = -height/2: геометрия ЦЕНТРИРОВАНА относительно Y=0, а не
        // растёт от нуля — этого требует комнатное позиционирование.
        // OBBCollider.getCorrectPosition ставит `position.y = trueSizes.HEIGHT
        // - 0.001`, где HEIGHT — половина измеренной высоты сборки
        // (BuildProduct.setBounds); формула читает только size.y, т.е.
        // СТРУКТУРНО предполагает симметрию (центр=0 -> низ = 0 = пол). При
        // геометрии 0..height центр был бы на +height/2, и объект повисал бы
        // на половину своей высоты над полом.
        const floorY = -props.CONFIG.SIZE.height / 2
        body.position.x -= center.x
        body.position.z -= center.z
        body.position.y += floorY + positionY + size.y / 2 - center.y

        body.userData.trueSizes = { BODY_WIDTH: size.x, BODY_HEIGHT: size.y, BODY_DEPTH: size.z }

        // Кромка — как в createShelfs/buildShelves выше: createEdge/
        // createVisibleEdge ПОСЛЕ финальной позиции меша, результат сиблингом
        // рядом. Но createShelfs пишет во внешний parent, а эта функция
        // возвращает ОДИН объект — поэтому body+кромки идут в свой wrapper.
        const edge = this.edgeBuilder.createEdge(body)
        const defEdge = this.edgeBuilder.createVisibleEdge(body)
        const wrapper = new Object3D()
        wrapper.name = body.name
        wrapper.userData = body.userData
        wrapper.add(body, edge, defEdge)

        // Кронштейны: доска ПРЯМОЙ полки лежит на их верхней точке, значит
        // верх кронштейна = низ доски = floorY + positionY (та же величина,
        // к которой доска только что выровнена выше).
        wrapper.add(this.buildWardrobeShelfBrackets(
            sectionWidth,
            floorY + positionY,
            WARDROBE_SHELF_BRACKET_HEIGHT_FLAT,
            profileColorId,
        ))

        return wrapper
    }

    // ==== Гардеробная система (WARDROBE) — временно, черновик ====
    // Наклонная (обувная) полка — тот же товар-полка, что и в
    // buildWardrobeShelf (отдельного ID для наклонной в каталоге нет), но
    // повёрнут на WARDROBE_ANGLED_SHELF_ANGLE_DEG вокруг оси X: передний край
    // ниже заднего, типичная компоновка обувной полки.
    // colorId/material/positionY — см. buildWardrobeShelf выше, роль та же.
    buildWardrobeAngledShelf(
        props: TTotalProps,
        shelfProductId: number,
        sectionWidth: number,
        positionY: number,
        colorId?: number,
        material?: 'ldsp' | 'glass',
        profileColorId?: number
    ): Object3D | null {
        const productInfo = this.parent._PRODUCTS[shelfProductId]
        if (!productInfo) return null

        const isGlass = material === 'glass'
        const shelfWidth = sectionWidth - 4                // TODO: не уточнено, та же формула, что у обычной полки, или другая
        const shelfColor = !isGlass && colorId ? this.parent._FASADE[colorId] : null
        const wardrobeProductId = props.CONFIG.ID != null ? Number(props.CONFIG.ID) : undefined
        const shelfThickness = getWardrobeShelfThickness(colorId, material, wardrobeProductId)
        // Та же длина полки, что использует 2D для расчёта проекции — иначе
        // наклон в 3D считался бы от другой глубины, чем нарисован в 2D
        // (см. getWardrobeShelfDepthFromProps выше).
        const shelfDepth = this.getWardrobeShelfDepthFromProps(props)

        const shelfSize = {
            width: shelfWidth,
            height: shelfThickness,
            // Под наклоном доска ДЛИННЕЕ глубины модуля — иначе до переднего
            // края не достаёт (getWardrobeAngledShelfLength, тот же источник
            // у 2D-проекции и у корзины).
            depth: getWardrobeAngledShelfLength({ colorId, material }, shelfDepth, wardrobeProductId),
        }

        const data = this.parent.createModelData(this.parent._MODELS[productInfo.models[0]], props, shelfSize)

        const textureUrl = shelfColor?.TEXTURE ?? this.parent._FASADE[props.CONFIG.MODULE_COLOR]?.TEXTURE
        const body = this.parent.json_builder.createMesh({ data, textureUrl }) as Mesh
        body.name = 'WARDROBE_ANGLED_SHELF'

        // См. комментарий в buildWardrobeShelf выше — body реально Object3D-
        // группа, материал нужно ставить дочерним Mesh'ам через traverse.
        if (isGlass) {
            body.traverse((child) => {
                if (child instanceof Mesh) child.material = createGlassMaterial()
            })
        }

        // Коррекция толщины — см. подробный комментарий в buildWardrobeShelf.
        // Здесь дополнительно: измеряем ДО поворота, иначе Box3 после
        // rotation.x даст смешанную Y/Z-проекцию, а не чистую толщину.
        const rawThickness = new Box3().setFromObject(body).getSize(new Vector3()).y
        if (rawThickness > 0 && Math.abs(rawThickness - shelfThickness) > 0.01) {
            const scaleFactor = shelfThickness / rawThickness
            body.traverse((child) => {
                if (child instanceof Mesh) child.geometry.scale(1, scaleFactor, 1)
            })
        }

        const angle = (WARDROBE_ANGLED_SHELF_ANGLE_DEG * Math.PI) / 180.0;
        body.rotation.x = angle

        // Bounding box ПОСЛЕ поворота (setFromObject сам зовёт
        // updateWorldMatrix): даёт фактические центр и нижнюю точку без
        // предположений о том, где у каталожной модели origin. Раньше это
        // считалось аналитической тригонометрией в расчёте на origin=центр,
        // из-за чего полка смещалась относительно профиля.
        const box = new Box3().setFromObject(body)
        const size = box.getSize(new Vector3())
        const center = box.getCenter(new Vector3())

        // floorY=-height/2 — см. подробный комментарий в buildWardrobeShelf выше.
        const floorY = -props.CONFIG.SIZE.height / 2

        // Доска ставится по ОСИ ПОВОРОТА, а не по нижней точке: низ габарита
        // задаёт разное в зависимости от глубины — у неглубокой полки это низ
        // КРОНШТЕЙНА (доска до него не достаёт), у глубокой сама ДОСКА.
        // Выравнивание по нижней точке верно только во втором случае, на
        // неглубоких доска садилась слишком низко.
        // getWardrobeAngledShelfPivotOffset даёт высоту оси над низом габарита
        // по той же формуле, что 2D — высоту PIXI-элемента.
        const pivotOffset = getWardrobeAngledShelfPivotOffset({ colorId, material }, shelfDepth, wardrobeProductId)
        const pivotY = floorY + positionY + pivotOffset

        body.position.x -= center.x
        body.position.z -= center.z
        body.position.y += pivotY - center.y

        body.userData.trueSizes = { BODY_WIDTH: size.x, BODY_HEIGHT: size.y, BODY_DEPTH: size.z }

        // Кромка — та же схема, что в buildWardrobeShelf. EdgeBuilder
        // копирует в edgeBody и позицию, И поворот (matrix.decompose), так
        // что наклон доски отражается в кромке автоматически.
        const edge = this.edgeBuilder.createEdge(body)
        const defEdge = this.edgeBuilder.createVisibleEdge(body)
        const wrapper = new Object3D()
        wrapper.name = body.name
        wrapper.userData = body.userData
        wrapper.add(body, edge, defEdge)

        // Кронштейны: доска наклонной полки НЕ лежит на верхней точке, а
        // поворачивается вокруг оси ВНУТРИ тела кронштейна, поэтому низ
        // отсчитывается вниз от pivotY, а не от низа габарита. На неглубокой
        // полке они совпадают, на глубокой кронштейн заканчивается ВЫШЕ
        // переднего края доски.
        wrapper.add(this.buildWardrobeShelfBrackets(
            sectionWidth,
            pivotY - WARDROBE_ANGLED_SHELF_PIVOT_HEIGHT + WARDROBE_SHELF_BRACKET_HEIGHT_ANGLED,
            WARDROBE_SHELF_BRACKET_HEIGHT_ANGLED,
            profileColorId,
        ))

        return wrapper
    }

    // ==== Гардеробная система (WARDROBE) ====
    // Штанга (type==='rail') — модель товара из каталога
    // (_PRODUCTS[productId].models[0] -> _MODELS[...], GLB), растянутая на
    // ширину сектора. Сечение модели НЕ масштабируется (уточнение
    // пользователя: диаметра у этих моделей нет, ставим по длине секции) —
    // railHeight задаёт только высоту PIXI-элемента в 2D и запасной цилиндр.
    // У товаров-штанг из FILLING_SECTION модели может не быть (мелкая
    // фурнитура) — тогда цилиндр, как раньше.
    //
    // Модель грузится асинхронно (GLB), поэтому возвращается wrapper: он сразу
    // встаёт на своё место (вызывающий сдвигает его по X), а содержимое
    // появляется по загрузке.
    buildWardrobeRail(
        props: TTotalProps,
        sectionWidth: number,
        positionY: number,
        railHeight?: number,
        productId?: number,
    ): Object3D | null {
        const diameter = Number(railHeight) || 16
        const length = sectionWidth - 4

        const wrapper = new Object3D()
        wrapper.name = 'WARDROBE_RAIL'
        // floorY=-height/2 — см. подробный комментарий в buildWardrobeShelf
        // выше. Начало координат wrapper'а — НИЖНЯЯ грань штанги: реальная
        // высота модели своя, и содержимое выравнивается по низу уже в ней.
        wrapper.position.set(0, -props.CONFIG.SIZE.height / 2 + positionY, 0)
        wrapper.userData.trueSizes = { BODY_WIDTH: length, BODY_HEIGHT: diameter, BODY_DEPTH: diameter }

        const modelId = this.parent._PRODUCTS[productId!]?.models?.[0]
        const modelData = modelId != null ? this.parent._MODELS[modelId] : null

        if (!modelData?.file && !modelData?.DAE) {
            wrapper.add(this.createWardrobeRailCylinder(props, length, diameter))
            return wrapper
        }

        this.parent.models_builder.create({
            props: { CONFIG: { MODELID: modelId, SIZE: { width: length, height: diameter, depth: diameter } } },
            sizeRulers: false,
            onLoad: (model: Object3D) => {
                const size = this.fitWardrobeRailModel(model, length)
                if (!size) {
                    wrapper.add(this.createWardrobeRailCylinder(props, length, diameter))
                    return
                }

                wrapper.add(model)
                // Габарит по факту модели: её сечение не подгонялось.
                wrapper.userData.trueSizes = { BODY_WIDTH: size.x, BODY_HEIGHT: size.y, BODY_DEPTH: size.z }
            },
        })

        return wrapper
    }

    // Запасная геометрия штанги: цилиндр вдоль ширины сектора (X), низ — в
    // начале координат wrapper'а.
    private createWardrobeRailCylinder(props: TTotalProps, length: number, diameter: number): Mesh {
        const matType = props.BODY?.userData?.MATERIAL_TYPE ?? "MeshStandardMaterial";
        const railMaterial = this.materialMap[matType] || this.materialMap.MeshStandardMaterial;

        const geometry = new CylinderGeometry(diameter / 2, diameter / 2, length, 16)
        geometry.rotateZ(Math.PI / 2) // ось цилиндра по умолчанию Y -> вдоль ширины сектора (X)

        const body = new Mesh(geometry, railMaterial)
        body.castShadow = true
        body.receiveShadow = true
        body.position.y = diameter / 2
        body.name = 'WARDROBE_RAIL_BODY'

        return body
    }

    // Подгонка загруженной модели под длину штанги. Ось трубы в GLB не
    // нормирована (у "Трубы" она своя), поэтому берётся самая длинная сторона
    // габарита: её тянем на длину секции и разворачиваем вдоль X. Сечение
    // остаётся как в модели — иначе труба превращалась бы в конус/овал.
    // Затем модель центрируется по X/Z и ставится низом в начало координат
    // wrapper'а (её собственный центр не обязан совпадать с габаритным).
    // Возвращает итоговый габарит; null — модель не загрузилась.
    private fitWardrobeRailModel(model: Object3D, length: number): Vector3 | null {
        if (!model) return null

        model.updateMatrixWorld(true)
        const size = new Box3().setFromObject(model).getSize(new Vector3())

        const axes = ['x', 'y', 'z'] as const
        if (axes.some((axis) => !(size[axis] > 0))) return null

        const longest = axes.reduce((a, b) => (size[a] >= size[b] ? a : b))
        model.scale[longest] *= length / size[longest]

        // Длинная ось -> X. Масштаб применяется до поворота (T*R*S), поэтому
        // тянем в локальных осях модели, а разворачиваем уже готовую.
        if (longest === 'y') model.rotation.z = Math.PI / 2
        if (longest === 'z') model.rotation.y = Math.PI / 2

        model.updateMatrixWorld(true)
        const box = new Box3().setFromObject(model)
        const center = box.getCenter(new Vector3())

        model.position.x -= center.x
        model.position.z -= center.z
        model.position.y -= box.min.y

        return box.getSize(new Vector3())
    }

}