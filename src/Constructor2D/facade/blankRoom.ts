// @ts-nocheck
import { MathUtils } from "three"
import { useSceneState } from "@/store/appliction/useSceneState"
import { useSchemeTransition } from "@/store/canvasMerge/schemeTransition"
import { useRoomState } from "@/store/appliction/useRoomState"
import { useProjectStore } from "@/features/quickActions/project/store/useProjectStore"

const sceneState = useSceneState()
const schemeTransition = useSchemeTransition()
const projectState = useProjectStore()
const roomState = useRoomState()

const WALL_HEIGHT = 3000
const WALL_DEPTH = 300
const FLOOR_Y = 1500
const OFFSET = 2000
const HALF_PI = Math.PI / 2

const jsonBlank = `{
    "projectId": "1762946168561",
    "type": "New",
    "rooms": [
        {
            "id": "b90b3471-0ad6-4026-9c00-d859d625e794",
            "label": "Комната 1",
            "description": "",
            "params": {
                "walls": [
                    {
                        "id": "wall_vertical__773a2c9c-da64-4171-856d-c10f63a521cf",
                        "width": 2619.101690962483,
                        "height": 3000,
                        "depth": 300,
                        "position": {
                            "x": 5253.88671875,
                            "y": 1500,
                            "z": 2713.69140625
                        },
                        "rotation": {
                            "isEuler": true,
                            "_x": 0,
                            "_y": -1.571109530560998,
                            "_z": 0,
                            "_order": "XYZ"
                        },
                        "side": 0
                    },
                    {
                        "id": "wall_vertical__c0ca5bf0-beb2-4503-9bf9-ccff5cc12952",
                        "width": 2620.2984207493882,
                        "height": 3000,
                        "depth": 300,
                        "position": {
                            "x": 1179.66796875,
                            "y": 1500,
                            "z": 2710.5859375
                        },
                        "rotation": {
                            "isEuler": true,
                            "_x": 0,
                            "_y": 1.5777880730857181,
                            "_z": 0,
                            "_order": "XYZ"
                        },
                        "side": 0
                    },
                    {
                        "id": "wall__8241750c-5d09-4837-8d7c-2e1d16769121",
                        "width": 4083.790713254126,
                        "height": 3000,
                        "depth": 300,
                        "position": {
                            "x": 3212.40234375,
                            "y": 1500,
                            "z": 1402.3046875
                        },
                        "rotation": {
                            "isEuler": true,
                            "_x": 0,
                            "_y": -0.0008991341017629902,
                            "_z": 0,
                            "_order": "XYZ"
                        },
                        "side": 0
                    },
                    {
                        "id": "wall__5ad29db5-f48a-49e7-9640-ae79f6d05ae5",
                        "width": 4064.649230537559,
                        "height": 3000,
                        "depth": 300,
                        "position": {
                            "x": 3221.15234375,
                            "y": 1500,
                            "z": 4021.97265625
                        },
                        "rotation": {
                            "isEuler": true,
                            "_x": 0,
                            "_y": 3.140967984025184,
                            "_z": 0,
                            "_order": "XYZ"
                        },
                        "side": 0
                    }
                ],
                "wall": "85074",
                "floor": "44035"
            },
            "content": "[]"
        }
    ],
    "camera": {
        "position": [
            8000,
            1500,
            0
        ],
        "target": {
            "x": 0,
            "y": 1500,
            "z": 0
        },
        "fov": 45,
        "near": 10,
        "far": 25000
    },
    "lights": {
        "ambientLight": {
            "color": "#ffffff",
            "intensity": 1.5
        },
        "pointLight": {
            "color": "#ffffff",
            "normalBias": -0.02,
            "bias": 0.0001,
            "castShadow": false,
            "mapSize": 512,
            "intensity": 1.6,
            "distance": 6000,
            "decay": 0
        }
    },
    "height_clamp": 3000,
    "project_name": "blankroom",
    "table_top_type_auto": true,
    "default_table_model": 69919,
    "default_table_color": null,
    "default_fasade_color": 7397,
    "default_module_color": 199675,
    "default_fasade_top": 7397,
    "default_fasade_bottom": 7397,
    "default_floor": 44013,
    "default_wall": 44128,
    "default_module_color_bottom": null,
    "default_module_color_top": null,
    "default_milling_bottom": null,
    "default_milling_top": null,
    "default_palit_bottom": null,
    "default_palit_top": null,
    "default_handles": 69920,
    "default_overlay_id": [
        63040,
        7014884,
        1944070,
        1944063,
        3922338
    ],
    "default_plinth_body": 70096,
    "default_plinth_color": null
}`
const projectData = JSON.parse(jsonBlank)

