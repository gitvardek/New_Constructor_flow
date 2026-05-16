<script setup lang="ts">
// @ts-nocheck
import {defineExpose, onMounted, ref, toRefs} from "vue";

import {GridCell, GridCellsRow, GridRowExtra, GridSection} from "@/types/constructor2d/interfaсes.ts";
import * as THREE from "three";
import {UI_PARAMS} from "@/components/2DmoduleConstructor/utils/UMConstructorConst.ts";
import CounterInput from "@/components/ui/inputs/CounterInput.vue";

const {
  MIN_SECTION_WIDTH,
  MIN_SECTION_HEIGHT,
  MAX_SECTION_WIDTH,
} = UI_PARAMS;

const props = defineProps({
  module: {
    type: Object,
    default: {},
    required: true,
  },
  step: {
    type: Number,
    default: 1,
  },
  visualizationRef: {
    type: [ref, Object],
  }
});

const {module, visualizationRef} = toRefs(props);
const selectedCell = ref({sec: 0, cell: null, row: null, extra: null});
const timerReset = ref(false);

const emit = defineEmits([
  "product-updateFasades",
  "product-reset",
  "product-calcLoops",
  "product-checkLoopsCollision",
]);

const timer = ref(false);
const debounce = (callback, wait) => {
  if (timer.value) {
    clearTimeout(timer.value)
  }

  timer.value = setTimeout(() => {
    callback();
    timer.value = false
  }, wait)
}

const selectCell = (sec, cell = null, row = null, extra = null) => {
  selectedCell.value = {sec, cell, row, extra};
  visualizationRef.value.selectCell("module", sec, cell, true, row, null, extra);

};

const handleCellSelect = (secIndex, cellIndex = null, rowIndex = null, extraIndex = null) => {
  selectedCell.value = {sec: secIndex, cell: cellIndex, row: rowIndex, extra: extraIndex};

  //Задержка нужна для того, чтоб рендер аккордионов обновился
  setTimeout(() => {
    let idTag = `module_${secIndex}`

    if(cellIndex !== null)
      idTag += `_${cellIndex}`;

    if(rowIndex !== null)
      idTag += `_${rowIndex}`

    if(extraIndex !== null)
      idTag += `_${extraIndex}`;

    let domElem = document.getElementById(idTag)
    if(domElem) {
      domElem.scrollIntoView();
    }
    timer.value = false
  }, 10)

};

const updateFasades = () => {
  emit("product-updateFasades");
}

const calcLoops = (secIndex) => {
  emit("product-calcLoops", secIndex);
}

const checkLoopsCollision = (secIndex, cellIndex = null, rowIndex = null) => {
  emit("product-checkLoopsCollision", secIndex, cellIndex, rowIndex);
}

const reset = () => {
  emit("product-reset");
};

const showCurrentCol = (secIndex) => {
  selectCell(secIndex)
};

const addSection = (secIndex, _count = 1) => {
  const count = parseInt(_count)

  const section = module.value.sections[secIndex];
  const halfWidth = Math.floor((section.width - module.value.moduleThickness * count) / (count + 1));

  if (halfWidth < MIN_SECTION_WIDTH) {
    alert("Размер секций будет слишком мал! Пожалуйста, выберите меньшее количество секций!");
    return;
  }

  const deltaLastSection = section.width - halfWidth * (count + 1) - module.value.moduleThickness * count;

  // Обновляем ширину текущей колонки
  section.position.x = section.position.x - (section.width / 2 - halfWidth / 2)
  section.width = halfWidth;
  section.fillings = []

  section.cells.forEach((cell) => {
    cell.width = halfWidth;
    cell.position.x = section.position.x
    cell.cellsRows = []
    cell.fillings = []
  });

  // Создаем новую колонку с такими же параметрами
  for (let i = 0; i < count; i++) {
    const newColumn: GridSection = {
      ...section,
      number: section.number + 1 + i,
      width: halfWidth,
      cells: [],
      fasades: [],
      fillings: [],
      position: new THREE.Vector2(section.position.x + (section.width / 2 + module.value.moduleThickness + halfWidth / 2) * (i + 1), section.position.y),
    }

    delete newColumn.hiTechProfiles

    if(section.loops) {
      newColumn.loops = []
      newColumn.loopsSides = {}
    }

    if(i === count - 1) {
      newColumn.width += deltaLastSection;
    }

    module.value.sections.splice(secIndex + 1 + i, 0, newColumn);
  }

  if(module.value.isRestrictedModule && section.fasades.length > 1) {
    let lastDoor = section.fasades.pop()
    lastDoor.id = 1;
    module.value.sections[secIndex + 1].fasades.push(lastDoor);
  }


  reset()

  //updateFasades();
  //calcLoops(secIndex);
  // Обновляем рендер
  //visualizationRef.value.renderGrid();
};

const addCell = (secIndex, cellIndex = null, _count = 1) => {
  const count = parseInt(_count)
  selectCell(secIndex, cellIndex);

  let section = module.value.sections[secIndex];

  let cell;
  if (section.cells.length > 0) {
    cell = section.cells[cellIndex]
  } else {
    cell = <GridCell>{
      number: 1,
      width: section.width,
      height: section.height,
      type: "cell",
      position: new THREE.Vector2(section.position.x, section.position.y),
    };

    if (section.fillings?.length) {
      delete section.fillings
    }

    if(section.hiTechProfiles) {
      delete section.hiTechProfiles
      updateFasades();
    }

    section.cells.push(cell);
  }

  if (cell.cellsRows)
    delete cell.cellsRows

  const halfHeight = Math.floor((cell.height - module.value.moduleThickness * count) / (count + 1));

  if (halfHeight < MIN_SECTION_HEIGHT) {
    alert("Расстояние между полками слишком мало! Пожалуйста, выберите меньшее количество полок!");
    return;
  }

  const deltaLastCell = cell.height - halfHeight * (count + 1) - module.value.moduleThickness * count;

  // Обновляем высоту последней строки
  cell.height = halfHeight;

  if (cell.fillings)
    cell.fillings.length = 0

  if(cell.hiTechProfiles) {
    delete cell.hiTechProfiles
    updateFasades();
  }

  // Добавляем новую строку в эту колонку
  for (let i = 0; i < count; i++) {

    let newCell = <GridCell>{
      ...cell,
      number: cell.number + 1 + i,
      position: new THREE.Vector2(cell.position.x, cell.position.y + (halfHeight + module.value.moduleThickness) * (i + 1)),
      fillings: [],
      //fillings: newFillings,
    }

    delete newCell.hiTechProfiles

    if(deltaLastCell && i === count - 1) {
      newCell.height += deltaLastCell;
    }

    section.cells.splice(cellIndex || 0, 0, newCell);
  }

  calcLoops(secIndex);

  // Обновляем рендер
  visualizationRef.value.renderGrid();
};

