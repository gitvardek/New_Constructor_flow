const TUG_MODEL_120 = {
    "material": { "type": "MeshLambertMaterial", "opt": { "color": 16777215 } },
    "items": [{
        "id": "leftbox",
        "type": "object",
        "geometry": { "type": "BoxGeometry", "opt": { "x": 16, "y": 720, "z": 560 } },
        "rotation": { "x": 0, "y": 0, "z": 0 },
        "position": { "x": "- #X# / 2 + 8", "y": 0, "z": 0 }
    }, {
        "id": "forwardbox",
        "type": "object",
        "geometry": { "type": "BoxGeometry", "opt": { "x": "#X# - (#FASADESIZEWIDTH1#+#FASADESIZEWIDTH2#+4)", "y": 717, "z": 16 } },
        "rotation": { "x": 0, "y": 0, "z": 0 },
        "position": { "x": "-(#X#/2) + #FASADESIZEWIDTH1#+#FASADESIZEWIDTH2#+4 + (#X# - #FASADESIZEWIDTH1# - #FASADESIZEWIDTH2# - 4)/2 ", "y": 0, "z": 289 }
    }, {
        "id": "horizontallineback",
        "type": "object",
        "geometry": { "type": "BoxGeometry", "opt": { "x": "#X#-32", "y": 78, "z": 16 } },
        "rotation": { "x": 0, "y": 0, "z": 0 },
        "position": { "x": 0, "y": "(#Y#/2)-39", "z": "(-#Z#/2) + 28 + (#FASADESIZEDIFFDEPTH2# - 40)/2" }
    }, {
        "id": "horizontallinefront",
        "type": "link",
        "link": "horizontallineback",
        "rotation": { "x": 0, "y": 0, "z": 0 },
        "position": { "x": 0, "y": "(#Y#/2)-39", "z": "(#Z#/2) - 28 - (#FASADESIZEDIFFDEPTH2# - 40)/2" }
    }, {
        "id": "bottom",
        "type": "object",
        "geometry": { "type": "BoxGeometry", "opt": { "x": "#X# - 32", "y": 16, "z": 558 } },
        "rotation": { "x": 0, "y": 0, "z": 0 },
        "position": { "x": 0, "y": -352, "z": 0 }
    }, {
        "id": "rightbox",
        "type": "link",
        "link": "leftbox",
        "rotation": { "x": 0, "y": 0, "z": 0 },
        "position": { "x": "#X# / 2 - 8", "y": 0, "z": 0 }
    }],
    "position": { "x": 0, "y": 0, "z": 0 },

    "sixLegs": true,

    "tables": {
        "1": { "width": "#X#", "depth": "#Z# - (#FASADESIZEDIFFDEPTH2# - 40)", "position": { "x": 0, "y": 0, "z": 0 } }
    },
    "propplinth": true

}