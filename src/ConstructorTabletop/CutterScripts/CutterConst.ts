export const CUTTER_PARAMS = {
    TOTAL_LENGTH: 3000, // Общая длина в миллиметрах
    TOTAL_HEIGHT: 1200, // Общая высота в миллиметрах
    MAX_AREA_WIDTH: 800, // Максимальная ширина области в пикселях
    MIN_SECTION_WIDTH: 10, // Минимальная ширина секции
    MIN_SECTION_HEIGHT: 10, // Минимальная высота секции
    PART_MIN_SIZE: 10,
    MIN_HOLE_SIZE_MM: 100, // Минимальный размер отверстия в мм
    MAX_HOLE_SIZE_MM: 1000, // Максимальный размер отверстия в мм,
    BACKGROUND_COLOR: "#FFFFFF",
    HOLE_OFFSET: 10,// Отступ от краёв
    CUT_SERVISES: [
        { ID: 182294, NAME: "Кромкование торцов", pos: 'KROMKA_FULL_TOREC_ZEB', value: false },


        { ID: 201638_2, NAME: "Верхний левый скос", pos: 'LEFT_TOP', corner: 150, value: false },
        { ID: 201639_2, NAME: "Верхний правый скос", pos: 'RIGHT_TOP', corner: 150, value: false },

        { ID: 201638, NAME: "Нижний левый скос", pos: 'LEFT_BOTTOM', corner: 150, value: false },
        { ID: 201639, NAME: "Нижний правый скос", pos: 'RIGHT_BOTTOM', corner: 150, value: false },

        { ID: 201640_2, NAME: "Верхнее левое закругление", pos: 'LEFT_TOP', radius: 150, value: false },
        { ID: 201641_2, NAME: "Верхнее правое закругление", pos: 'RIGHT_TOP', radius: 150, value: false },
        { ID: 201640, NAME: "Нижнее левое закругление", pos: 'LEFT_BOTTOM', radius: 150, value: false },
        { ID: 201641, NAME: "Нижнее правое закругление", pos: 'RIGHT_BOTTOM', radius: 150, value: false },

        { ID: 247669_2, NAME: "Еврозапил - папа сверху справа", pos: 'RIGHT_TOP', radius: 30, value: false },
        { ID: 247670_2, NAME: "Еврозапил - папа сверху слева", pos: 'LEFT_TOP', radius: 30, value: false },
        { ID: 247669, NAME: "Еврозапил - папа снизу справа", pos: 'RIGHT_BOTTOM', radius: 30, value: false },
        { ID: 247670, NAME: "Еврозапил - папа снизу слева", pos: 'LEFT_BOTTOM', radius: 30, value: false },

        { ID: 247671_2, NAME: "Еврозапил - мама сверху справа", pos: 'RIGHT_TOP', radius: 30, width: 300, value: false },
        { ID: 247672_2, NAME: "Еврозапил - мама сверху слева", pos: 'LEFT_TOP', radius: 30, width: 300, value: false },
        { ID: 247671, NAME: "Еврозапил - мама снизу справа", pos: 'RIGHT_BOTTOM', radius: 30, width: 300, value: false },
        { ID: 247672, NAME: "Еврозапил - мама снизу слева", pos: 'LEFT_BOTTOM', radius: 30, width: 300, value: false },

        { ID: 616287_2, NAME: "Закругление под барную стойку слева", pos: 'LEFT', value: false },
        { ID: 616287, NAME: "Закругление под барную стойку справа", pos: 'RIGHT', value: false },

        { ID: 3966035, NAME: "Кромка правый бок", pos: 'CENTER', value: false },
        { ID: 3966036, NAME: "Кромка левый бок", pos: 'CENTER', value: false },
    ],
    SECTOR_PADDING: 30,
    DEFAULT: [
        [
            {
                width: 3000,
                height: 600,
                roundCut: {},
                holes: [

                ],
                serviseData: [
                    { ID: 182294, value: false, NAME: "Кромкование торцов", POSITION: 'kromka' },


                    { ID: 201638_2, value: false, NAME: "Верхний левый скос", POSITION: 'LEFT_TOP', corner: 150 },
                    { ID: 201639_2, value: false, NAME: "Верхний правый скос", POSITION: 'RIGHT_TOP', corner: 150 },

                    { ID: 201638, value: false, NAME: "Нижний левый скос", POSITION: 'LEFT_BOTTOM', corner: 150 },
                    { ID: 201639, value: false, NAME: "Нижний правый скос", POSITION: 'RIGHT_BOTTOM', corner: 150 },
                    { ID: 1458331, value: false, NAME: "Нижний левый скос", POSITION: 'LEFT_TOP', corner: 150 },
                    { ID: 1458332, value: false, NAME: "Нижний правый скос", POSITION: 'RIGHT_BOTTOM', corner: 150 },

                    { ID: 201640_2, value: false, NAME: "Верхнее левое закругление", POSITION: 'LEFT_TOP', radius: 150 },
                    { ID: 201641_2, value: false, NAME: "Верхнее правое закругление", POSITION: 'RIGHT_TOP', radius: 150 },
                    { ID: 201640, value: false, NAME: "Нижнее левое закругление", POSITION: 'LEFT_BOTTOM', radius: 150 },
                    { ID: 201641, value: false, NAME: "Нижнее правое закругление", POSITION: 'RIGHT_BOTTOM', radius: 150 },

                    { ID: 247669_2, value: false, NAME: "Еврозапил - папа сверху справа", POSITION: 'RIGHT_TOP', radius: 30 },
                    { ID: 247670_2, value: false, NAME: "Еврозапил - папа сверху слева", POSITION: 'LEFT_TOP', radius: 30 },
                    { ID: 247669, value: false, NAME: "Еврозапил - папа снизу справа", POSITION: 'RIGHT_BOTTOM', radius: 30 },
                    { ID: 247670, value: false, NAME: "Еврозапил - папа снизу слева", POSITION: 'LEFT_BOTTOM', radius: 30 },

                    { ID: 247671_2, value: false, NAME: "Еврозапил - мама сверху справа", POSITION: 'RIGHT_TOP', radius: 30, width: 300 },
                    { ID: 247672_2, value: false, NAME: "Еврозапил - мама сверху слева", POSITION: 'LEFT_TOP', radius: 30, width: 300 },
                    { ID: 247671, value: false, NAME: "Еврозапил - мама снизу справа", POSITION: 'RIGHT_BOTTOM', radius: 30, width: 300 },
                    { ID: 247672, value: false, NAME: "Еврозапил - мама снизу слева", POSITION: 'LEFT_BOTTOM', radius: 30, width: 300 },

                    { ID: 616287_2, value: false, NAME: "Закругление под барную стойку слева", POSITION: 'LEFT' },
                    { ID: 616287, value: false, NAME: "Закругление под барную стойку справа", POSITION: 'RIGHT' },

                    { ID: 3966035, value: false, NAME: "Кромка правый бок", POSITION: 'kromka' },
                    { ID: 3966036, value: false, NAME: "Кромка левый бок", POSITION: 'kromka' },
                ],
            },
        ],
    ],
    EXTREMUMS: {
        HOLES: 300,
        CUT: 600
    },

}

export const SERVISE_ERRORS: Record<string, string> = {
    '101': 'Пересечение распилов',
}