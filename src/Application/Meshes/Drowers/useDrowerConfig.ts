const useDrowerConfig = () => {
    const widthCorection = 50;
    const bottomIndentation = "28";
    let fasadeThickness = 18
    const material = {
        type: "MeshStandardMaterial",
        opt: { color: 0x3d3a3b, transparent: true, opacity: 0.5 },
    }

    const buildIn = {
        material,
        items: [
            {
                id: "bottom",
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: { x: "#DRAWWIDTH#-32", y: 16, z: "#DRAWDEPTH#" },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: {
                    x: 0,
                    y: "(-#DRAWHEIGHT#/2)+32+" + bottomIndentation,
                    z: "-16",
                },
            },
            {
                id: "leftbox",
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: {
                        x: 16,
                        y: "#DRAWHEIGHT#-8-" + widthCorection,
                        z: "#DRAWDEPTH#",
                    },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: {
                    x: "(-#DRAWWIDTH#/2)+8",
                    y: bottomIndentation,
                    z: `-${fasadeThickness}`,
                },
            },
            {
                id: "rightbox",
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: {
                        x: 16,
                        y: "#DRAWHEIGHT#-8-" + widthCorection,
                        z: "#DRAWDEPTH#",
                    },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: {
                    x: "(#DRAWWIDTH#/2)-8",
                    y: bottomIndentation,
                    z: `-${fasadeThickness}`,
                },
            },
            {
                id: "back",
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: {
                        x: "#DRAWWIDTH#-32",
                        y: "#DRAWHEIGHT#-4-" + widthCorection,
                        z: 8,
                    },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: { x: 0, y: bottomIndentation, z: "(-#DRAWDEPTH#/2)-4" },
            },
        ]
    }

    const standartDrawer = {
        material,
        items: [
            {
                id: "bottom",
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: { x: "#DRAWWIDTH#-32", y: 16, z: "#DRAWDEPTH#" },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: { x: 0, y: "(-#DRAWHEIGHT#/2)+8", z: 0 },
            },
            {
                id: "leftbox",
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: { x: 16, y: "#DRAWHEIGHT#", z: "#DRAWDEPTH#" },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: { x: "(-#DRAWWIDTH#/2)+8", y: 0, z: 0 },
            },
            {
                id: "rightbox",
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: { x: 16, y: "#DRAWHEIGHT#", z: "#DRAWDEPTH#" },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: { x: "(#DRAWWIDTH#/2)-8", y: 0, z: 0 },
            },
            {
                id: "back",
                type: "object",
                geometry: {
                    type: "BoxGeometry",
                    opt: { x: "#DRAWWIDTH#-32", y: "#DRAWHEIGHT#-16", z: 8 },
                },
                rotation: { x: 0, y: 0, z: 0 },
                position: { x: 0, y: "8", z: "(-#DRAWDEPTH#/2)+8" },
            },
        ]

    }

    const checkFasadeThickness = (value: number) => {
        fasadeThickness = value
    }

    return { buildIn, standartDrawer, widthCorection, checkFasadeThickness }

}

export { useDrowerConfig }