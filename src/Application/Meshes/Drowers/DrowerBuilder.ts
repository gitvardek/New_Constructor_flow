//@ts-nocheck
import * as THREE from 'three'
import { TBuildProduct, TExpressions, TFasadeProp, TTotalProps, TSize, TFasadePositionItem, TConfig, TEdgeBuilder } from '@/types/types'

import { useModelState } from "@/store/appliction/useModelState";
import { useDrowerConfig } from './useDrowerConfig.ts';


class DrowerBuilder {
    parent: TBuildProduct;
    drwerConfig: ReturnType<typeof useDrowerConfig> = useDrowerConfig();
    edgeBuilder: TEdgeBuilder;

    constructor(parent: TBuildProduct) {
        this.parent = parent;
        this.edgeBuilder = parent.edge_builder;
    }

    public createDrowers({ props }: { props: TTotalProps }) {
        const group = new THREE.Object3D
        const { FASADE_PROPS, FASADE_POSITIONS, EXPRESSIONS, SIZE } = props.CONFIG as TConfig
        FASADE_PROPS.forEach((config: TFasadeProp, key: number) => {
            if (!config.DRAWER.drawer) return
            const model = this.buildDrower(config, EXPRESSIONS, SIZE, FASADE_POSITIONS[key]);
            group.add(model)
        }
        )
        return group
    }

    private buildDrower(config: TFasadeProp, expressions: TExpressions, size: TSize, fasadePosition: TFasadePositionItem) {
        const { width, depth } = size
        const { buildIn, standartDrawer, widthCorection } = this.drwerConfig;
        const { x, y, z } = this.parent.getStartPosition(size);

        const values = [...config.DRAWER.drawer!.matchAll(/[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/g)]
            .map(m => Number(m[0]));

        // const drawer = config.DRAWER.drawer!.split(" ");
        const drawer = values[0];
        const json = config.DRAWER.buildIn === 1 ? buildIn : standartDrawer
        const curExpression = { ...expressions }

        // curExpression["#DRAWHEIGHT#"] = drawer[1];
        curExpression["#DRAWHEIGHT#"] = drawer;
        curExpression["#DRAWWIDTH#"] = fasadePosition.FASADE_WIDTH - curExpression["#MATERIAL_THICKNESS#"] * 2
        curExpression["#DRAWDEPTH#"] = depth - widthCorection
        curExpression["#X#"] = width

        const prepareData = this.parent.expressionsReplace(json, curExpression)
        const model = this.parent.json_builder.createMesh({ data: prepareData })
        // model.position.x = (fasadePosition.POSITION_X) + curExpression["#DRAWWIDTH#"] * 0.5 + curExpression["#MATERIAL_THICKNESS#"];
        // model.position.y = y + fasadePosition.POSITION_Y! + this.parent.calculateFromString(drawer[1]) * 0.5 + 10;
        const edge = this.edgeBuilder.createEdge(model);
        const deffEdge = this.edgeBuilder.createVisibleEdge(model);
        model.add(edge, deffEdge)

        model.position.y = y + fasadePosition.POSITION_Y! + this.parent.calculateFromString(drawer) * 0.5 + 10;
        model.position.z = z + fasadePosition.POSITION_Z! - (depth - 48) * 0.5
        model.name = "DROWER"


        return model

    }


}

export { DrowerBuilder }