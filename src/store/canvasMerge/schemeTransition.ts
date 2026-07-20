// import { MathUtils } from "three";
//@ts-nocheck
import { defineStore } from 'pinia';
import {
	computed,
	ref,
	//reactive 
} from 'vue';
// import { APP } from '@/Application/F-sources';

// import {
// 	getCenterOfPoints
// } from "@/Constructor2D/utils/Math/index";

export const useSchemeTransition = defineStore('SchemeTransition', () => {

	const roomHeight = ref<number>(3000)

	const normalizeId = (value: string | number | null | undefined) => value !== null && value !== undefined ? String(value) : '';
	const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
	const normalizeRoom = (room: any) => {
		const clone = deepClone(room || {});
		clone.id = normalizeId(clone.id);
		clone.content = typeof clone.content === 'string' ? JSON.parse(clone.content) : (clone.content || []);
		if (!clone.params) clone.params = {};
		if (!Array.isArray(clone.params.walls)) clone.params.walls = [];
		clone.params.walls = clone.params.walls.map((wall: any) => ({
			...wall,
			id: normalizeId(wall?.id)
		}));
		return clone;
	};

	const SchemeTransitionData = ref<{ [key: string]: any }[]>([

		// {
		// 	id: "room_001", //MathUtils.generateUUID(), /** ID комнаты */
		// 	label: "Новая комната", /** Лейбл */
		// 	description: "Новая комната", /** Описание */
		// 	size: {
		// 		/** Данные для форпмирования стен комнат */
		// 		// walls: [
		// 		//     {
		// 		//         "width": 6990.257505978436,
		// 		//         "height": 3000,
		// 		//         "position": {
		// 		//             "x": -1992.213638056436,
		// 		//             "y": 1500,
		// 		//             "z": 6.677933000282188
		// 		//         },
		// 		//         "rotation": {
		// 		//             "isEuler": true,
		// 		//             "_x": 0,
		// 		//             "_y": 1.5707963267948966,
		// 		//             "_z": 0,
		// 		//             "_order": "XYZ"
		// 		//         },
		// 		//         "side": 0
		// 		//     },
		// 		//     {
		// 		//         "width": 3976.6504012986466,
		// 		//         "height": 3000,
		// 		//         "position": {
		// 		//             "x": -3.8884374071124217,
		// 		//             "y": 1500,
		// 		//             "z": -3488.4508199889357
		// 		//         },
		// 		//         "rotation": {
		// 		//             "isEuler": true,
		// 		//             "_x": 0,
		// 		//             "_y": 0,
		// 		//             "_z": 0,
		// 		//             "_order": "XYZ"
		// 		//         },
		// 		//         "side": 0
		// 		//     },
		// 		//     {
		// 		//         "width": 6986.963634188191,
		// 		//         "height": 3000,
		// 		//         "position": {
		// 		//             "x": 1984.436763242211,
		// 		//             "y": 1500,
		// 		//             "z": 5.030997105159862
		// 		//         },
		// 		//         "rotation": {
		// 		//             "isEuler": true,
		// 		//             "_x": 0,
		// 		//             "_y": -1.5707963267948966,
		// 		//             "_z": 0,
		// 		//             "_order": "XYZ"
		// 		//         },
		// 		//         "side": 0
		// 		//     },
		// 		//     {
		// 		//         "width": 3976.651765460494,
		// 		//         "height": 3000,
		// 		//         "position": {
		// 		//             "x": -3.8884374071124217,
		// 		//             "y": 1500,
		// 		//             "z": 3500.1597500943777
		// 		//         },
		// 		//         "rotation": {
		// 		//             "isEuler": true,
		// 		//             "_x": 0,
		// 		//             "_y": -3.140764350695509,
		// 		//             "_z": 0,
		// 		//             "_order": "XYZ"
		// 		//         },
		// 		//         "side": 0
		// 		//     }
		// 		// ],
		// 		/*
		// 		walls: [
		// 			{
		// 					"id": "wall_vertical__d9fad3eb-b7cc-4094-b0fb-00a72511b6a1",
		// 					"width": 3234.1804574739404,
		// 					"height": 3000,
		// 					"position": {
		// 							"x": 1306.03515625,
		// 							"y": 1500,
		// 							"z": 4839.21875
		// 					},
		// 					"rotation": {
		// 							"isEuler": true,
		// 							"_x": 0,
		// 							"_y": 1.5249441714330672,
		// 							"_z": 0,
		// 							"_order": "XYZ"
		// 					},
		// 					"side": 0
		// 			},
		// 			{
		// 					"id": "wall__a6e58d91-79d2-42d2-8b27-7fa5a7248f23",
		// 					"width": 1506.104633582064,
		// 					"height": 3000,
		// 					"position": {
		// 							"x": 2133.18359375,
		// 							"y": 1500,
		// 							"z": 3229.9609375
		// 					},
		// 					"rotation": {
		// 							"isEuler": true,
		// 							"_x": 0,
		// 							"_y": -0.008144029514458645,
		// 							"_z": 0,
		// 							"_order": "XYZ"
		// 					},
		// 					"side": 0
		// 			},
		// 			{
		// 					"id": "wall_vertical__782ddff3-8033-48bc-a7ba-a73cfb69617e",
		// 					"width": 1830.724074319094,
		// 					"height": 3000,
		// 					"position": {
		// 							"x": 3175.5859375,
		// 							"y": 1500,
		// 							"z": 2367.67578125
		// 					},
		// 					"rotation": {
		// 							"isEuler": true,
		// 							"_x": 0,
		// 							"_y": 1.2491469835581261,
		// 							"_z": 0,
		// 							"_order": "XYZ"
		// 					},
		// 					"side": 0
		// 			},
		// 			{
		// 					"id": "wall__be7c8066-63a4-453a-a15c-ce6df02bcfaf",
		// 					"width": 1966.1290407412712,
		// 					"height": 3000,
		// 					"position": {
		// 							"x": 4427.0703125,
		// 							"y": 1500,
		// 							"z": 1701.15234375
		// 					},
		// 					"rotation": {
		// 							"isEuler": true,
		// 							"_x": 0,
		// 							"_y": -0.20684442276034878,
		// 							"_z": 0,
		// 							"_order": "XYZ"
		// 					},
		// 					"side": 0
		// 			},
		// 			{
		// 					"id": "wall_vertical__420f7d63-2b3e-4bda-808d-e7795d843b8c",
		// 					"width": 3872.5689342414116,
		// 					"height": 3000,
		// 					"position": {
		// 							"x": 5874.58984375,
		// 							"y": 1500,
		// 							"z": 3777.5
		// 					},
		// 					"rotation": {
		// 							"isEuler": true,
		// 							"_x": 0,
		// 							"_y": -1.317401774915874,
		// 							"_z": 0,
		// 							"_order": "XYZ"
		// 					},
		// 					"side": 0
		// 			},
		// 			{
		// 					"id": "wall__0f011272-6bb8-4dc8-b438-ccc00ee3cd8f",
		// 					"width": 5190.522366587906,
		// 					"height": 3000,
		// 					"position": {
		// 							"x": 3795.95703125,
		// 							"y": 1500,
		// 							"z": 6053.28125
		// 					},
		// 					"rotation": {
		// 							"isEuler": true,
		// 							"_x": 0,
		// 							"_y": -2.9863307889906676,
		// 							"_z": 0,
		// 							"_order": "XYZ"
		// 					},
		// 					"side": 0
		// 			}
		// 		],
		// 		*/
		// 		walls: [],
		// 		wall: '44144',
		// 		floor: '44020'
		// 	},
		// 	content: [
		// 	],
		// content: { /** Наполняемый контетн из 2D редактора (объёмные стены / переферия) */
		// 	'2d': [

		// 	],
		// 	'3d': [

		// 	]
		// },
		// },

		/*
		{
			"id": "0aeedb70-c409-49e0-9bf6-64de303e9026",
			"label": "Комната 1",
			"description": "",
			"params": {
				"walls": [
					{
						"id": "wall__b105fc22-2b4f-45c2-8f77-c9076eb3a172",
						"width": 6351.82373046875,
						"height": 3000,
						"depth": 300,
						"position": {
							"x": 4525.911865234375,
							"y": 1500,
							"z": 1550
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
						"id": "wall_vertical__a7c3f22c-2421-4198-8c98-76d2c0d14daa",
						"width": 5544.9481201171875,
						"height": 3000,
						"depth": 300,
						"position": {
							"x": 7701.82373046875,
							"y": 1500,
							"z": 4322.474060058594
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
						"id": "wall_vertical__ae2c7a2f-6411-4037-91f0-8030b06757df",
						"width": 7162.215533972321,
						"height": 3000,
						"depth": 300,
						"position": {
							"x": 4528.724365234375,
							"y": 1500,
							"z": 8755.000305175781
						},
						"rotation": {
							"isEuler": true,
							"_x": 0,
							"_y": -2.659585828831095,
							"_z": 0,
							"_order": "XYZ"
						},
						"side": 0
					}
				],
				"wall": "44144",
				"floor": "44020"
			},
			"content": [
				{
					"id": 3689611,
					"position": {
						"x": 3120,
						"y": 0,
						"z": 1550
					},
					"rotation": {
						"isEuler": true,
						"_x": 0,
						"_y": 0,
						"_z": 0,
						"_order": "XYZ"
					},
					"size": {
						"width": 960,
						"height": 0,
						"depth": 300
					}
				},
				{
					"id": 3689611,
					"position": {
						"x": 7701.82373046875,
						"y": 0,
						"z": 5670
					},
					"rotation": {
						"isEuler": true,
						"_x": 0,
						"_y": -1.5707963267948966,
						"_z": 0,
						"_order": "XYZ"
					},
					"size": {
						"width": 960,
						"height": 0,
						"depth": 300
					}
				},
				{
					"id": 3689611,
					"position": {
						"x": 5923.034943145369,
						"y": 0,
						"z": 8025.546841829702
					},
					"rotation": {
						"isEuler": true,
						"_x": 0,
						"_y": -2.659585828831095,
						"_z": 0,
						"_order": "XYZ"
					},
					"size": {
						"width": 960,
						"height": 0,
						"depth": 300
					}
				},
				{
					"id": 3689569,
					"position": {
						"x": 3525.5407125387524,
						"y": 1500,
						"z": 9279.830139664567
					},
					"rotation": {
						"isEuler": true,
						"_x": 0,
						"_y": -2.659585828831095,
						"_z": 0,
						"_order": "XYZ"
					},
					"size": {
						"width": 1200,
						"height": 0,
						"depth": 300
					}
				},
				{
					"id": 3689569,
					"position": {
						"x": 7701.82373046875,
						"y": 1500,
						"z": 3560
					},
					"rotation": {
						"isEuler": true,
						"_x": 0,
						"_y": -1.5707963267948966,
						"_z": 0,
						"_order": "XYZ"
					},
					"size": {
						"width": 1200,
						"height": 0,
						"depth": 300
					}
				},
				{
					"id": 3689569,
					"position": {
						"x": 5590,
						"y": 1500,
						"z": 1550
					},
					"rotation": {
						"isEuler": true,
						"_x": 0,
						"_y": 0,
						"_z": 0,
						"_order": "XYZ"
					},
					"size": {
						"width": 1200,
						"height": 0,
						"depth": 300
					}
				}
			]
		}
		*/

	]);

	/**
	 * Получает все данные из хранилища
	 * @returns {Array} Копия массива с данными комнат
	 */
	const getAllData = () => {
		// return JSON.parse(JSON.stringify(SchemeTransitionData.value));
		return SchemeTransitionData.value
	};

	const clearStore = () => {
		SchemeTransitionData.value = [];
	};

	const setAppData = (value: any) => {
		const normalized = (value || []).map(normalizeRoom);
		SchemeTransitionData.value = normalized;
	};

	// добавление / обновление стены
	// const setWall = (data: any) => {
	// 	/*
	// 	data.idRoom = string | number;
	// 	data.wall = {}
	// 	*/
	// 	const room = SchemeTransitionData.value.find((item: any) => item.id === data.idRoom);

	// 	if (!room) return;

	// 	if (data.wall.name === 'dividing_wall') {

	// 		const indexWall = room.content.findIndex((item: any) => item.uuid === data.wall.id);

	// 		const centerWall = getCenterOfPoints([data.wall.points[0], data.wall.points[1]]);

	// 		const wData = {
	// 			id: 166755,
	// 			uuid: data.wall.id,
	// 			position: {
	// 				x: centerWall.x * 10,
	// 				y: (300 * 10) / 2,
	// 				z: centerWall.y * 10
	// 			},
	// 			rotation: {
	// 				isEuler: true,
	// 				_x: MathUtils.degToRad(0),
	// 				_y: MathUtils.degToRad(-data.wall.angleDegrees),
	// 				_z: MathUtils.degToRad(0),
	// 				_order: "XYZ"
	// 			},
	// 			size: {
	// 				width: data.wall.width * 10,
	// 				height: 300 * 10,
	// 				depth: data.wall.height * 10
	// 			}
	// 		}

	// 		if (indexWall == -1) {
	// 			room.content.push(wData);
	// 		}else{
	// 			room.content[indexWall] = wData;
	// 		}

	// 	} else {

	// 		const indexWall = room.size.walls.findIndex((item: any) => item.id === data.wall.id);

	// 		// // центр стены
	// 		// const centerWall = data.wall.points.reduce((acc: any, point: any) => {
	// 		// 	acc.x += point.x;
	// 		// 	acc.y += point.y;
	// 		// 	acc.z += point.z;
	// 		// 	return acc;
	// 		// }, { x: 0, y: 0, z: 0 });

	// 		// centerWall.x /= data.wall.points.length;
	// 		// centerWall.y /= data.wall.points.length;
	// 		// centerWall.z /= data.wall.points.length;

	// 		const centerWall = getCenterOfPoints([data.wall.points[0], data.wall.points[1]]);

	// 		const wData = {
	// 			id: data.wall.id,
	// 			width: data.wall.width * 10,
	// 			height: 300 * 10,
	// 			depth: data.wall.height * 10,
	// 			position: {
	// 				x: centerWall.x * 10,
	// 				y: (300 * 10) / 2,
	// 				z: centerWall.y * 10
	// 			},
	// 			rotation: {
	// 				isEuler: true,
	// 				_x: MathUtils.degToRad(0),
	// 				_y: MathUtils.degToRad(-data.wall.angleDegrees),
	// 				_z: MathUtils.degToRad(0),
	// 				_order: "XYZ"
	// 			},
	// 			side: 0
	// 		}
	// 		if (indexWall == -1) {
	// 			if (data.wall.mergeWalls.wallPoint0) {
	// 				const indexMergeWall = room.size.walls.findIndex((el: any) => el.id === data.wall.mergeWalls.wallPoint0);
	// 				if (indexMergeWall != -1) {
	// 					room.size.walls.splice(indexMergeWall, 0, wData);
	// 				}
	// 			} else if (data.wall.mergeWalls.wallPoint1) {
	// 				const indexMergeWall = room.size.walls.findIndex((el: any) => el.id === data.wall.mergeWalls.wallPoint1);
	// 				if (indexMergeWall != -1) {
	// 					room.size.walls.splice(indexMergeWall + 1, 0, wData);
	// 				}
	// 			} else {
	// 				room.size.walls.push(wData);
	// 			}
	// 		} else {
	// 			room.size.walls[indexWall] = wData;
	// 		}

	// 	}

	// };

	// // удаление стены
	// const removeWall = (data: any) => {
	// 	/*
	// 	data.idRoom = string | number;
	// 	data.idWall = string | number;
	// 	*/
	// 	const room = SchemeTransitionData.value.find((item: any) => item.id === data.idRoom);

	// 	if (!room) return;

	// 	const indexWall = room.size.walls.findIndex((item: any) => item.id === data.idWall);

	// 	if (indexWall >= 0) {
	// 		room.size.walls.splice(indexWall, 1);
	// 	}else if(indexWall == -1){
	// 		const indexWall = room.content.findIndex((item: any) => item.uuid === data.idWall);
	// 		if (indexWall >= 0) {
	// 			room.content.splice(indexWall, 1);
	// 		}
	// 	}

	// };
	/** @CENTRALIZED */

	const getRoomDataFor3DScene = (idRoom: string | number): any => {
		const data = SchemeTransitionData.value.find((item: any) => normalizeId(item.id) === normalizeId(idRoom));

		if (!data) return;

		const cloned = deepClone(normalizeRoom(data));
		cloned.content = typeof cloned.content !== 'string' ? JSON.stringify(cloned.content) : cloned.content

		// const prepareData = data.map(elem => {
		// 	const content = typeof elem.content != 'string' ? JSON.stringify(elem.content) : elem.content
		// 	return {
		// 		...elem,
		// 		content: content
		// 	}
		// })

		const roomData = cloned
		/*
	  
		// Если нет стен - возвращаем как есть
		if (!roomData.params?.walls?.length) return roomData;

		// 1. Находим средний центр всех стен
		const wallsCenter = roomData.params.walls.reduce((acc: any, wall: any) => {
			acc.x += wall.position.x;
			acc.z += wall.position.z;
			return acc;
		}, { x: 0, z: 0 });

		wallsCenter.x /= roomData.params.walls.length;
		wallsCenter.z /= roomData.params.walls.length;

		// 2. Смещаем стены к центру сцены
		roomData.params.walls.forEach((wall: any) => {
			wall.position.x -= wallsCenter.x;
			wall.position.y = 1500; // Фиксированная высота
			wall.position.z -= wallsCenter.z;
		});

		console.log("");
		console.log("");
		console.log("");

		// 3. Смещаем объекты на ТО ЖЕ расстояние
		if (roomData.content?.length) {
			roomData.content.forEach((item: any) => {
				console.log(item.position.x, item.position.y, item.position.z);
				item.position.x -= wallsCenter.x;
				item.position.y = 1500; // Фиксированная высота
				item.position.z -= wallsCenter.z;
				console.log(item.position.x, item.position.y, item.position.z);
				console.log("");
				console.log("");
				console.log("");
			});
		}
		*/

		return roomData;
	};

	const getSchemeTransitionData = computed(() => {
		const normalized = SchemeTransitionData.value.map(normalizeRoom);
		const prepareData = normalized.map(elem => ({
			...deepClone(elem),
			content: typeof elem.content !== 'string' ? JSON.stringify(elem.content) : elem.content
		}));
		return prepareData;
	})

	const getWalls = computed(() => {
		return SchemeTransitionData.value[0].params.walls
	});

	const getRoomById = computed(() => {
		return (id: string | number) => {
			return SchemeTransitionData.value.find((item: any) => normalizeId(item.id) === normalizeId(id));
		}
	});// 

	const getRoomHeight = computed(() => {
		return roomHeight
	})

	return {
		SchemeTransitionData,
		getAllData,
		clearStore,
		getSchemeTransitionData,
		getRoomDataFor3DScene,
		setAppData,
		getWalls,
		getRoomById,
		getRoomHeight,

		// setWall,
		// removeWall
	};

});