const addRowCell = (secIndex, cellIndex, rowIndex = 0, _count = 1) =>  {
  const count = parseInt(_count)

  selectCell(secIndex, cellIndex, rowIndex);

  const cell = module.value.sections[secIndex].cells[cellIndex]

  let row;
  if (cell.cellsRows?.length > 0) {
    row = cell.cellsRows[rowIndex];
  } else {
    cell.cellsRows = []
    row = <GridCellsRow>{
      number: 1,
      width: cell.width,
      height: cell.height,
      type: "rowCell",
      fillings: [],
      position: new THREE.Vector2(cell.position.x, cell.position.y),
    }
    cell.cellsRows.push(row);
    delete cell.fillings

    if(cell.hiTechProfiles) {
      delete cell.hiTechProfiles
      updateFasades();
    }
  }

  const halfWidth = Math.floor((row.width - module.value.moduleThickness * count) / (count + 1));

  if (halfWidth < MIN_SECTION_WIDTH) {
    alert("Расстояние между полками слишком мало! Пожалуйста, выберите меньшее количество полок!");
    return;
  }

  const deltaLastRow = row.width - halfWidth * (count + 1) - module.value.moduleThickness * count;

  if (row.fillings?.length)
    delete row.fillings

  // Обновляем высоту последней строки
  row.position.x = row.position.x - (row.width / 2 - halfWidth / 2)
  row.width = halfWidth;

  // Добавляем новую строку в эту колонку
  for (let i = 0; i < count; i++) {
    let newRow = <GridCellsRow>{
      ...row,
      number: row.number + 1 + i,
      position: new THREE.Vector2(row.position.x + (row.width / 2 + module.value.moduleThickness + halfWidth / 2) * (i + 1), row.position.y),
      fillings: [],
    }

    if(i === count - 1) {
      newRow.width += deltaLastRow;
    }

    cell.cellsRows.splice(rowIndex + 1 + i, 0, newRow);
  }

  // Обновляем рендер
  visualizationRef.value.renderGrid();
};

const addRowExtra = (secIndex, cellIndex, rowIndex, extraIndex = 0, _count = 1) => {
  const count = parseInt(_count)
  selectCell(secIndex, cellIndex, rowIndex);

  let section = module.value.sections[secIndex];
  let cell = section.cells[cellIndex];
  let row = cell.cellsRows[rowIndex]

  let extra;
  if (row.extras?.length > 0) {
    extra = row.extras[extraIndex]
  } else {
    row.extras = <GridRowExtra>[];
    extra = <GridRowExtra>{
      number: 1,
      width: row.width,
      height: row.height,
      type: "rowExtra",
      position: new THREE.Vector2(row.position.x, row.position.y),
    };

    if (row.fillings?.length) {
      delete row.fillings
    }

    if(row.hiTechProfiles) {
      delete row.hiTechProfiles
      updateFasades();
    }

    row.extras.push(extra);
  }

  const halfHeight = Math.floor((extra.height - module.value.moduleThickness * count) / (count + 1));

  if (halfHeight < MIN_SECTION_HEIGHT) {
    alert("Расстояние между полками слишком мало! Пожалуйста, выберите меньшее количество полок!");
    return;
  }

  const deltaLastCell = extra.height - halfHeight * (count + 1) - module.value.moduleThickness * count;

  // Обновляем высоту последней строки
  extra.height = halfHeight;

  if (extra.fillings)
    extra.fillings.length = 0

  // Добавляем новую строку в эту колонку
  for (let i = 0; i < count; i++) {

    let newExtra = <GridRowExtra>{
      ...extra,
      number: extra.number + 1 + i,
      position: new THREE.Vector2(extra.position.x, extra.position.y + (halfHeight + module.value.moduleThickness) * (i + 1)),
      fillings: [],
      //fillings: newFillings,
    }

    delete newExtra.hiTechProfiles

    if(deltaLastCell && i === count - 1) {
      newExtra.height += deltaLastCell;
    }

    row.extras.splice(extraIndex || 0, 0, newExtra);
  }

  calcLoops(secIndex);

  // Обновляем рендер
  visualizationRef.value.renderGrid();
};

