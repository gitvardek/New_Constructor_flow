// Выбор/подсветка ячеек, фасадов и наполнения на 2D-сцене. Вынесено из
// Render2D.vue (Фаза 2d рефакторинга, см.
// C:\Users\MG_GO.MG\.claude\plans\iterative-launching-lerdorf.md).
//@ts-nocheck

import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import RenderContext from "./RenderContext.ts";
import { TSelectedCell } from "@/components/UMconstructor/types/UMtypes.ts";

export default class SelectionHighlighter {
    ctx: RenderContext

    constructor(ctx: RenderContext) {
        this.ctx = ctx
    }

    // Выбор секции, передача в родительский компонент
    selectCell(type: string, newSelectedCell: TSelectedCell) {
        const ctx = this.ctx

        // Гардеробная система — профиль и полка/секция/наполнение
        // взаимоисключающие выделения (уточнение пользователя: "при клике
        // на наполнение выделение профиля не пропадает — ни на канвасе, ни
        // в UX"). selectCell (любой type — клик по полке/секции/фасаду)
        // снимает выделение профиля, если оно было; см. симметричную
        // очистку filling-выделения в selectWardrobeProfile ниже.
        if (ctx.UMconstructor?.value?.UM_STORE.selectedWardrobeProfileId != null) {
            ctx.UMconstructor.value.UM_STORE.selectedWardrobeProfileId = null;
            ctx.wardrobeProfilesMap?.forEach(entry => { entry.highlightGraphics.visible = false; });
        }

        switch (type) {
            case "fillings": {
                ctx.UMconstructor?.value?.UM_STORE.setSelected(type, newSelectedCell);
                ctx.UMconstructor?.value?.UM_STORE.setSelected("module", newSelectedCell);
                ctx.selectedFilling.value = newSelectedCell;
                ctx.fillingsMap.forEach(shape => {
                    const d = shape.data;
                    shape.highlightGraphics.visible =
                        newSelectedCell.sec === d.sec &&
                        newSelectedCell.cell === d.cell &&
                        newSelectedCell.row === d.row &&
                        newSelectedCell.extra === d.extra &&
                        newSelectedCell.item === d.id;
                });

                // Гардеробная система (уточнение пользователя: клик по
                // полке/штанге на канвасе <-> выделение в WardrobeFillingsView.vue
                // "Конфигурация") — тот же приём, что и у ctx.fillingsMap выше,
                // отдельная карта (см. RenderContext.wardrobeShelvesMap) — полки
                // не используют класс Shape.
                ctx.wardrobeShelvesMap.forEach(shape => {
                    const d = shape.data;
                    shape.highlightGraphics.visible =
                        newSelectedCell.sec === d.sec &&
                        newSelectedCell.cell === d.cell &&
                        newSelectedCell.row === d.row &&
                        newSelectedCell.extra === d.extra &&
                        newSelectedCell.item === d.id;
                });

                break;
            }
            case "fasades": {
                ctx.UMconstructor?.value?.UM_STORE.setSelected(type, newSelectedCell);
                ctx.UMconstructor?.value?.UM_STORE.setSelected("module", <TSelectedCell>{
                    sec: newSelectedCell.sec,
                });
                const { sec, cell, row } =
                    ctx.UMconstructor?.value?.UM_STORE.getSelected("fasades");
                this.toggleFasadeColor(sec, cell, row);
                break;
            }
            default: {

                ctx.UMconstructor?.value?.UM_STORE.setSelected(type, newSelectedCell);
                ctx.UMconstructor?.value?.UM_STORE.setSelected("fillings", newSelectedCell);
                const { sec, cell, row, extra } =
                    ctx.UMconstructor?.value?.UM_STORE.getSelected("module");

                this.toggleSectionColor(sec, cell, row, extra);
                break;
            }
        }
    }

