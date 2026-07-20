export const HandlePositions = {
    full: {
        2: {
            geometry: {
                width: 2,
                height: "#HEIGHT#",
                depth: 16,
            },
            rotation: {
                x: 0,
                y: Math.PI * -0.35,
                z: 0
            },
            position: {
                x: "#WIDTH# * 0.5 - 7.2 ",
                y: 0,
                z: 18.75
            }
        },
        1: {
            geometry: {
                width: "#WIDTH#",
                height: 2,
                depth: 16,
            },
            rotation: {
                x: Math.PI * 0.35,
                y: 0,
                z: 0
            },
            position: {
                x: 0,
                y: "#HEIGHT# * 0.5 - 16 * 0.5",
                z: 16 + 16 * 0.15
            }
        },
        0: {
            geometry: {
                width: 2,
                height: "#HEIGHT#",
                depth: 16,
            },
            rotation: {
                x: 0,
                y: Math.PI * 0.35,
                z: 0
            },
            position: {
                x: "#WIDTH# * -0.5 + 7.2 ",
                y: 0,
                z: 18.75
            }
        },
        5: {
            geometry: {
                width: 2,
                height: "#HEIGHT#",
                depth: 16,
            },
            rotation: {
                x: 0,
                y: Math.PI * -0.35,
                z: 0
            },
            position: {
                x: "#WIDTH# * 0.5 - 7.2 ",
                y: 0,
                z: 18.75
            }
        },
        3: {
            geometry: {
                width: 2,
                height: "#HEIGHT#",
                depth: 16,
            },
            rotation: {
                x: 0,
                y: Math.PI * 0.35,
                z: 0
            },
            position: {
                x: "#WIDTH# * -0.5 + 7.2 ",
                y: 0,
                z: 18.75
            }
        },
        8: {
            geometry: {
                width: 2,
                height: "#HEIGHT#",
                depth: 16,
            },
            rotation: {
                x: 0,
                y: Math.PI * -0.35,
                z: 0
            },
            position: {
                x: "#WIDTH# * 0.5 - 7.2 ",
                y: 0,
                z: 18.75
            }
        },
        7: {
            geometry: {
                width: "#WIDTH#",
                height: 2,
                depth: 16,
            },
            rotation: {
                x: Math.PI * -0.35,
                y: 0,
                z: 0
            },
            position: {
                x: 0,
                y: "#HEIGHT# * -0.5 + 16 * 0.5",
                z: 16 + 16 * 0.15
            }
        },
        6: {
            geometry: {
                width: 2,
                height: "#HEIGHT#",
                depth: 16,
            },
            rotation: {
                x: 0,
                y: Math.PI * 0.35,
                z: 0
            },
            position: {
                x: "#WIDTH# * -0.5 + 7.2 ",
                y: 0,
                z: 18.75
            }
        },
    },
    path: {
        2: {
            geometry: {
                svg: '<svg><path d="M -1.5 0 L 1.5 0 L 1.5 -12 L -10 -12 L -10 -10 L -1.523 -7 Z"/></svg>',
                width: 250,
                height: 0,
                depth: 0,
            },
            rotation: {
                x: Math.PI * -0.5,
                y: 0,
                z: 0
            },
            position: {
                x: '#WIDTH# * 0.5 - 1.5',
                y: '#HEIGHT# * 0.5 - 300',
                z: 16
            }
        },
        1: {
            geometry: {
                svg: '<svg><path d="M 1.5 0 L -1.5 0 L -1.5 -12 L 10 -12 L 10 -10 L 1.523 -7 Z"/></svg>',
                width: 250,
                height: 0,
                depth: 0,
            },
            rotation: {
                x: Math.PI * -0.5,
                y: Math.PI * 0.5,
                z: 0
            },
            position: {
                x: '250 * -0.5',
                y: '#HEIGHT# * 0.5 - 1.5',
                z: 16
            }
        },
        0: {
            geometry: {
                svg: '<svg><path d="M 1.5 0 L -1.5 0 L -1.5 -12 L 10 -12 L 10 -10 L 1.523 -7 Z"/></svg>',
                width: 250,
                height: 0,
                depth: 0,
            },
            rotation: {
                x: Math.PI * -0.5,
                y: 0,
                z: 0
            },
            position: {
                x: '#WIDTH# * -0.5 + 1.5',
                y: '#HEIGHT# * 0.5 - 300',
                z: 16
            }
        },
        5: {
            geometry: {
                svg: '<svg><path d="M -1.5 0 L 1.5 0 L 1.5 -12 L -10 -12 L -10 -10 L -1.523 -7 Z"/></svg>',
                width: 250,
                height: 0,
                depth: 0,
            },
            rotation: {
                x: Math.PI * -0.5,
                y: 0,
                z: 0
            },
            position: {
                x: '#WIDTH# * 0.5 - 1.5',
                y: '250 * -0.5 ',
                z: 16
            }
        },
        3: {
            geometry: {
                svg: '<svg><path d="M 1.5 0 L -1.5 0 L -1.5 -12 L 10 -12 L 10 -10 L 1.523 -7 Z"/></svg>',
                width: 250,
                height: 0,
                depth: 0,
            },
            rotation: {
                x: Math.PI * -0.5,
                y: 0,
                z: 0
            },
            position: {
                x: '#WIDTH# * -0.5 + 1.5',
                y: '250 * -0.5',
                z: 16
            }
        },
        8: {
            geometry: {
                svg: '<svg><path d="M -1.5 0 L 1.5 0 L 1.5 -12 L -10 -12 L -10 -10 L -1.523 -7 Z"/></svg>',
                width: 250,
                height: 0,
                depth: 0,
            },
            rotation: {
                x: Math.PI * -0.5,
                y: 0,
                z: 0
            },
            position: {
                x: '#WIDTH# * 0.5 - 1.5',
                y: '#HEIGHT# * -0.5 + 50',
                z: 16
            }
        },
        7: {
            geometry: {
                svg: '<svg><path d="M -1.5 0 L 1.5 0 L 1.5 -12 L -10 -12 L -10 -10 L -1.523 -7 Z"/></svg>',
                width: 250,
                height: 0,
                depth: 0,
            },
            rotation: {
                x: Math.PI * -0.5,
                y: Math.PI * 0.5,
                z: 0
            },
            position: {
                x: '250 * -0.5',
                y: '#HEIGHT# * -0.5 + 1.5',
                z: 16
            }
        },
        6: {
            geometry: {
                svg: '<svg><path d="M 1.5 0 L -1.5 0 L -1.5 -12 L 10 -12 L 10 -10 L 1.523 -7 Z"/></svg>',
                width: 250,
                height: 0,
                depth: 0,
            },
            rotation: {
                x: Math.PI * -0.5,
                y: 0,
                z: 0
            },
            position: {
                x: '#WIDTH# * -0.5 + 1.5',
                y: '#HEIGHT# * -0.5 + 50',
                z: 16
            }
        },


    }
}