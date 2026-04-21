// import * as THREEInterfases from "../types/interfases"

const START_PROJECT_PARAMS = {
    projectId: null,
    type: 'New',
    rooms: [Object.freeze({
        id: 1000001,
        label: 'Комната 1',
        description: "",
        params: {
            walls: [
                {
                    "width": 6990.257505978436,
                    "height": 3000,
                    "position": {
                        "x": -1992.213638056436,
                        "y": 1500,
                        "z": 6.677933000282188
                    },
                    "rotation": {
                        "isEuler": true,
                        "_x": 0,
                        "_y": 1.5707963267948966,
                        "_z": 0,
                        "_order": "XYZ"
                    },
                    "side": 0
                },
                {
                    "width": 3976.6504012986466,
                    "height": 3000,
                    "position": {
                        "x": -3.8884374071124217,
                        "y": 1500,
                        "z": -3488.4508199889357
                    },
                    "rotation": {
                        "isEuler": true,
                        "_x": 0,
                        "_y": 0,
                        "_z": 0,
                        "_order": "XYZ"
                    },
                    "side": 0
                },
                {
                    "width": 6986.963634188191,
                    "height": 3000,
                    "position": {
                        "x": 1984.436763242211,
                        "y": 1500,
                        "z": 5.030997105159862
                    },
                    "rotation": {
                        "isEuler": true,
                        "_x": 0,
                        "_y": -1.5707963267948966,
                        "_z": 0,
                        "_order": "XYZ"
                    },
                    "side": 0
                },
                {
                    "width": 3976.651765460494,
                    "height": 3000,
                    "position": {
                        "x": -3.8884374071124217,
                        "y": 1500,
                        "z": 3500.1597500943777
                    },
                    "rotation": {
                        "isEuler": true,
                        "_x": 0,
                        "_y": -3.140764350695509,
                        "_z": 0,
                        "_order": "XYZ"
                    },
                    "side": 0
                }
            ],
            floor: 44035,
            wall: 85074,
        },
        content: [],
    }),
    ],

    camera: {
        position: [8 * 1000, 1.5 * 1000, 0],
        target: { x: 0, y: 1500, z: 0 },
        // fov: 45,
        // near: 10,
        // far: 25000
        fov: 45,
        near: 100,
        far: 25000
    },

    lights: {

        ambientLight: {
            color: '#ffffff',
            intensity: 1.5,
        },

        pointLight: {
            color: '#ffffff',
            normalBias: -0.02,
            bias: 0.0001,
            castShadow: false,
            mapSize: 512,
            intensity: 1.6,
            distance: 5000,
            decay: 0
        }
    },

    height_clamp: 3000,

    project_name: 'New Pod',
    table_top_type_auto: true,
    default_table_model: 69919,
    default_table_color: null,
    default_fasade_color: 7397,
    default_module_color: 199675,
    // default_module_color: 7397,
    default_fasade_top: 7397,
    default_fasade_bottom: 7397,
    default_floor: 44013,
    default_wall: 44128,
    default_module_color_bottom: null,
    default_module_color_top: null,
    default_milling_bottom: null,
    default_milling_top: null,
    default_palit_bottom: null,
    default_palit_top: null,
    default_handles: 69920,
    default_overlay_id: [63040, 7014884, 1944070, 1944063, 3922338, 6051066],
    default_plinth_body: 70096,
    default_plinth_color: null,
    default_showcase: 1013628,
    default_milling: 2462671,
    default_patina: 475428,
    mirror_type: 10336730
    // 2462671 - фрезф
}

// Object.freeze(START_PROJECT_PARAMS)

export { START_PROJECT_PARAMS }

//69919 - defTabelTopProd / 53981 - defTabelTopModel