    // Гардеробная система — выбор ПРОФИЛЯ (уточнение пользователя: клик по
    // профилю на канвасе <-> выделение в WardrobeProfilesView.vue "Настройка
    // профилей", и наоборот). Отдельный вход (не через selectCell выше) —
    // профиль не привязан к секции/типу TSelectedCell (не наполнение
    // секции, самостоятельный объект модуля), поэтому свой простой канал:
    // UM_STORE.selectedWardrobeProfileId (id или null), см. useUMStorage.ts.
    // Тот же приём переключения .visible НАПРЯМУЮ на уже отрисованных
    // объектах, что и у selectCell("fillings",...)/ctx.wardrobeShelvesMap
    // выше — без полного renderGrid.
    selectWardrobeProfile(profileId: number | null) {
        const ctx = this.ctx
        if (ctx.UMconstructor?.value) ctx.UMconstructor.value.UM_STORE.selectedWardrobeProfileId = profileId;
        ctx.wardrobeProfilesMap.forEach(entry => {
            entry.highlightGraphics.visible = entry.data.id === profileId;
        });

        // Симметрично selectCell выше — профиль и полка/наполнение
        // взаимоисключающие выделения: выбор профиля снимает выделение
        // полки/штанги (canvas И WardrobeFillingsView.vue "Конфигурация"),
        // если оно было.
        if (profileId != null) {
            ctx.UMconstructor?.value?.UM_STORE.setSelected('fillings', null);
            ctx.selectedFilling.value = <TSelectedCell>{};
            ctx.fillingsMap?.forEach(shape => { shape.highlightGraphics.visible = false; });
            ctx.wardrobeShelvesMap?.forEach(shape => { shape.highlightGraphics.visible = false; });
        }
    }

    toggleSectionColor(
        sectionIndex,
        cellIndex,
        rowIndex = null,
        extraIndex = null,
    ) {
        const ctx = this.ctx
        const section = ctx.props.module.sections[sectionIndex];
        const cell = section?.cells[cellIndex];
        const row = cell?.cellsRows?.[rowIndex];
        const extra = row?.extras?.[extraIndex];

        const sector =
            extra?.sector ||
            row?.sector ||
            cell?.sector ||
            section?.sector ||
            ctx.props.module.sector;

        ctx.sections[0].children.forEach((elem) => {
            if (elem.children[1]) elem.children[1].visible = false;
            // elem.children[0].alpha = 1;
        });
        if (sector?.children[1]) sector.children[1].visible = true;
        // sector.children[0].alpha = 0.5;
    }

    checkSectorsCollision(currShape, targetSector) {
        return this.ctx.shapeAdjuster.checkToCollision(targetSector, false, currShape);
    }

    toggleFasadeColor(sectionIndex, doorIndex, segmentIndex = 0) {
        const ctx = this.ctx
        const _fasades =
            sectionIndex === null
                ? ctx.props.module?.fasades
                : ctx.props.module.sections[sectionIndex].fasades;
        const door = _fasades[doorIndex];
        const segment = door?.[segmentIndex];

        const sector = segment?.sector || door?.sector;

        ctx.fasades.forEach((elem) => {
            if (elem.children[1]) elem.children[1].visible = false;
            // elem.children[0].alpha = 1;
        });
        if (sector?.children[1]) sector.children[1].visible = true;
        // sector.children[0].alpha = 0.5;
    }

    // Не вызывается никем на текущий момент (то же самое было верно и до
    // рефакторинга) — сохранён при переносе как есть, зеркалит toggleSectionColor.
    toggleFillingColor(
        sectionIndex,
        cellIndex,
        rowIndex = null,
        itemIndex = null,
        extraIndex = null,
    ) {
        const ctx = this.ctx
        const section = ctx.props.module.sections[sectionIndex];
        const cell = section?.cells[cellIndex];
        const row = cell?.cellsRows?.[rowIndex];
        const extra = row?.extras?.[extraIndex];

        const curSegment = extra || row || cell || section || ctx.props.module;
        // На уровне секции item = filling.id (с 1), а не индекс массива — ищем по id
        const fillingObj = (cellIndex === null && rowIndex === null && extraIndex === null)
            ? curSegment?.fillings?.find(f => f.id === itemIndex)
            : curSegment?.fillings?.[itemIndex]
        const sector = fillingObj?.sector;

        ctx.sections[0].children.forEach((elem) => {
            if (elem.children[1]) elem.children[1].visible = false;
            // elem.children[0].alpha = 1;
        });
        if (sector?.children[1]) sector.children[1].visible = true;
        // sector.children[0].alpha = 0.5;
    }

