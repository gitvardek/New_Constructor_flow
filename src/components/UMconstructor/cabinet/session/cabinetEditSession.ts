// Сессия редактирования тумбочки: отдельный движок УМ на копии данных.
// Товар — из каталога по item.productId (getCabinetProduct), PROPS собирает тот же сборщик, что и для
// товара на сцене (createStartProps), но без объекта на сцене. Сохранённый
// конфиг тумбочки (item.cabinet.config) подменяет стартовый. Габариты
// приводятся к лимитам гардеробной (cabinetLimits.ts) через SIZE и SIZE_EDIT —
// те же поля, по которым редактор УМ ограничивает ввод размеров.
//
// Объекта на сцене нет, поэтому то, что у товара сцены делает первая 3D-сборка,
// повторяется здесь в том же порядке (см. prepareConfig).
//
// apply пишет результат обратно в элемент гардеробной; без apply гардеробная
// не меняется. После использования — dispose.
import { reactive, toRaw } from "vue";
import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { createUMEngine, disposeUMEngine } from "@/components/UMconstructor/ts/createUMEngine.ts";
import { cloneUMData } from "@/components/UMconstructor/editor-v2/session/cloneUMData.ts";
import { saveUMGrid } from "@/components/UMconstructor/utils/PixiMethods.ts";
import { scaleGridWidth } from "@/components/UMconstructor/editor-v2/grid/scaleGridWidth.ts";
import { getCabinetProduct } from "../cabinetProduct.ts";
import { getCabinetEditLimits, type CabinetEditLimits } from "../cabinetLimits.ts";
import { createDefaultCabinetConfig, getCabinetHeight, removeExcludedCabinetOptions } from "../CabinetSystem.ts";

interface SessionTarget {
    wardrobeEngine: UMconstructorClass;
    // Сетка гардеробной; по умолчанию — из стора её движка. Явно — из пересчёта
    // гардеробной, где сетка попадает в стор только в конце.
    wardrobeGrid?: any;
    secIndex: number;
    cabinetId: number;
    // true — начать с пустой тумбочки (стартовая сетка), из сохранённого конфига
    // взять только материалы корпуса и опции (syncCabinetConfig: содержимое не
    // вписалось в новую ширину секции).
    resetContent?: boolean;
}

// Материалы корпуса и опции — не содержимое, при сбросе содержимого остаются. Тот
// же набор, что основной редактор УМ сохраняет для отката (UMconstructor.vue::saveConfigCash),
// без HORIZONT/EXPRESSIONS: их заново даёт стартовая сетка.
const CARCASS_CONFIG_KEYS = [
    "MODULE_COLOR",
    "MANUAL_MODULE_COLOR",
    "LEFTSIDECOLOR",
    "RIGHTSIDECOLOR",
    "BACKWALL",
    "TOPFASADECOLOR",
    "TSARGA",
    "OPTIONS",
];

// Порядок как в BuildUniversalModule.createProductBody: SIZE, затем
// getProductSize (пересчитывает EXPRESSIONS: #X#/#MWIDTH#/#HORIZONT#...; у товара
// width/depth = null, без этого формулы дали бы NaN), затем позиции фасадов —
// по ним createUMgrid строит стартовую сетку.
const prepareConfig = (engine: UMconstructorClass, product: any, CONFIG: any, limits: CabinetEditLimits, fallbackHeight: number) => {
    const hasGrid = CONFIG.MODULEGRID && Object.keys(CONFIG.MODULEGRID).length > 0;
    const sourceHeight = (hasGrid && CONFIG.MODULEGRID.height) || fallbackHeight;
    const height = Math.min(Math.max(sourceHeight, limits.minHeight), limits.maxHeight);
    const size = { width: limits.width, height, depth: limits.depth };

    CONFIG.SIZE = { ...CONFIG.SIZE, ...size };
    engine.BUILDER.getProductSize(CONFIG, { ...product, ...size });

    // Сетку подгоняет первый reset() редактора; ширину — заранее пропорционально,
    // иначе reset отдаёт всю разницу последней секции/ряду (при сужении — в минус).
    // Не вписалось ли содержимое, решает вызывающий по итоговой сетке (syncCabinetConfig).
    if (hasGrid) {
        if (CONFIG.MODULEGRID.width !== size.width) {
            scaleGridWidth(CONFIG.MODULEGRID, size.width, engine.CONST.MIN_SECTION_WIDTH);
        }
        Object.assign(CONFIG.MODULEGRID, size);
    } else {
        engine.BUILDER.fasade_builder.prepareFasadePositions(CONFIG);
    }

    CONFIG.SIZE_EDIT = {
        ...CONFIG.SIZE_EDIT,
        SIZE_EDIT_WIDTH_MIN: limits.width,
        SIZE_EDIT_WIDTH_MAX: limits.width,
        SIZE_EDIT_DEPTH_MIN: limits.depth,
        SIZE_EDIT_DEPTH_MAX: limits.depth,
        SIZE_EDIT_HEIGHT_MIN: limits.minHeight,
        SIZE_EDIT_HEIGHT_MAX: limits.maxHeight,
    };
};