const updateSectionWidth = (value, secIndex) => {
  if (timerReset.value) {
    clearTimeout(timerReset.value)
  }

  const newValue = parseInt(value);
  let adjustedValue;

  // Обновляем выбранную секцию для визуального отображения
  selectCell(secIndex, null);

  if (!isNaN(newValue) && visualizationRef.value) {
    adjustedValue = visualizationRef.value.adjustSizeFromExternal({
      dimension: "width",
      value: newValue,
      sec: secIndex,
    });
  }
  // Обновляем значение в module для синхронизации
  //const clone = Object.assign({}, module.value);
  let section = module.value.sections[secIndex]

  if (adjustedValue) {
    let next = module.value.sections[secIndex + 1]
    let prev = module.value.sections[secIndex - 1]

    let nextSection = next || prev

    let delta1 = section.width - adjustedValue
    let deltaPos1 = next ? -delta1 / 2 : delta1 / 2
    section.width = adjustedValue;
    section.position.x += deltaPos1

    section.cells.forEach((cell) => {
      cell.width = adjustedValue;
      cell.position.x = section.position.x

      if (cell.cellsRows?.length) {
        let divideDelta = Math.floor(-delta1 / cell.cellsRows.length)
        let divideDeltaPos1 = next ? divideDelta / 2 : -divideDelta / 2
        let extraSize = (cell.cellsRows.length - 1) * module.value.moduleThickness

        cell.cellsRows.forEach(item => {
          if(item.width + divideDelta >= MIN_SECTION_WIDTH) {
            item.width += divideDelta
            item.position.x += divideDeltaPos1

            item.extras?.forEach(extra => {
              extra.width = item.width
              extra.position.x = item.position.x

              if(extra.fillings?.length) {
                extra.fillings.forEach((filling) => {
                  if(filling.isVerticalItem) {
                    filling.position.x += divideDeltaPos1;
                  }
                  {
                    filling.width = extra.width;
                    filling.size.x = filling.width;
                    filling.position.x += item.position.x - item.width / 2;
                  }
                })
              }
            })

            if(item.fillings?.length) {
              item.fillings.forEach((filling) => {
                if(filling.isVerticalItem) {
                  filling.position.x += divideDeltaPos1;
                }
                else {
                  filling.width = item.width;
                  filling.size.x = filling.width;
                  filling.position.x = item.position.x - item.width / 2;
                }
              })
            }
          }
          else {
            item.width = MIN_SECTION_WIDTH
          }

          extraSize += item.width
        } )

        let lastRow = next ? cell.cellsRows[cell.cellsRows.length - 1] : cell.cellsRows[0]
        if(lastRow.width + (adjustedValue - extraSize) >= MIN_SECTION_WIDTH) {
          lastRow.width += (adjustedValue - extraSize)
          lastRow.position.x += (adjustedValue - extraSize) / 2

          lastRow.fillings?.forEach((filling) => {
            if(filling.isVerticalItem) {
              filling.position.x += (adjustedValue - extraSize) / 2;
            }
            else {
              filling.width = lastRow.width;
              filling.size.x = filling.width;
              filling.position.x = lastRow.position.x - lastRow.width / 2;
            }
          })

          lastRow.extras?.forEach(extra => {
            extra.width = lastRow.width
            extra.position.x = lastRow.position.x

            extra.fillings?.forEach((filling) => {
              if(filling.isVerticalItem) {
                filling.position.x += (adjustedValue - extraSize) / 2;
              }
              else {
                filling.width = extra.width;
                filling.size.x = filling.width;
                filling.position.x = extra.position.x - extra.width / 2;
              }
            })
          })
        }
        else {
          lastRow = cell.cellsRows.find((item) => {
            return item.width + (adjustedValue - extraSize) >= MIN_SECTION_WIDTH
          })

          if(lastRow) {
            lastRow.width += (adjustedValue - extraSize)
            lastRow.position.x += (adjustedValue - extraSize) / 2

            lastRow.fillings?.forEach((filling) => {
              if(filling.isVerticalItem) {
                filling.position.x += (adjustedValue - extraSize) / 2;
              }
              else {
                filling.width = lastRow.width;
                filling.size.x = filling.width;
                filling.position.x = lastRow.position.x - lastRow.width / 2;
              }
            })

            lastRow.extras?.forEach(extra => {
              extra.width = lastRow.width
              extra.position.x = lastRow.position.x

              extra.fillings?.forEach((filling) => {
                if(filling.isVerticalItem) {
                  filling.position.x += (adjustedValue - extraSize) / 2;
                }
                else {
                  filling.width = extra.width;
                  filling.size.x = filling.width;
                  filling.position.x = extra.position.x - extra.width / 2;
                }
              })
            })
          }

        }
      }

      if(cell.fillings?.length) {
        cell.fillings.forEach((filling) => {
          if(filling.isVerticalItem) {
            filling.position.x += deltaPos1;
          }
          else {
            filling.width = cell.width;
            filling.size.x = filling.width;
            filling.position.x = cell.position.x - cell.width / 2;
          }
        })
      }
    })

    if(section.fillings?.length) {
      section.fillings.forEach((filling) => {
        if(filling.isVerticalItem) {
          filling.position.x += deltaPos1;
        }
        else {
          filling.width = section.width;
          filling.size.x = filling.width;
          filling.position.x = section.position.x - section.width / 2;
        }
      })
    }

    let newRightWidth = nextSection.width - (-delta1)
    let delta2 = nextSection.width - newRightWidth

    nextSection.width = newRightWidth;
    nextSection.position.x += deltaPos1;

    nextSection.cells.forEach((cell) => {
      cell.width = nextSection.width;
      cell.position.x = nextSection.position.x;

      if (cell.cellsRows?.length) {
        let divideDelta = Math.floor(-delta2 / cell.cellsRows.length)
        let divideDeltaPos = next ? -divideDelta / 2 : divideDelta / 2
        let extraSize = (cell.cellsRows.length - 1) * module.value.moduleThickness

        cell.cellsRows.forEach(item => {
          if(item.width + divideDelta >= MIN_SECTION_WIDTH) {
            item.width += divideDelta
            item.position.x += divideDeltaPos

            item.extras?.forEach(extra => {
              extra.width = item.width
              extra.position.x = item.position.x

              if(extra.fillings?.length) {
                extra.fillings.forEach((filling) => {
                  if(filling.isVerticalItem) {
                    filling.position.x += divideDeltaPos;
                  }
                  else {
                    filling.width = extra.width;
                    filling.size.x = filling.width;
                    filling.position.x += deltaPos1;
                  }
                })
              }

            })

            if(item.fillings?.length) {
              item.fillings.forEach((filling) => {
                if(filling.isVerticalItem) {
                  filling.position.x += divideDeltaPos;
                }
                else {
                  filling.width = item.width;
                  filling.size.x = filling.width;
                  filling.position.x = deltaPos1;
                }
              })
            }
          }
          else {
            item.width = MIN_SECTION_WIDTH
          }


          extraSize += item.width

        })

        let lastRow = next ? cell.cellsRows[0] : cell.cellsRows[cell.cellsRows.length - 1]
        if(lastRow.width + (newRightWidth - extraSize) >= MIN_SECTION_WIDTH) {
          lastRow.width += (newRightWidth - extraSize)
          lastRow.position.x += (newRightWidth - extraSize) / 2

          lastRow.fillings?.forEach((filling) => {
            if(filling.isVerticalItem) {
              filling.position.x += (newRightWidth - extraSize) / 2;
            }
            else {
              filling.width = lastRow.width;
              filling.size.x = filling.width;
              filling.position.x = lastRow.position.x - lastRow.width / 2;
            }
          })

          lastRow.extras?.forEach(extra => {
            extra.width = lastRow.width
            extra.position.x = lastRow.position.x

            extra.fillings?.forEach((filling) => {
              if(filling.isVerticalItem) {
                filling.position.x += (newRightWidth - extraSize) / 2;
              }
              else {
                filling.width = extra.width;
                filling.size.x = filling.width;
                filling.position.x = extra.position.x - extra.width / 2;
              }
            })
          })
        }
        else {
          lastRow = cell.cellsRows.find((item) => {
            return item.width + (newRightWidth - extraSize) >= MIN_SECTION_WIDTH
          })

          if(lastRow) {
            lastRow.width += (newRightWidth - extraSize)
            lastRow.position.x += (newRightWidth - extraSize) / 2
            lastRow.extras?.forEach(extra => {
              extra.width = lastRow.width
              extra.position.x = lastRow.position.x

              lastRow.fillings?.forEach((filling) => {
                if(filling.isVerticalItem) {
                  filling.position.x += (newRightWidth - extraSize) / 2;
                }
                else {
                  filling.width = lastRow.width;
                  filling.size.x = filling.width;
                  filling.position.x = lastRow.position.x - lastRow.width / 2;
                }
              })

              extra.fillings?.forEach((filling) => {
                if(filling.isVerticalItem) {
                  filling.position.x += (newRightWidth - extraSize) / 2;
                }
                else {
                  filling.width = extra.width;
                  filling.size.x = filling.width;
                  filling.position.x = extra.position.x - extra.width / 2;
                }
              })
            })
          }

        }
      }

      if(cell.fillings?.length) {
        cell.fillings.forEach((filling) => {
          if(filling.isVerticalItem) {
            filling.position.x += deltaPos1;
          }
          else {
            filling.width = cell.width;
            filling.size.x = filling.width;
            filling.position.x = cell.position.x - cell.width / 2;
          }
        })
      }
    })


    if(nextSection.fillings?.length) {
      nextSection.fillings.forEach((filling) => {
        if(filling.isVerticalItem) {
          filling.position.x += deltaPos1;
        }
        else {
          filling.width = nextSection.width;
          filling.size.x = filling.width;
          filling.position.x = nextSection.position.x - nextSection.width / 2;
        }
      })
    }
  }
  //module.value = clone;

  timerReset.value = setTimeout(()=>{
    timerReset.value = false;
    reset()
  }, 100)
  //updateFasades();
  //calcLoops(secIndex);

  //visualizationRef.value.renderGrid();
};