/**
 * Строит данные проекта с одной комнатой-прямоугольником по 4 ширинам стен.
 * Порядок: правая, левая, нижняя (передняя), верхняя (задняя).
 * Позиции и повороты считаются так, чтобы стены смыкались в замкнутый контур.
 */
export const buildProjectFromWallWidths = (
  right: number,
  left: number,
  bottom: number,
  top: number
) => {
  const D = (right + left) / 2 // глубина (длина левой/правой стен)
  const W = (bottom + top) / 2 // ширина (длина нижней/верхней стен)

  const walls = [
    {
      id: `wall_vertical__${MathUtils.generateUUID()}`,
      width: D,
      height: WALL_HEIGHT,
      depth: WALL_DEPTH,
      position: { x: OFFSET + W, y: FLOOR_Y, z: OFFSET + D / 2 },
      rotation: { isEuler: true, _x: 0, _y: -HALF_PI, _z: 0, _order: "XYZ" },
      side: 0,
    },
    {
      id: `wall_vertical__${MathUtils.generateUUID()}`,
      width: D,
      height: WALL_HEIGHT,
      depth: WALL_DEPTH,
      position: { x: OFFSET, y: FLOOR_Y, z: OFFSET + D / 2 },
      rotation: { isEuler: true, _x: 0, _y: HALF_PI, _z: 0, _order: "XYZ" },
      side: 0,
    },
    {
      id: `wall__${MathUtils.generateUUID()}`,
      width: W,
      height: WALL_HEIGHT,
      depth: WALL_DEPTH,
      position: { x: OFFSET + W / 2, y: FLOOR_Y, z: OFFSET },
      rotation: { isEuler: true, _x: 0, _y: 0, _z: 0, _order: "XYZ" },
      side: 0,
    },
    {
      id: `wall__${MathUtils.generateUUID()}`,
      width: W,
      height: WALL_HEIGHT,
      depth: WALL_DEPTH,
      position: { x: OFFSET + W / 2, y: FLOOR_Y, z: OFFSET + D },
      rotation: { isEuler: true, _x: 0, _y: Math.PI, _z: 0, _order: "XYZ" },
      side: 0,
    },
  ]

  const room = {
    ...JSON.parse(JSON.stringify(projectData.rooms[0])),
    id: MathUtils.generateUUID(),
    params: {
      ...projectData.rooms[0].params,
      walls,
    },
  }

  return {
    ...JSON.parse(JSON.stringify(projectData)),
    projectId: String(Date.now()),
    rooms: [room],
  }
}

// Возвращает глубокую копию первой комнаты из blankroom
export const getBlankRoomTemplate = () => {
  return JSON.parse(JSON.stringify(projectData.rooms[0]))
}

const ensureLayersReady = async () => {
  while (!window.C2D?.layers?.planner || !window.C2D?.layers?.doorsAndWindows) {
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
}

/**
 * Загружает бланковую комнату на канвас.
 * @param customProject — если передан, используется он (например из buildProjectFromWallWidths); иначе — дефолтный projectData.
 */
export const loadBlankRoom = async (customProject?: typeof projectData) => {
  await ensureLayersReady()
  const data = customProject ?? projectData
  projectState.setInitialState(data)

  try {
    await sceneState.loadProjectFromData(data)
    sceneState.updateProjectParams({})
    schemeTransition.setAppData(data.rooms)

    roomState.routConvertData('/3d')

    projectState.setProjectId(undefined)

    window.C2D.layers.planner.init(true)
    window.C2D.layers.doorsAndWindows.init(true)
    console.log('BLANKROOM LOADED')
  } catch (error) {
    console.error('Ошибка предварительной инициализации комнаты', error)
  }
}