export const createCabinetEditSession = ({ wardrobeEngine, wardrobeGrid: grid, secIndex, cabinetId, resetContent = false }: SessionTarget) => {
    const wardrobe = reactive(wardrobeEngine);
    const wardrobeGrid = grid ?? wardrobe.UM_STORE.getUMGrid();
    const findItem = () => wardrobeGrid.sections[secIndex]?.wardrobeFilling?.find((item: any) => item.id === cabinetId);

    const item = findItem();
    const limits = getCabinetEditLimits(wardrobeGrid, secIndex, cabinetId);
    if (!item || !limits) throw new Error(`Тумбочка ${cabinetId} не найдена в секции ${secIndex}`);

    const savedConfig = item.cabinet?.config;
    const keepContent = !!savedConfig && !resetContent;
    // Стартовая сетка строится со стандартным цоколем, см. prepareGrid.
    const isNew = !keepContent;
    const product = getCabinetProduct(item.productId);
    // Сырое приложение: через прокси движка вложенный движок получил бы реактивную
    // обёртку всего приложения (сцена, сборщики).
    const engine = createUMEngine(toRaw(wardrobeEngine).ROOT, "cabinet");

    let PROPS: any;
    try {
        const rawProduct = toRaw(product);
        PROPS = engine.BUILDER.createStartProps(rawProduct);
        if (keepContent) {
            PROPS.CONFIG = cloneUMData(savedConfig);
        } else if (savedConfig) {
            CARCASS_CONFIG_KEYS.forEach((key) => {
                if (key in savedConfig) PROPS.CONFIG[key] = cloneUMData(savedConfig[key]);
            });
        }
        removeExcludedCabinetOptions(PROPS.CONFIG);
        prepareConfig(engine, rawProduct, PROPS.CONFIG, limits, getCabinetHeight(item));
        engine.UM_STORE.setUMData(PROPS);
    } catch (error) {
        disposeUMEngine(engine);
        throw error;
    }

    // Состояние для проверки несохранённых изменений: сетка из стора (CONFIG.MODULEGRID
    // после первого reset устаревает) + остальной CONFIG. null — не сериализовалось.
    const snapshot = (): string | null => {
        try {
            const { MODULEGRID, ...config } = engine.UM_STORE.getUMData().CONFIG;
            return JSON.stringify(cloneUMData({ grid: engine.UM_STORE.getUMGrid(), config }));
        } catch {
            return null;
        }
    };

    // Тумбочка висит между профилями — цоколя нет. Новую сетку переводим на
    // цоколь 0 тем же путём, что опция "Навесной" у товара сцены: сетка построена
    // со стандартным цоколем (позиция фасада из БД считается от него), затем
    // applyHorizont сдвигает секции и фасады вниз, reset дотягивает высоты.
    // Сохранённый конфиг уже без цоколя.
    const prepareGrid = (editorEngine: UMconstructorClass, grid: any) => {
        if (isNew) editorEngine.applyHorizont(grid, 0);
    };

    // Запись результата в тумбочку без пересчёта гардеробной.
    // grid — проверенная сетка редактора (без grid.errors).
    const writeBack = (grid: any) => {
        const target = findItem();
        if (!target) return;

        const data = engine.UM_STORE.getUMData();
        data.CONFIG.MODULEGRID = saveUMGrid(grid);
        target.cabinet = {
            ...(target.cabinet ?? createDefaultCabinetConfig()),
            height: grid.height,
            config: cloneUMData(data.CONFIG),
        };
    };

    const apply = (grid: any) => {
        writeBack(grid);
        wardrobe.reset(wardrobeGrid);
    };

    const dispose = () => disposeUMEngine(engine);

    return {
        engine,
        productData: { PROPS, globalData: product.ID },
        limits,
        prepareGrid,
        snapshot,
        writeBack,
        apply,
        dispose,
    };
};

export type CabinetEditSession = ReturnType<typeof createCabinetEditSession>;