const updateCellHeight = (value, secIndex, cellIndex) => {
  const newValue = parseInt(value);
  let adjustedValue;
  // Обновляем выбранную секцию для визуального отображения
  selectCell(secIndex, cellIndex);

  if (!isNaN(newValue) && visualizationRef.value) {
    adjustedValue = visualizationRef.value.adjustSizeFromExternal({
      dimension: "height",
      value: newValue,
      sec: secIndex,
      cell: cellIndex,
    });
  }
  // Обновляем значение в module для синхронизации
  const clone = Object.assign({}, module.value);
  let curSection = clone.sections[secIndex]

  if (adjustedValue) {
    let cell = curSection.cells[cellIndex]
    let prev = curSection.cells[cellIndex - 1];
    let next = curSection.cells[cellIndex + 1]

    let nextCell = next || prev
    let nextIndex = next ? cellIndex + 1 : cellIndex - 1

    let delta1 = cell.height - adjustedValue
    cell.height = adjustedValue
    cell.position.y += delta1;

    if (cell.cellsRows?.length) {
      cell.cellsRows.forEach((row) => {
        row.height = cell.height;
        row.position.y = cell.position.y;

        if(row.fillings?.length) {
          row.fillings.forEach((filling) => {
            if(filling.isVerticalItem) {
              filling.position.y = row.position.y;
              filling.height = row.height;
              filling.size.y = filling.height;
              filling.distances.bottom = 0;
              filling.distances.top = 0;
            }
          })
        }

        if (row.extras?.length) {
          let divideDelta = Math.floor(-delta1 / row.extras.length)
          let divideDeltaPos1 = divideDelta
          let extraSize = (row.extras.length - 1) * module.value.moduleThickness

          row.extras.forEach(item => {
            if (item.height + divideDelta >= MIN_SECTION_HEIGHT) {
              item.height += divideDelta

              if(item.fillings?.length) {
                item.fillings.forEach((filling) => {
                  if(filling.isVerticalItem) {
                    filling.position.y = item.position.y;
                    filling.height = item.height;
                    filling.size.y = filling.height;
                    filling.distances.bottom = 0;
                    filling.distances.top = 0;
                  }
                  else {
                    filling.position.y += divideDeltaPos1;
                  }
                })
              }
            }
            else {
              item.height = MIN_SECTION_HEIGHT
            }


            extraSize += item.height

            item.fillings?.filter((filling, index) => {
              return filling.position.y + filling.height <= item.position.y + item.height;
            })
          })

          let lastRow = row.extras[row.extras.length - 1]
          if(lastRow.height + (adjustedValue - extraSize) >= MIN_SECTION_HEIGHT) {
            lastRow.height += (adjustedValue - extraSize)
            lastRow.position.y += (adjustedValue - extraSize) / 2

            if(lastRow.fillings?.length) {
              lastRow.fillings.forEach((filling) => {
                if(filling.isVerticalItem) {
                  filling.position.y = lastRow.position.y;
                  filling.height = lastRow.height;
                  filling.size.y = filling.height;
                  filling.distances.bottom = 0;
                  filling.distances.top = 0;
                }
                else {
                  filling.position.y += (newTopHeight - extraSize) / 2;
                }
              })
            }
          }
          else {
            lastRow = row.extras.find((item) => {
              return item.height + (adjustedValue - extraSize) >= MIN_SECTION_HEIGHT
            })

            if(lastRow) {
              lastRow.height += (adjustedValue - extraSize)
              lastRow.position.y += (adjustedValue - extraSize) / 2

              if(lastRow.fillings?.length) {
                lastRow.fillings.forEach((filling) => {
                  if(filling.isVerticalItem) {
                    filling.position.y = lastRow.position.y;
                    filling.height = lastRow.height;
                    filling.size.y = filling.height;
                    filling.distances.bottom = 0;
                    filling.distances.top = 0;
                  }
                  else {
                    filling.position.y += (newTopHeight - extraSize) / 2;
                  }
                })
              }
            }

          }
        }

        row.fillings?.filter((filling, index) => {
          return filling.position.y + filling.height <= row.position.y + row.height;
        })
      })
    }

    if(cell.fillings?.length) {
      cell.fillings.forEach((filling) => {
        if(filling.isVerticalItem) {
          filling.position.y = cell.position.y;
          filling.height = cell.height;
          filling.size.y = filling.height;
          filling.distances.bottom = 0;
          filling.distances.top = 0;
        }
      })
    }

    /*cell.fillings?.filter((filling, index) => {
      if (filling.position.y + filling.height <= cell.position.y - module.value.moduleThickness) {
        if (nextCell) {
          filling.cell = nextIndex
          nextCell.push(filling);
        }
        return false
      } else if (filling.position.y >= cell.position.y + cell.height + module.value.moduleThickness) {
        if (nextCell) {
          filling.cell = nextIndex
          nextCell.push(filling);
        }
        return false
      } else
        return true
    })*/

    let newBottomHeight = nextCell.height - (-delta1)
    let delta2 = nextCell.height - newBottomHeight
    nextCell.height = newBottomHeight;

    if (nextCell.cellsRows) {
      nextCell.cellsRows.forEach((row) => {
        row.height = nextCell.height;
        row.position.y = nextCell.position.y;

        if(row.fillings?.length) {
          row.fillings.forEach((filling) => {
            if(filling.isVerticalItem) {
              filling.position.y = row.position.y;
              filling.height = row.height;
              filling.size.y = filling.height;
              filling.distances.bottom = 0;
              filling.distances.top = 0;
            }
          })
        }

        if (row.extras?.length) {
          let divideDelta = Math.floor(-delta2 / row.extras.length)
          let divideDeltaPos2 = -divideDelta
          let extraSize = (row.extras.length - 1) * module.value.moduleThickness

          row.extras.forEach(item => {
            if (item.height + divideDelta >= MIN_SECTION_HEIGHT) {
              item.height += divideDelta
              item.position.y += divideDelta;

              if(item.fillings?.length) {
                item.fillings.forEach((filling) => {
                  if(filling.isVerticalItem) {
                    filling.position.y = item.position.y;
                    filling.height = item.height;
                    filling.size.y = filling.height;
                    filling.distances.bottom = 0;
                    filling.distances.top = 0;
                  }
                  else {
                    filling.position.y += divideDeltaPos2;
                  }
                })
              }
            }
            else {
              item.height = MIN_SECTION_HEIGHT
            }

            extraSize += item.height

            item.fillings?.filter((filling, index) => {
              return filling.position.y + filling.height <= item.position.y + item.height;
            })
          })

          let lastRow = row.extras[0]
          if(lastRow.height + (newBottomHeight - extraSize) >= MIN_SECTION_HEIGHT) {
            lastRow.height += (newBottomHeight - extraSize)
            lastRow.position.y += (newBottomHeight - extraSize) / 2

            if(lastRow.fillings?.length) {
              lastRow.fillings.forEach((filling) => {
                if(filling.isVerticalItem) {
                  filling.position.y = lastRow.position.y;
                  filling.height = lastRow.height;
                  filling.size.y = filling.height;
                  filling.distances.bottom = 0;
                  filling.distances.top = 0;
                }
                else {
                  filling.position.y += (newBottomHeight - extraSize) / 2;
                }
              })
            }
          }
          else {
            lastRow = row.extras.find((item) => {
              return item.height + (newBottomHeight - extraSize) >= MIN_SECTION_HEIGHT
            })

            if(lastRow) {
              lastRow.height += (newBottomHeight - extraSize)
              lastRow.position.y += (newBottomHeight - extraSize) / 2

              if(lastRow.fillings?.length) {
                lastRow.fillings.forEach((filling) => {
                  if(filling.isVerticalItem) {
                    filling.position.y = lastRow.position.y;
                    filling.height = lastRow.height;
                    filling.size.y = filling.height;
                    filling.distances.bottom = 0;
                    filling.distances.top = 0;
                  }
                  else {
                    filling.position.y += (newBottomHeight - extraSize) / 2;
                  }
                })
              }
            }

          }
        }

        row.fillings?.filter((filling, index) => {
          return filling.position.y + filling.height <= row.position.y + row.height;
        })
      })
    }

    if(nextCell.fillings?.length) {
      nextCell.fillings.forEach((filling) => {
        if(filling.isVerticalItem) {
          filling.position.y = nextCell.position.y;
          filling.height = nextCell.height;
          filling.size.y = filling.height;
          filling.distances.bottom = 0;
          filling.distances.top = 0;
        }
      })
    }

    /*nextCell.fillings?.filter((filling, index) => {
      if (filling.position.y + filling.height <= nextCell.position.y - module.value.moduleThickness) {
        filling.cell = cellIndex
        cell.push(filling);
        return false
      } else if (filling.position.y >= nextCell.position.y + nextCell.height + module.value.moduleThickness) {
        filling.cell = cellIndex
        cell.push(filling);
        return false
      } else
        return true
    })*/
  }
  module.value = clone;
  reset()

  //calcLoops(secIndex);

  //visualizationRef.value.renderGrid();
};