    // Обходит иерархию sections → cells → cellsRows → extras → fillings
    // и возвращает селектор первого наполнения с его координатами.
    findFirstFilling(grid) {
        for (let si = 0; si < (grid?.sections?.length ?? 0); si++) {
            const sec = grid.sections[si];
            if (sec.fillings?.length > 0)
                return { sec: si, cell: null, row: null, extra: null, item: sec.fillings[0].id };
            for (let ci = 0; ci < (sec.cells?.length ?? 0); ci++) {
                const cell = sec.cells[ci];
                if (cell.fillings?.length > 0)
                    return { sec: si, cell: ci, row: null, extra: null, item: cell.fillings[0].id };
                for (let ri = 0; ri < (cell.cellsRows?.length ?? 0); ri++) {
                    const rowObj = cell.cellsRows[ri];
                    if (rowObj.fillings?.length > 0)
                        return { sec: si, cell: ci, row: ri, extra: null, item: rowObj.fillings[0].id };
                    for (let ei = 0; ei < (rowObj.extras?.length ?? 0); ei++) {
                        const extra = rowObj.extras[ei];
                        if (extra.fillings?.length > 0)
                            return { sec: si, cell: ci, row: ri, extra: ei, item: extra.fillings[0].id };
                    }
                }
            }
        }
        return null;
    }

    changeConstructorMode(_mode) {
        const ctx = this.ctx
        ctx.mode.value = _mode;

        const grid = ctx.props.module;

        // Наполнения: highlight задаётся при createFilling через highlightGraphics.visible,
        // поэтому обновляем selectedFilling ДО renderGrid
        if (_mode === 'fillings') {
            const sel = this.findFirstFilling(grid);
            if (sel) {
                ctx.selectedFilling.value = sel;
                ctx.UMconstructor?.value?.UM_STORE.setSelected('fillings', sel);
            }
        } else {
            // При выходе из режима наполнений снимаем выделение
            ctx.selectedFilling.value = <TSelectedCell>{};
            ctx.UMconstructor?.value?.UM_STORE.setSelected('fillings', null);
        }

        if (_mode === 'fasades') {
            // Фасады: обновляем стор ДО renderGrid только для правой панели;
            // canvas-подсветку делаем через toggleFasadeColor ПОСЛЕ renderGrid,
            // т.к. segment.sector устанавливается во время рендера
            const hasModuleFasades = grid?.fasades?.length > 0 && grid.fasades[0]?.length > 0;
            const firstSecWithFasades = grid?.sections?.findIndex(s => s.fasades?.length > 0);
            const hasSectionFasades = firstSecWithFasades >= 0;
            if (hasModuleFasades || hasSectionFasades) {
                const sel = { sec: hasModuleFasades ? null : firstSecWithFasades, cell: 0, row: 0 };
                ctx.selectedFasade.value = sel;
                ctx.UMconstructor?.value?.UM_STORE.setSelected('fasades', sel);
            }
        }

        // Гардеробная система: во время живого драга полки (см.
        // DividerDragEngine.wardrobeShelfDrag) renderGrid() здесь НЕ зовём.
        // Симптом был такой: при драге наполнения в режиме "Модуль"
        // пропадали почти все обозначения, полка не ехала за курсором, а
        // корректный рендер появлялся только после дропа. Причина — клик по
        // полке в режиме "Модуль" запускает авто-переключение mode через
        // watch в WardrobeMainView.vue, а Vue watch асинхронный, т.е.
        // срабатывает уже ПОСРЕДИ начавшегося драга. Драг же двигает
        // graphic/подпись/контур прямой мутацией существующих PIXI-объектов
        // (onWardrobeShelfDragMove), а renderGrid() их уничтожает
        // (clearRender()) и создаёт новые — драг продолжал бы двигать
        // осиротевшие невидимые объекты. mode/selectedFilling обновлены
        // синхронно выше, так что панель переключается сразу; рендер канваса
        // догоняет на dragEnd (resetModule()).
        if (!ctx.wardrobeDragActive) {
            ctx.renderGrid();

            // Фасады: после рендера секция уже привязана к данным — подсвечиваем первый
            if (_mode === 'fasades') {
                const hasModuleFasades = grid?.fasades?.length > 0 && grid.fasades[0]?.length > 0;
                const firstSecWithFasades = grid?.sections?.findIndex(s => s.fasades?.length > 0);
                const hasSectionFasades = firstSecWithFasades >= 0;
                if (hasModuleFasades || hasSectionFasades) {
                    this.toggleFasadeColor(hasModuleFasades ? null : firstSecWithFasades, 0, 0);
                }
            }
        }
    }
}
