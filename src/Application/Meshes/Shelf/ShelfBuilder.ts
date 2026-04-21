import { TTotalProps, TBuildProduct, TEdgeBuilder } from "@/types/types";
import { IShelfData } from "@/types/interfases";
import {
    Material,
    Vector3,
    MeshBasicMaterial,
    MeshStandardMaterial,
    MeshPhongMaterial,
    MeshPhysicalMaterial,
    MeshLambertMaterial,
    BoxGeometry,
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
        const correctDepth = depth! > BODY_DEPTH ? BODY_DEPTH : depth


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
            let accumulatedWidth = initWidth;

            shelfs[axis].forEach((shelfExpression, index) => {
                if (correction && index > 0) {
                    accumulatedWidth += correction;
                }

                const geometry = new BoxGeometry(accumulatedWidth - 32, 16, correctDepth);
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
                parent.add(mesh, edge);
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

        console.log(mechanizmTemp, 'mechanizmTemp')

        const matType = props.BODY.userData.MATERIAL_TYPE ?? "MeshStandardMaterial";
        const shelfMaterial = material || this.materialMap[matType] || this.materialMap.MeshStandardMaterial;

        const startPos = this.parent.getStartPosition(SIZE);


        for (let i = 1; current >= i && current <= total; i++) {
            const position = startPos.y + (height / (current + 1)) * i;
            const mechanizm = position > mechanizmTemp && MECHANISM
            const correctDepth = mechanizm ? depth! - 50 : depth

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
            parent.add(mesh, edge);
        }

        return parent;
    }


}