const updateCellRowWidth = (value, secIndex, cellIndex, rowIndex) => {
  const newValue = parseInt(value);
  let adjustedValue;

  // Обновляем выбранную секцию для визуального отображения
  selectCell(secIndex, cellIndex, rowIndex);

  if (!isNaN(newValue) && visualizationRef.value) {
    adjustedValue = visualizationRef.value.adjustSizeFromExternal({
      dimension: "width",
      value: newValue,
      sec: secIndex,
      cell: cellIndex,
      row: rowIndex,
    });
  }
  // Обновляем значение в module для синхронизации
  const clone = Object.assign({}, module.value);
  if (adjustedValue) {
    let curRow = clone.sections[secIndex].cells[cellIndex].cellsRows[rowIndex]
    let prevRow = clone.sections[secIndex].cells[cellIndex].cellsRows[rowIndex - 1];
    let nextRow = clone.sections[secIndex].cells[cellIndex].cellsRows[rowIndex + 1];
    let delta = curRow.width - adjustedValue

    curRow.width = adjustedValue
    curRow.position.x -= delta / 2

    if (curRow.extras?.length) {
      curRow.extras.forEach(extra => {
        extra.width = curRow.width
        extra.position.x = curRow.position.x
      })
    }

    if (nextRow) {
      nextRow.width += delta
      nextRow.position.x -= delta / 2

      if (nextRow.extras?.length) {
        nextRow.extras.forEach(extra => {
          extra.width = nextRow.width
          extra.position.x = nextRow.position.x
        })
      }
    }
    else if(prevRow) {
      prevRow.width += delta
      prevRow.position.x += delta / 2

      if (prevRow.extras?.length) {
        prevRow.extras.forEach(extra => {
          extra.width = prevRow.width
          extra.position.x = prevRow.position.x
        })
      }
    }
  }
  module.value = clone;
  reset()

  //visualizationRef.value.renderGrid();

};

const updateExtraHeight = (value, secIndex, cellIndex, rowIndex, extraIndex) => {
  const newValue = parseInt(value);
  let adjustedValue;
  // Обновляем выбранную секцию для визуального отображения
  selectCell(secIndex, cellIndex, rowIndex, extraIndex);

  if (!isNaN(newValue) && visualizationRef.value) {
    adjustedValue = visualizationRef.value.adjustSizeFromExternal({
      dimension: "height",
      value: newValue,
      sec: secIndex,
      cell: cellIndex,
      row: rowIndex,
      extra: extraIndex,
    });
  }
  // Обновляем значение в module для синхронизации
  const clone = Object.assign({}, module.value);
  let curSection = clone.sections[secIndex]
  let curCell = curSection.cells[cellIndex]
  let curRow = curCell.cellsRows[rowIndex]

  if (adjustedValue) {
    let curExtra = curRow.extras[extraIndex]
    let nextIndex = curRow.extras[extraIndex + 1] ? extraIndex + 1 : extraIndex - 1;
    let nextExtra = curRow.extras[nextIndex]
    let delta = curExtra.height - adjustedValue

    curExtra.height = adjustedValue

    if (nextExtra?.position?.y < curExtra.position.y)
      curExtra.position.y += delta

    if (nextExtra) {
      nextExtra.height += delta

      if (nextExtra.position.y > curExtra.position.y)
        nextExtra.position.y -= delta

      nextExtra.fillings?.filter((filling, index) => {
        if (filling.position.y + filling.height <= nextExtra.position.y - module.value.moduleThickness) {
          filling.extra = extraIndex
          curExtra.push(filling);
          return false
        } else if (filling.position.y >= nextExtra.position.y + nextExtra.height + module.value.moduleThickness) {
          filling.extra = extraIndex
          curExtra.push(filling);
          return false
        } else
          return true
      })
    }

    curExtra.fillings?.filter((filling, index) => {
      if (filling.position.y + filling.height <= curExtra.position.y - module.value.moduleThickness) {
        if (nextExtra) {
          filling.extra = nextIndex
          nextExtra.push(filling);
        }
        return false
      } else if (filling.position.y >= curExtra.position.y + curExtra.height + module.value.moduleThickness) {
        if (nextExtra) {
          filling.extra = nextIndex
          nextExtra.push(filling);
        }
        return false
      } else
        return true
    })
  }
  module.value = clone;
  reset()

  //calcLoops(secIndex);
  //visualizationRef.value.renderGrid();
};

const deleteSection = (secIndex) => {
  const current = module.value.sections[secIndex];
  const next = module.value.sections[secIndex + 1];
  const prev = module.value.sections[secIndex - 1];

  const combinedWidth = next
      ? current.width + next.width + module.value.moduleThickness
      : current.width + prev.width + module.value.moduleThickness;

  if (combinedWidth > MAX_SECTION_WIDTH) {
    alert("Суммарная ширина превышает допустимый предел! Уменьшите ширину!")
    return;
  }

  if (next) {
    next.position.x = current.position.x - current.width / 2 + combinedWidth / 2
    next.width = combinedWidth;
    next.cells?.forEach((elem) => {
      elem.position.x = next.position.x
      elem.width = combinedWidth;
      if (elem.cellsRows)
        delete elem.cellsRows
    });
  } else {
    prev.position.x = prev.position.x - prev.width / 2 + combinedWidth / 2
    prev.width = combinedWidth;
    prev.cells?.forEach((elem) => {
      elem.position.x = prev.position.x
      elem.width = combinedWidth;
      if (elem.cellsRows)
        delete elem.cellsRows
    });
  }

  calcLoops(next ? secIndex + 1 : secIndex - 1);
  if (module.value.sections.length > 1) {
    module.value.sections.splice(secIndex, 1);
  }

  selectedCell.value.cell = 0;
  selectedCell.value.sec = 0;

  reset()
  //updateFasades();
  //visualizationRef.value.renderGrid();
};

const deleteCell = (cellIndex, secIndex) => {
  const clone = Object.assign({}, module.value);
  const currentSection = clone.sections[secIndex];
  const currentCell = currentSection.cells[cellIndex];

  const next = currentSection.cells[cellIndex + 1];
  const prev = currentSection.cells[cellIndex - 1];

  const combinedHeight = next
      ? currentCell.height + next.height
      : currentCell.height + prev.height;

  next ? (next.height = combinedHeight) : (prev.height = combinedHeight);

  if (currentCell.fillings?.length) {
    let newFillings = next || prev

    if (!newFillings.fillings)
      newFillings.fillings = []

    let startIndex = newFillings.fillings.length
    currentCell.fillings.forEach((filling) => {
      filling.id = startIndex
      filling.cell = next ? cellIndex + 1 : cellIndex - 1
      startIndex += 1
    })
    newFillings.push(...currentCell.fillings)
  }

  if (currentSection.cells.length > 1) {
    currentSection.cells.splice(cellIndex, 1);
  }

  if (currentSection.cells.length <= 1)
    currentSection.cells.length = 0

  module.value = clone;
  calcLoops(secIndex);

  // Обновляем текущий сектор
  selectedCell.value.cell = 0;
  selectedCell.value.sec = secIndex;

  visualizationRef.value.renderGrid();
};

const deleteRowCell = (cellIndex, secIndex, rowIndex) => {
  const clone = Object.assign({}, module.value);
  const currentSection = clone.sections[secIndex];
  const currentCell = currentSection.cells[cellIndex];
  const currentRow = currentCell.cellsRows[rowIndex];

  const next = currentCell.cellsRows[rowIndex + 1];
  const prev = currentCell.cellsRows[rowIndex - 1];

  const combinedWidth = next
      ? currentCell.width + next.width
      : currentCell.width + prev.width;


  next ? (next.position.x = next.position.x - next.width / 2 + combinedWidth / 2) : (prev.position.x = prev.position.x - prev.width / 2 + combinedWidth / 2);
  next ? (next.width = combinedWidth) : (prev.width = combinedWidth);

  if (currentCell.cellsRows.length > 1) {
    currentCell.cellsRows.splice(rowIndex, 1);
  }

  next ? (delete next.fillings) : (delete prev.fillings);

  if (currentCell.cellsRows.length <= 1)
    delete currentCell.cellsRows

  module.value = clone;

  // Обновляем текущий сектор
  selectedCell.value.cell = cellIndex;
  selectedCell.value.sec = secIndex;
  selectedCell.value.row = null;

  visualizationRef.value.renderGrid();
}

