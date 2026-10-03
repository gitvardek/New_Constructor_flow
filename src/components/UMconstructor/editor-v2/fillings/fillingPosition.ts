// Положение наполнения в панели и его изменение.
//
// По Y панель показывает высоту от дна модуля изнутри (как
// FillingsCore.getAbsolutePositionY), а движок двигает наполнение по
// distances.bottom области (changeFillingPositionY). Границы даёт
// calcMinMaxPositionY: для ящика с фасадом — сразу в системе distances.bottom,
// для остального — со сдвигом area.position.y. Здесь обе границы приводятся к
// одной системе, иначе поле ограничивало бы значение по чужим координатам.
//
// По X (вертикальные элементы) — distances.left в пределах ширины области.
import type UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import type { FillingLocation } from "./fillingLocations.ts";

export interface PositionRange {
    value: number;
    min: number;
    max: number;
}

// Абсолютная (от дна изнутри) = area.position.y + distances.bottom - base.
const getBase = (grid: any) => grid.horizont + (grid.noBottom ? 0 : grid.moduleThickness);

const toAbsolute = (grid: any, area: any, local: number) => area.position.y + local - getBase(grid);

const getLocalRangeY = (engine: UMconstructorClass, grid: any, { filling, area }: FillingLocation) => {
    const local = (type: "min" | "max") => {
        const raw = engine.FILLINGS.calcMinMaxPositionY(type, filling, area, grid);
        return filling.fasade ? raw : raw - area.position.y;
    };
    return { min: local("min"), max: local("max") };
};

export const getFillingPositionY = (engine: UMconstructorClass, grid: any, location: FillingLocation): PositionRange => {
    const range = getLocalRangeY(engine, grid, location);
    return {
        value: Math.round(engine.FILLINGS.getAbsolutePositionY(location.filling, location.area)),
        // Ниже дна поле не опускает (как и getAbsolutePositionY); ниже ставит перетаскивание.
        min: Math.max(0, Math.ceil(toAbsolute(grid, location.area, range.min))),
        max: Math.floor(toAbsolute(grid, location.area, range.max)),
    };
};

// value — высота от дна изнутри. Применяет движок с задержкой (последний ввод).
export const applyFillingPositionY = (engine: UMconstructorClass, grid: any, location: FillingLocation, value: number) => {
    const { filling, area, index, path } = location;
    engine.FILLINGS.changeFillingPositionY(
        getLocalRangeY(engine, grid, location),
        engine.FILLINGS.getLocalPositionY(value, filling, area),
        index,
        path.sec,
        path.cell,
        path.row,
        path.extra,
        grid,
    );
};

export const getFillingPositionX = (location: FillingLocation): PositionRange => ({
    value: Math.round(location.filling.distances?.left ?? 0),
    min: 0,
    max: Math.floor(location.area.width - location.filling.width),
});

export const applyFillingPositionX = (engine: UMconstructorClass, grid: any, location: FillingLocation, value: number) => {
    const { index, path } = location;
    const { min, max } = getFillingPositionX(location);
    engine.FILLINGS.changeFillingPositionX({ min, max }, value, index, path.sec, path.cell, path.row, path.extra, grid);
};