const deleteRowExtra = (cellIndex, secIndex, rowIndex, extraIndex) => {
  const clone = Object.assign({}, module.value);
  const currentSection = clone.sections[secIndex];
  const currentCell = currentSection.cells[cellIndex];
  const currentRow = currentCell.cellsRows[rowIndex];
  const currentExtra = currentRow.extras[extraIndex];

  const next = currentRow.extras[extraIndex + 1];
  const prev = currentRow.extras[extraIndex - 1];

  const combinedHeight = next
      ? currentExtra.height + next.height + module.value.moduleThickness
      : currentExtra.height + prev.height + module.value.moduleThickness;

  next ? (next.position.y = next.position.y - next.height / 2 + combinedHeight / 2) : (prev.position.y = prev.position.y - prev.height / 2 + combinedHeight / 2);
  next ? (next.height = combinedHeight) : (prev.height = combinedHeight);

  if (currentRow.extras.length > 1) {
    currentRow.extras.splice(extraIndex, 1);
  }

  next ? (delete next.fillings) : (delete prev.fillings);

  if (currentRow.extras.length <= 1)
    delete currentRow.extras

  module.value = clone;

  // Обновляем текущий сектор
  selectedCell.value.cell = cellIndex;
  selectedCell.value.sec = secIndex;
  selectedCell.value.row = rowIndex;

  visualizationRef.value.renderGrid();
};

defineExpose({
  handleCellSelect,
  addSection,
  deleteSection,
  updateSectionWidth
});

onMounted(() => {
  let cellIndex = module.value.sections[0].cell?.[0] ? 0 : null
  let rowIndex = module.value.sections[0].cell?.[0]?.cellsRows?.[0] ? 0 : null

  if(visualizationRef.value)
    selectCell(0, cellIndex, rowIndex)
})

</script>

<template>
  <div class="splitter-sections-container--product">
    <div class="splitter-sections-container--product-data" v-if="module">
      <section class="actions-sections-wrapper">

        <div class="actions-sections-header">
          <div
              :class="[
              'actions-sections-header--container',
              { active: secIndex === selectedCell.sec },
            ]"
              v-for="(section, secIndex) in module.sections"
              :key="secIndex"
              :id="`module_${secIndex}`"
          >
            <button
                v-if="module.sections.length > 1"
                class="actions-sections-btn actions-sections-icon"
                @click="deleteSection(secIndex)"
            >
              <img
                  class="actions-sections-icon--delete"
                  src="/icons/delite.svg"
                  alt=""
              />
            </button>
            <p
                class="actions-sections-title actions-sections-title--part"
                @click="showCurrentCol(secIndex)"
            >
              {{ secIndex + 1 }}
            </p>
          </div>
        </div>

        <div
            class="actions-sections-container"
            v-for="(section, secIndex) in module.sections"
            :key="secIndex"
        >
          <div
              class="actions-sections-items--wrapper"
              v-if="selectedCell.sec === secIndex"
          >
            <div class="accordion-sections" v-if="section.cells.length">

              <div class="actions-sections-header">
                <p>Ячейки</p>
              </div>

              <div
                  v-for="(cell, cellIndex) in section.cells"
                  :key="cellIndex"
                  :class="'actions-sections-items--container'"
                  :id="`module_${secIndex}_${cellIndex}`"
              >
                <details
                    class="item-group"
                    :open="cellIndex === selectedCell.cell"
                >

                  <summary>
                    <h3 class="item-group__title">
                      {{ secIndex + 1 }}.{{ cellIndex + 1 }}
                    </h3>
                  </summary>


                  <div
                      :class="'actions-sections-items--container'"
                  >
                    <article class="actions-sections-items actions-sections-items--left">
                      <div class="actions-sections-items--left-wrapper">

                        <div class="actions-sections-items--width">
                          <div class="actions-sections-inputs">
                            <p class="actions-sections-title">Ширина</p>
                            <div
                                :class="['actions-sections-input--container']"
                            >
                              <input
                                  type="number"
                                  :step="step"
                                  :min="MIN_SECTION_WIDTH"
                                  :max="MAX_SECTION_WIDTH"
                                  class="actions-sections-input"
                                  :value="section.width"
                                  :disabled="module.sections.length < 2"
                                  @input="
                                    debounce(() => updateSectionWidth(
                                      $event.target.value,
                                      secIndex
                                    ), 1000)
                                  "
                              />
                            </div>
                          </div>
                        </div>

                        <div class="actions-sections-items--height">
                          <div class="actions-sections-inputs">
                            <p class="actions-sections-title">
                              Высота
                            </p>
                            <div
                                :class="['actions-sections-input--container']"
                            >
                              <input
                                  type="number"
                                  :step="step"
                                  :min="MIN_SECTION_HEIGHT"
                                  :max="section.height - MIN_SECTION_HEIGHT"
                                  class="actions-sections-input"
                                  :value="cell.height"
                                  @input="
                            debounce(() => updateCellHeight(
                              $event.target.value,
                              secIndex,
                              cellIndex
                            ), 1000)
                          "
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    </article>

                    <article class="actions-sections-items actions-sections-items--right">
                      <div class="actions-sections-items--right-items">

                        <div
                            v-if="!cell.cellsRows?.length"
                            class="actions-sections-items--right-items-input-block"
                        >
                          <CounterInput
                              button-text="Добавить полку"
                              model-value="1"
                              max="10"
                              min="1"
                              input-class="actions-sections-items--right-items-input-block-counter"
                              button-class="actions-sections-btn actions-sections-btn--default actions-sections-items--right-items-input-block-button"
                              type="number"
                              @update:model-value="(count) => {
                            addCell(secIndex, cellIndex, count)
                          }"
                          />
                        </div>

                        <div
                            v-if="!cell.cellsRows?.length && !module.isRestrictedModule"
                            class="actions-sections-items--right-items-input-block"
                        >
                          <CounterInput
                              button-text="Верт. разделитель"
                              model-value="1"
                              max="10"
                              min="1"
                              input-class="actions-sections-items--right-items-input-block-counter"
                              button-class="actions-sections-btn actions-sections-btn--default actions-sections-items--right-items-input-block-button"
                              type="number"
                              @update:model-value="(count) => {
                                addRowCell(secIndex, cellIndex, 0, count)
                          }"
                          />
                        </div>

                        <button
                            v-if="section.cells.length > 1"
                            class="actions-sections-btn actions-sections-btn--default"
                            @click="deleteCell(cellIndex, secIndex)"
                        >
                          Удалить
                        </button>

                      </div>
                    </article>
                  </div>

                  <div class="accordion-sections" v-if="cell.cellsRows?.length">
                    <div class="actions-sections-header">
                      <p>Вертикальные ячейки</p>
                    </div>

                    <div
                        v-for="(row, rowIndex) in cell.cellsRows"
                        :key="rowIndex"
                        :class="'actions-sections-items--container'"
                        :id="`module_${secIndex}_${cellIndex}_${rowIndex}`"

                    >
                      <details
                          class="item-group"
                          :open="rowIndex === selectedCell.row"
                      >
                        <summary>
                          <h3 class="item-group__title">
                            {{ secIndex + 1 }}.{{ cellIndex + 1 }}.{{ rowIndex + 1 }}
                          </h3>
                        </summary>

                        <div
                            :class="'actions-sections-items--container'"
                        >
                          <article class="actions-sections-items actions-sections-items--left">
                            <div class="actions-sections-items--left-wrapper">

                              <div class="actions-sections-items--width">
                                <div class="actions-sections-inputs">
                                  <p class="actions-sections-title">Ширина</p>
                                  <div
                                      :class="['actions-sections-input--container']"
                                  >
                                    <input
                                        type="number"
                                        :step="step"
                                        :min="MIN_SECTION_WIDTH"
                                        :max="cell.width - MIN_SECTION_WIDTH"
                                        class="actions-sections-input"
                                        :value="row.width"
                                        @input="
                              debounce(() => updateCellRowWidth(
                                $event.target.value,
                                secIndex,
                                cellIndex,
                                rowIndex
                              ), 1000)
                            "
                                    />
                                  </div>
                                </div>
                              </div>

                            </div>
                          </article>

                          <article
                              v-if="!module.isRestrictedModule"
                              class="actions-sections-items actions-sections-items--right"
                          >
                            <div class="actions-sections-items--right-items">

                              <div
                                  class="actions-sections-items--right-items-input-block"
                              >
                                <CounterInput
                                    button-text="Верт. разделитель"
                                    model-value="1"
                                    max="10"
                                    min="1"
                                    input-class="actions-sections-items--right-items-input-block-counter"
                                    button-class="actions-sections-btn actions-sections-btn--default actions-sections-items--right-items-input-block-button"
                                    type="number"
                                    @update:model-value="(count) => {
                                          addRowCell(secIndex, cellIndex, rowIndex, count)
                                    }"
                                />
                              </div>

                              <div
                                  v-if="!row.extras?.length"
                                  class="actions-sections-items--right-items-input-block"
                              >
                                <CounterInput
                                    button-text="Полка"
                                    model-value="1"
                                    max="10"
                                    min="1"
                                    input-class="actions-sections-items--right-items-input-block-counter"
                                    button-class="actions-sections-btn actions-sections-btn--default actions-sections-items--right-items-input-block-button"
                                    type="number"
                                    @update:model-value="(count) => {
                                          addRowExtra(secIndex, cellIndex, rowIndex, 0, count)
                                    }"
                                />
                              </div>

                              <button
                                  v-if="cell.cellsRows.length > 1"
                                  class="actions-sections-btn actions-sections-btn--default"
                                  @click="deleteRowCell(cellIndex, secIndex, rowIndex)"
                              >
                                Удалить
                              </button>

                            </div>
                          </article>
                        </div>

                        <div class="accordion-sections" v-if="row.extras?.length">
                          <div class="actions-sections-header">
                            <p>Горизонтальные ячейки</p>
                          </div>

                          <div
                              v-for="(extra, extraIndex) in row.extras"
                              :key="extraIndex"
                              :class="'actions-sections-items--container'"
                              :id="`module_${secIndex}_${cellIndex}_${rowIndex}_${extraIndex}`"

                          >
                            <details
                                class="item-group"
                                :open="extraIndex === selectedCell.extra"
                            >
                              <summary>
                                <h3 class="item-group__title">
                                  {{ secIndex + 1 }}.{{ cellIndex + 1 }}.{{ rowIndex + 1 }}.{{ extraIndex + 1 }}
                                </h3>
                              </summary>

                              <div
                                  :class="'actions-sections-items--container'"
                              >
                                <article class="actions-sections-items actions-sections-items--left">
                                  <div class="actions-sections-items--left-wrapper">

                                    <div class="actions-sections-items--height">
                                      <div class="actions-sections-inputs">
                                        <p class="actions-sections-title">
                                          Высота
                                        </p>
                                        <div
                                            :class="['actions-sections-input--container']"
                                        >
                                          <input
                                              type="number"
                                              :step="step"
                                              :min="MIN_SECTION_HEIGHT"
                                              :max="row.height - MIN_SECTION_HEIGHT"
                                              class="actions-sections-input"
                                              :value="extra.height"
                                              @input="
                                                debounce(() => updateExtraHeight(
                                                  $event.target.value,
                                                  secIndex,
                                                  cellIndex,
                                                  rowIndex,
                                                  extraIndex
                                                ), 1000)
                                              "
                                          />
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                </article>

                                <article
                                    v-if="!module.isRestrictedModule"
                                    class="actions-sections-items actions-sections-items--right"
                                >
                                  <div class="actions-sections-items--right-items">

                                    <div
                                        class="actions-sections-items--right-items-input-block"
                                    >
                                      <CounterInput
                                          button-text="Полка"
                                          model-value="1"
                                          max="10"
                                          min="1"
                                          input-class="actions-sections-items--right-items-input-block-counter"
                                          button-class="actions-sections-btn actions-sections-btn--default actions-sections-items--right-items-input-block-button"
                                          type="number"
                                          @update:model-value="(count) => {
                                          addRowExtra(secIndex, cellIndex, rowIndex, extraIndex, count)
                                    }"
                                      />
                                    </div>

                                    <button
                                        v-if="cell.cellsRows.length > 1"
                                        class="actions-sections-btn actions-sections-btn--default"
                                        @click="deleteRowExtra(cellIndex, secIndex, rowIndex, extraIndex)"
                                    >
                                      Удалить
                                    </button>

                                  </div>
                                </article>
                              </div>



                            </details>
                          </div>
                        </div>


                      </details>
                    </div>
                  </div>

                </details>
              </div>
            </div>
            <div
                v-else
                :class="'actions-sections-items--container'"
            >
              <article class="actions-sections-items actions-sections-items--left">
                <div class="actions-sections-items--left-wrapper">

                  <div class="actions-sections-items--width">
                    <div class="actions-sections-inputs">
                      <p class="actions-sections-title">Ширина</p>
                      <div
                          :class="['actions-sections-input--container']"
                      >
                        <input
                            type="number"
                            :step="step"
                            :min="MIN_SECTION_WIDTH"
                            :max="MAX_SECTION_WIDTH"
                            class="actions-sections-input"
                            :value="section.width"
                            :disabled="module.sections.length < 2"
                            @input="
                            debounce(() => updateSectionWidth(
                              $event.target.value,
                              secIndex
                            ), 1000)
                          "
                        />
                      </div>
                    </div>
                  </div>

                  <div class="actions-sections-items--height">
                    <div class="actions-sections-inputs">
                      <p class="actions-sections-title">
                        Высота
                      </p>
                      <div
                          :class="['actions-sections-input--container']"
                      >
                        <input
                            type="number"
                            :step="step"
                            :min="MIN_SECTION_HEIGHT"
                            class="actions-sections-input"
                            :value="section.height"
                            disabled
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </article>

              <article class="actions-sections-items actions-sections-items--right">
                <div
                    class="actions-sections-items--right-items"
                    v-if="secIndex == selectedCell.sec"
                >

                  <div
                      v-if="!module.isHiTech && (!module.isRestrictedModule || (module.isRestrictedModule && module.sections.length < 2))"
                      class="actions-sections-items--right-items-input-block"
                  >
                      <CounterInput
                          button-text="Добавить секцию"
                          model-value="1"
                          max="10"
                          min="1"
                          input-class="actions-sections-items--right-items-input-block-counter"
                          button-class="actions-sections-btn actions-sections-btn--default actions-sections-items--right-items-input-block-button"
                          type="number"
                          @update:model-value="(count) => {
                            addSection(secIndex, count)
                          }"
                      />
                  </div>

                  <div
                      v-if="!section.cells.length"
                      class="actions-sections-items--right-items-input-block"
                  >
                    <CounterInput
                        button-text="Добавить полку"
                        model-value="1"
                        max="10"
                        min="1"
                        input-class="actions-sections-items--right-items-input-block-counter"
                        button-class="actions-sections-btn actions-sections-btn--default actions-sections-items--right-items-input-block-button"
                        type="number"
                        @update:model-value="(count) => {
                            addCell(secIndex, null, count)
                          }"
                    />
                  </div>

                </div>
              </article>
            </div>


          </div>


        </div>
      </section>
    </div>
  </div>
</template>

<style lang="scss">
.splitter-sections {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
  &-container {
    &--product {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      color: #a3a9b5;

      &-icon {
        cursor: pointer;
      }

      &-items {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      &-data {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;

        &::-webkit-scrollbar {
          width: 5px;
          /* Ширина скроллбара */
        }

        &::-webkit-scrollbar-button {
          display: none;
          /* Убираем стрелки */
        }

        &::-webkit-scrollbar-thumb {
          background: #888;
          /* Цвет ползунка */
          border-radius: 4px;
        }
      }

      &-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      &-options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #ecebf1;

        &--add {
          display: flex;
          gap: 5px;
          align-items: center;
        }
      }

      &-actions {
        display: flex;
        gap: 1rem;
      }

      &-position {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .item-group {
        display: flex;
        flex-direction: column;
        color: #a3a9b5;
        margin-right: 10px;
        scroll-behavior: smooth;

        &__title {
          font-size: 1.8rem;
          font-weight: 600;
        }

        &-color {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px;
          margin: 10px 0;
          border-radius: 15px;
          background-color: $bg;
          cursor: pointer;

          .item-group-name {
            display: flex;
            align-items: center;
            gap: 10px;

            .name__bg {
              max-width: 60px;
              max-height: 60px;
              border-radius: 15px;
            }

            .name__text {
              font-weight: 500;
            }
          }

          @media (hover: hover) {
            /* when hover is supported */
            &:hover {
              color: white;
              background-color: #da444c;
              border: 1px solid transparent;
            }
          }
        }
      }


    }
  }
}

.no-select {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
}

.actions-sections {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

  &-wrapper {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-right: 0.5rem;
    scroll-behavior: smooth;

  }

  &-footer {
    display: flex;
    justify-content: space-between;
    margin-top: auto;

    &--save {
      display: flex;
      gap: 1rem;
    }
  }

  &-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: scroll;
    scroll-behavior: smooth;

    padding-right: 0.5rem;
    max-height: 82vh;

    &::-webkit-scrollbar {
      width: 2px;
      /* Ширина скроллбара */
    }

    &::-webkit-scrollbar-button {
      display: none;
      /* Убираем стрелки */
    }

    &::-webkit-scrollbar-thumb {
      background: #888;
      /* Цвет ползунка */
      border-radius: 4px;
    }
  }

  &-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    width: 100%;
    padding: 1rem 0;
    border-bottom: 1px solid #ecebf1;
    border-top: 1px solid #ecebf1;

    &--container {
      display: flex;
      align-items: center;
      // gap: 0.5rem;
      padding-right: 0.5rem;
      border-right: 1px solid #ecebf1;
      border-bottom: 1px solid transparent;
      cursor: pointer;

      &.active {
        border-bottom: 1px solid #da444c;
      }
    }
  }

  &-items {
    display: flex;
    flex-wrap: wrap;
    // gap: 1rem;
    align-items: center;

    &--wrapper {
      display: flex;
      flex-direction: column;

      width: 100%;
      padding: 0 0 1rem 0;
    }

    &--container {
      display: flex;
      width: 100%;
      padding: 1rem 0;
      border-bottom: 1px solid #ecebf1;

      // &:first-child {
      //   padding-top: 0;
      // }

      &.active {
        background-color: #f1f1f5;
      }
    }

    &--left,
    &--right {
      width: 100%;
    }

    &--left {
      align-items: start;
      max-width: 50%;

      &-wrapper {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-left: 0rem;
        // max-width: calc(50% - 1rem);
      }
    }

    &--right {
      max-width: calc(62% - 1rem);
      margin-left: 1rem;

      &-items {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;

        &-input-block {
          display: flex;
          flex-direction: row;
          gap: 5px;

          &-counter,
          &-button {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
          }

          &-button {
            margin-left: 5px;
          }

          &-counter{
            width: 45px;
            padding-left: 10px;
          }

        }

      }
    }

    &--height,
    &--diametr,
    &--width {
      display: flex;
      width: fit-content;

      &-item {
        display: flex;
        align-items: flex-start;
        height: fit-content;
        // gap: 0.5rem;
      }
    }

    &--title {
      display: flex;
      align-items: center;
      align-self: end;
      margin-bottom: 0.5rem;

      -webkit-user-select: none; /* Safari */
      -ms-user-select: none;     /* IE 10+ и Edge */
      user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
    }
  }

  &-title {
    font-size: 1rem;
    color: #a3a9b5;

    -webkit-user-select: none; /* Safari */
    -ms-user-select: none;     /* IE 10+ и Edge */
    user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */
  }

  &-inputs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    max-width: 100px;
  }

  &-input {
    padding: 0.5rem 1rem;
    width: 100%;
    max-width: 125px;
    border: none;
    border-radius: 15px;
    background-color: #ecebf1;
    color: #6d6e73;
    font-size: 1rem;
    font-weight: 600;

    &:focus {
      outline: none;
    }

    &--container {
      position: relative;

      &::before {
        content: "mm";
        display: block;
        position: absolute;
        top: 50%;
        left: 60px;
        transform: translate(0, -50%);
        pointer-events: none;
        z-index: 0;
        font-size: 0.8rem;
        font-weight: 600;
        color: #6d6e73;
      }
    }
  }

  &-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ecebf1;
    border-radius: 15px;
    background-color: #ffffff;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: bold;
    color: #a3a9b5;
    outline: none;

    -webkit-user-select: none; /* Safari */
    -ms-user-select: none;     /* IE 10+ и Edge */
    user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

    &--default,
    &--footer {
      transition-property: background-color, color, border;
      transition-timing-function: ease;
      transition-duration: 0.25s;
      @media (hover: hover) {
        /* when hover is supported */
        &:hover {
          color: white;
          background-color: #da444c;
          border: 1px solid transparent;
        }
      }
    }

    &--footer {
      background-color: #ecebf1;
    }

    &:focus {
      outline: none;
    }

    &.acthnive {
      border-color: #da444c;
      color: #181818;
      transition-property: background-color, color, border;
      transition-timing-function: ease;
      transition-duration: 0.25s;

      @media (hover: hover) {
        /* when hover is supported */
        &:hover {
          color: white;
          background-color: #da444c;
        }
      }
    }
  }

  &-icon {
    border: none;
    background-color: transparent;
    padding: 0 5px;

    &--delite,
    &--close,
    &--help {
      width: 18px;
      height: 18px;
    }

    &--add {
      width: 12px;
      height: 12px;
    }

    &--delite {
      &-center {
        margin-bottom: 0.5rem;
      }
    }

    &--bottom {
      align-self: flex-end;
      padding: 5px;
    }

    &--position {
      width: 25px;
      height: 25px;
    }
  }
}

.accordion-sections {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none;     /* IE 10+ и Edge */
  user-select: none;         /* Стандарт: Chrome, Firefox, Opera, Edge */

  details {
    position: relative;
    margin: 16px 0;
    padding: 15px 10px 15px 15px;
    border: 1px solid #a3a9b5;
    border-radius: 15px;
    @media (hover: hover) {
      /* when hover is supported */
      &:hover {
        border-color: #da444c;
      }
    }
  }

  details summary {
    font-weight: bold;
    list-style: none;
    cursor: pointer;
    width: 60px;
  }

  details[open] {
    border-color: #da444c;

  }

  details summary::-webkit-details-marker {
    display: none;
  }

  details summary::before {
    content: "\276F";
    position: absolute;
    right: 1rem;
    top: 1rem;
    display: inline-block;
    transform: rotate(90deg);
    transition: transform 0.2s ease-in-out;
  }

  details[open] summary::before {
    transform: rotate(-90deg);
  }
}

.width {
  &-max {
    max-width: 100% !important;
  }
}

</style>
