//@ts-nocheck
import { IBasket, IBasketFacade } from "@/types/basket";
import { useAppData } from "@/store/appliction/useAppData"


const appDataStore = useAppData()

// console.log('appDataStore.getAppData', appDataStore.getAppData)

function createFacadeProps(objProps: any): IBasketFacade[] {
  return objProps.CONFIG.FASADE_PROPS
    ? objProps.CONFIG.FASADE_PROPS.map((fp: any, index: number) => {
      const facade = objProps.FASADE[index];
      const trueSize = facade?.object?.userData?.trueSize;

      const result: any = {};

      // Добавляем свойства только если они имеют значения
      if (fp.COLOR != null) result.COLOR = fp.COLOR;
      if (fp.MILLING != null) result.MILLING = fp.MILLING;
      if (fp.PALETTE != null) result.PALETTE = fp.PALETTE;
      if (fp.SHOWCASE != null) result.SHOWCASE = fp.SHOWCASE;
      if (fp.ALUM != null) result.ALUM = fp.ALUM;
      if (fp.GLASS != null) result.GLASS = fp.GLASS;
      if (fp.PATINA != null) result.PATINA = fp.PATINA;
      if (fp.TYPE != null) result.TYPE = fp.TYPE;
      if (fp.HANDLES != null) result.HANDLES = { ID: fp.HANDLES.id };
      if (fp.SIZES != null) result.SIZES = fp.SIZES;
      if (fp.TYPE != null || fp.MILLING_TYPE != null) result.FASADETYPE = fp.TYPE ?? fp.MILLING_TYPE;
      if (fp.MECHANISM != null) result.MECHANISM = fp.MECHANISM;


      // Добавляем SIZE только если есть хотя бы одно измерение
      const size: any = {};
      if (trueSize?.WIDTH != null) size.WIDTH = trueSize.WIDTH;
      if (trueSize?.HEIGHT != null) size.HEIGHT = trueSize.HEIGHT;
      if (trueSize?.DEPTH != null) size.DEPTH = trueSize.DEPTH;

      // Если есть хотя бы одно измерение, добавляем объект SIZE
      if (Object.keys(size).length > 0) {
        result.SIZE = size;
      }

      // Добавляем HANDLES только если массив не пустой
      if (fp.HANDLES && Array.isArray(fp.HANDLES) && fp.HANDLES.length > 0) {
        result.HANDLES = fp.HANDLES;
      }

      console.log(result, 'результат')

      return result;
    })
    : [];
}

function createBodyProps(objProps: any) {
  // const trueSize = objProps.BODY?.object?.userData?.trueSize;
  const sizeObj = {
    WIDTH: null,
    HEIGHT: null,
    DEPTH: null,
  };
  const isSizeEdit = appDataStore.getAppData.CATALOG.PRODUCTS[`${objProps.PRODUCT}`].SIZE_EDIT;
  const isSizeEditStepWidth = appDataStore.getAppData.CATALOG.PRODUCTS[`${objProps.PRODUCT}`].SIZE_EDIT_STEP_WIDTH;
  const isSizeEditStepHeight = appDataStore.getAppData.CATALOG.PRODUCTS[`${objProps.PRODUCT}`].SIZE_EDIT_STEP_HEIGHT;
  const isSizeEditStepDepth = appDataStore.getAppData.CATALOG.PRODUCTS[`${objProps.PRODUCT}`].SIZE_EDIT_STEP_DEPTH;

  console.log('isSizeEdit', isSizeEdit);
  console.log('isSizeStepEdit', isSizeEditStepWidth, isSizeEditStepHeight, isSizeEditStepDepth);
  if (isSizeEdit === "obligatory") {
    if (isSizeEditStepWidth) {
      sizeObj.WIDTH = objProps.CONFIG.SIZE.width;
    }
    if (isSizeEditStepHeight) {
      sizeObj.HEIGHT = objProps.CONFIG.SIZE.height;
    }
    if (isSizeEditStepDepth) {
      sizeObj.DEPTH = objProps.CONFIG.SIZE.depth;
    }
  } else {
    sizeObj.WIDTH = objProps.CONFIG.EXPRESSIONS['#MWIDTH#'] !== objProps.CONFIG.SIZE.width ? objProps.CONFIG.SIZE.width : null;
    sizeObj.HEIGHT = objProps.CONFIG.EXPRESSIONS['#MHEIGHT#'] !== objProps.CONFIG.SIZE.height ? objProps.CONFIG.SIZE.height : null;
    sizeObj.DEPTH = objProps.CONFIG.EXPRESSIONS['#MDEPTH#'] !== objProps.CONFIG.SIZE.depth ? objProps.CONFIG.SIZE.depth : null;
  }

  return {
    COLOR: objProps.CONFIG.MODULE_COLOR ?? null,
    SIZE: sizeObj
    // SIZE: {
    //   WIDTH: trueSize?.BODY_WIDTH?.toFixed(0) ?? null,
    //   HEIGHT: trueSize?.BODY_HEIGHT?.toFixed(0) ?? null,
    //   DEPTH: trueSize?.BODY_DEPTH?.toFixed(0) ?? null,
    // },
  };

}

function createOptionsProps(objProps: any) {
  const options: any[] = [];
  (objProps.CONFIG.OPTIONS || []).map(el => {
    if (el.active) options.push(+el.id);
  });
  return options;
}

function createRaspilData(objProps: any) {
  if (!objProps.RASPIL?.data) return {};

  const raspilData = objProps.RASPIL.data.flat().map((el: any) => ({
    height: el.height,
    width: el.width,
    depth: objProps.RASPIL.modelHeight,
    serviseData: (el.serviseData || [])
      .filter((service: any) => service.value === true)
      .map(({ NAME, value, error, ...rest }: any) => rest),
    holes: el.holes,
    roundCut: el.roundCut
  }));

  return {
    RASPIL_COUNT: objProps.RASPIL_COUNT,
    RASPIL: raspilData,
  };
}

function createUniformTexture(objProps: any) {
  const texture = objProps.CONFIG.UNIFORM_TEXTURE;

  return {
    GROUP: texture?.group ?? null,
    LEVEL: texture?.level ?? null,
    INDEX: texture?.index ?? null,
    column_INDEX: texture?.column_index ?? null,
  };
}

function generateDoorsSimple(moduleData) {
  const DOORS = {};

  //Двери-купе
  if (moduleData?.fasades) {
    moduleData.fasades?.forEach((fasadeArray, index) => {
      const doorNum = index + 1;
      DOORS[doorNum] = {};

      fasadeArray.forEach((fasade, index) => {
        const segmentNum = index; // номер сегмента = индекс в массиве
        const color = fasade.material.COLOR;

        DOORS[doorNum][segmentNum] = color;
      });
    });
  }
  else {
    moduleData?.sections?.forEach((section, number) => {
      const sectionNum = number + 1;
      DOORS[sectionNum] = {};

      section.fasades?.forEach(fasadeArray => {
        fasadeArray.forEach((fasade, index) => {
          const doorNum = fasade.door || 1;
          const segmentNum = index; // номер сегмента = индекс в массиве
          const color = fasade.material.COLOR;

          if (!DOORS[sectionNum][doorNum]) {
            DOORS[sectionNum][doorNum] = {};
          }

          DOORS[sectionNum][doorNum][segmentNum] = color;
        });
      });
    });
  }

  return DOORS;
}

function generateMechanizmSimple(moduleData) {
  const Mechanizm = [];
  const seen = new Set();

  moduleData.sections?.forEach((section, number) => {
    const sectionNum = number + 1;

    section.fasades?.forEach(fasadeArray => {
      fasadeArray.forEach((fasade, index) => {
        const elem = {}
        const doorNum = fasade.door || 1;
        const segmentNum = index;
        elem.mechanizm = fasade.material.MECHANISM
        elem.section = sectionNum
        elem.doorNum = doorNum
        elem.segmentNum = segmentNum

        const key = `${elem.mechanizm}_${elem.section}_${elem.doorNum}_${elem.segmentNum}`;

        if (elem.mechanizm && !seen.has(key)) {
          seen.add(key);
          Mechanizm.push(elem);
        }
      });
    });
  });

  return Mechanizm;
}

function transformLoops(sections, horizont, moduleThickness) {
  const coordsResult = {};
  const sidesResult = {};
  sections.forEach((section, index) => {
    const key = index + 1
    const sectionKey = section.number.toString();

    if (section.loops && section.loops.length > 0) {
      coordsResult[key] = {};
      sidesResult[key] = {};
      section.loops.forEach((loopArray, loopKey) => {
        coordsResult[key][loopKey + 1] = loopArray[0].coords.map(coord => {
          return coord - horizont - moduleThickness
        });
        sidesResult[key][loopKey + 1] = loopArray[0].side;

        // if (loopArray && loopArray.length > 0) {
        //     const firstLoop = loopArray[0];

        //     // Для координат
        //     if (firstLoop && firstLoop.coords && !coordsResult[sectionKey]) {
        //         coordsResult[sectionKey] = firstLoop.coords;
        //     }

        //     // Для стороны
        //     if (firstLoop && firstLoop.side !== undefined && !sidesResult[sectionKey]) {
        //         // sidesResult[sectionKey] = firstLoop.side;
        //     }
        // }
      });
    }

    // Альтернативно: если данные в loopsSides
    if (section.loopsSides && Object.keys(section.loopsSides).length > 0 && !sidesResult[sectionKey]) {
      const firstSideValue = Object.values(section.loopsSides)[0];
      sidesResult[sectionKey] = firstSideValue;
    }
  });

  return {
    coords: coordsResult,
    sides: sidesResult
  };
}

function creatSectionFilling(arr: any[] | null | undefined): any[] {
  if (!arr || !Array.isArray(arr)) {
    return [];
  }


  const item = arr.map(el => {
    if (el.type === 'section_partition') {
      return {
        PARTITION_ID: el.product,
        SECTION_ID: el.id, // ID товара полки
        SIZE: { // Размеры
          width: el.size?.x || 0,
          height: el.size?.y || 0,
          depth: el.size?.z || 0
        },
        UP_POSITION: el.ADDITIVES?.top?.additive_position,
        DOWN_POSITION: el.ADDITIVES?.bottom?.additive_position,
        MATERIAL_ID: el.material, // Материал полки
        ADDITIVES: el.ADDITIVES || {},
        ID: el.product,
        PATH: false,
        PRODUCT_TYPE: el.type,
      }
    } else {
      return {
        ID: el.product,
        PATH: false,
        MATERIAL_ID: el.material, // Материал полки
        PRODUCT_TYPE: el.type,
        VALUE: el.VALUE,
        SIZE: { // Размеры
          width: el.size?.x || 0,
          height: el.size?.y || 0,
          depth: el.size?.z || 0
        },
        ADDITIVES: el.ADDITIVES || {},
      }
    }

  })

  return item
}

function convertModuleToLegacyFormat(newModuleObject) {
  if (!newModuleObject?.CONFIG) {
    return {};
  }

  const { CONFIG } = newModuleObject;
  const sectionCount = Object.keys(CONFIG.SECTIONS).length;

  const legacyProps = {
    SIZEEDITWIDTH: CONFIG.SIZE?.width || 0,
    SIZEEDITHEIGHT: CONFIG.SIZE?.height || 0,
    SIZEEDITDEPTH: CONFIG.SIZE?.depth || 0,
    MODULECOLOR: CONFIG.MODULE_COLOR || 0,
    BACKWALL: CONFIG.BACKWALL || {},
    FILLING: 4619580,
    HORIZONT: CONFIG.MODULEGRID?.horizont || CONFIG.EXPRESSIONS['#HORIZONT#'],
    OPTION: createOptionsProps(newModuleObject),
    // DOORS: CONFIG.FASADE_PROPS || {}
    DOORS: generateDoorsSimple(CONFIG.MODULEGRID),
    UM_MECHANIZM: generateMechanizmSimple(CONFIG.MODULEGRID)

  };

  if (CONFIG.LEFTSIDECOLOR && CONFIG.LEFTSIDECOLOR.COLOR !== 199683 && CONFIG.LEFTSIDECOLOR.COLOR) {
    legacyProps.LEFTSIDECOLOR = CONFIG.LEFTSIDECOLOR;
  }

  if (CONFIG.RIGHTSIDECOLOR && CONFIG.RIGHTSIDECOLOR.COLOR !== 199683 && CONFIG.RIGHTSIDECOLOR.COLOR) {
    legacyProps.RIGHTSIDECOLOR = CONFIG.RIGHTSIDECOLOR;
  }

  if (CONFIG.TOPFASADECOLOR && CONFIG.TOPFASADECOLOR.COLOR !== 7397) {
    legacyProps.TOPFASADECOLOR = CONFIG.TOPFASADECOLOR;
  }

  if (CONFIG.FASADE_PROPS && !Object.keys(legacyProps.DOORS).length) {

    console.log('ПРОСТОЙ')

    CONFIG.FASADE_PROPS.forEach((el, index) => {
      const count = 1 + index;
      legacyProps[`FASADE${count}`] = {
        [index]: el.COLOR
      }
    })
  }


  // Динамически добавляем заполнения секций
  if (!Object.keys(CONFIG.MODULEGRID).length) {

    Object.keys(CONFIG.SECTIONS).forEach(sectionKey => {
      const section = CONFIG.SECTIONS[sectionKey];

      if (section?.size)
        legacyProps[`SECTIONS${sectionKey}`] = section.size.x

      // if (section?.position) 
      //   legacyProps[`FASADEHORIZONTALPOSITION${sectionKey}`] = {
      //       "0": section?.position.x
      //   } 

      legacyProps[`FASADESIZES${sectionKey}`] = [638];
      legacyProps[`FASADEWIDTH${sectionKey}`] = 596;
      legacyProps[`LOOPS`] = {
        "1": [
          86,
          520
        ]
      };
      legacyProps[`LOOPSSIDE`] = {
        "1": 4693746
      };
    });
  }
  else {
    const result = {}
    console.log('sections', CONFIG.MODULEGRID.sections)
    CONFIG.MODULEGRID.sections.forEach((section, number) => {
      const sectionNumber = number + 1;
      const sectionKey = `SECTIONS${sectionNumber}`;
      const fasadesSizeKey = `FASADESIZES${sectionNumber}`;
      const fasadesWidthKey = `FASADEWIDTH${sectionNumber}`;
      const fasadesHorizontlPositionKey = `FASADEHORIZONTALPOSITION${sectionNumber}`;
      const fasadesMillingKey = `MILLING${sectionNumber}`;
      const fasadesPaletteKey = `PALETTE${sectionNumber}`;
      const fasadesPattinaKey = `PATINA${sectionNumber}`;

      console.log('sectionKey', sectionKey);
      result[fasadesSizeKey] = {};
      result[fasadesWidthKey] = {};
      result[fasadesMillingKey] = {};
      result[fasadesPaletteKey] = {};
      result[fasadesPattinaKey] = {};


      section.fasades?.forEach(doorGroup => {
        doorGroup.forEach((fasade, index) => {
          const doorNumber = fasade.door;

          if (!result[fasadesSizeKey][doorNumber]) {
            result[fasadesSizeKey][doorNumber] = [];
          }

          result[fasadesSizeKey][doorNumber].push(fasade.height);

          if (!result[fasadesWidthKey][doorNumber]) {
            result[fasadesWidthKey][doorNumber] = fasade.width;
          }
          if (!result[fasadesHorizontlPositionKey]) {
            result[fasadesHorizontlPositionKey] = {};
          }
          if (!result[fasadesHorizontlPositionKey][doorNumber]) {
            result[fasadesHorizontlPositionKey][doorNumber] = {};
          }
          result[fasadesHorizontlPositionKey][doorNumber][0] = fasade.position.x;


          if (fasade.material.MILLING) {
            if (!result[fasadesMillingKey]) {
              result[fasadesMillingKey] = {};
            }
            if (!result[fasadesMillingKey][doorNumber]) {
              result[fasadesMillingKey][doorNumber] = {};
            }
            result[fasadesMillingKey][doorNumber][index] = fasade.material.MILLING;
          }
          if (fasade.material.PATINA) {
            if (!result[fasadesPattinaKey]) {
              result[fasadesPattinaKey] = {};
            }
            if (!result[fasadesPattinaKey][doorNumber]) {
              result[fasadesPattinaKey][doorNumber] = {};
            }
            result[fasadesPattinaKey][doorNumber][index] = fasade.material.PATINA;
          }
          if (fasade.material.PALETTE) {
            if (!result[fasadesPaletteKey]) {
              result[fasadesPaletteKey] = {};
            }
            if (!result[fasadesPaletteKey][doorNumber]) {
              result[fasadesPaletteKey][doorNumber] = {};
            }
            result[fasadesPaletteKey][doorNumber][index] = fasade.material.PALETTE;
          }
        });
      });

      legacyProps[`${sectionKey}`] = section.width;
      legacyProps[`${fasadesSizeKey}`] = result[fasadesSizeKey]
      legacyProps[`${fasadesWidthKey}`] = result[fasadesWidthKey]
      // legacyProps[`${fasadesHorizontlPositionKey}`] = result[fasadesHorizontlPositionKey]
      legacyProps[`${fasadesMillingKey}`] = result[fasadesMillingKey]
      legacyProps[`${fasadesPattinaKey}`] = result[fasadesPattinaKey]
      legacyProps[`${fasadesPaletteKey}`] = result[fasadesPaletteKey]
    });


    //Двери-купе
    CONFIG.MODULEGRID.fasades?.forEach((doorGroup, doorId) => {
      const sectionNumber = doorId + 1;

      const fasadesSizeKey = `FASADESIZES${sectionNumber}`;
      const fasadesWidthKey = `FASADEWIDTH${sectionNumber}`;
      const fasadesHorizontlPositionKey = `FASADEHORIZONTALPOSITION${sectionNumber}`;
      const fasadesMillingKey = `MILLING${sectionNumber}`;
      const fasadesPaletteKey = `PALETTE${sectionNumber}`;
      const fasadesPattinaKey = `PATINA${sectionNumber}`;

      result[fasadesSizeKey] = {};
      result[fasadesWidthKey] = false;
      result[fasadesMillingKey] = {};
      result[fasadesPaletteKey] = {};
      result[fasadesPattinaKey] = {};

      doorGroup.forEach((fasade, index) => {

        result[fasadesSizeKey][index] = fasade.height;

        if (!result[fasadesWidthKey]) {
          result[fasadesWidthKey] = fasade.width;
        }

        if (!result[fasadesHorizontlPositionKey]) {
          result[fasadesHorizontlPositionKey] = {};
        }

        result[fasadesHorizontlPositionKey][index] = fasade.position.x;


        if (fasade.material.MILLING) {
          if (!result[fasadesMillingKey]) {
            result[fasadesMillingKey] = {};
          }
          result[fasadesMillingKey][index] = fasade.material.MILLING;
        }

        if (fasade.material.PATINA) {
          if (!result[fasadesPattinaKey]) {
            result[fasadesPattinaKey] = {};
          }

          result[fasadesPattinaKey][index] = fasade.material.PATINA;
        }

        if (fasade.material.PALETTE) {
          if (!result[fasadesPaletteKey]) {
            result[fasadesPaletteKey] = {};
          }

          result[fasadesPaletteKey][index] = fasade.material.PALETTE;
        }

      });

      legacyProps[`${fasadesSizeKey}`] = result[fasadesSizeKey]
      legacyProps[`${fasadesWidthKey}`] = result[fasadesWidthKey]
      legacyProps[`${fasadesMillingKey}`] = result[fasadesMillingKey]
      legacyProps[`${fasadesPattinaKey}`] = result[fasadesPattinaKey]
      legacyProps[`${fasadesPaletteKey}`] = result[fasadesPaletteKey]
    });

    legacyProps[`LOOPS`] = transformLoops(CONFIG.MODULEGRID?.sections, CONFIG.MODULEGRID?.horizont, CONFIG.MODULEGRID?.moduleThickness).coords;
    legacyProps[`LOOPSSIDE`] = transformLoops(CONFIG.MODULEGRID?.sections).sides;
  }

  // Динамически добавляем заполнения секций
  if (CONFIG.SECTIONS) {
    Object.keys(CONFIG.SECTIONS).forEach(sectionKey => {
      const section = CONFIG.SECTIONS[sectionKey];
      if (section?.fillings && section.fillings.length) {
        legacyProps[`SECTIONSFILLING${sectionKey}`] = creatSectionFilling(section.fillings);
      }
    });
  }

  return legacyProps;
}

function removeEmptyObjects(obj) {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    // Если значение - объект и он не пустой, сохраняем его
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (Object.keys(value).length > 0) {
        result[key] = value;
      }
    } else {
      // Сохраняем все остальные значения (строки, числа, массивы и т.д.)
      result[key] = value;
    }
  }

  return result;
}

export function createBasketItem(objProps: any, index: number, key: any = ''): IBasket {
  console.log('========= createBasketItem ========', objProps);

  const props: any = {};

  // Добавляем свойства только если они существуют и не пустые
  const facadeProps = createFacadeProps(objProps);

  if (facadeProps && facadeProps.length > 0) {
    props.FASADE = facadeProps;
  }


  const bodyProps = createBodyProps(objProps);
  if (bodyProps && Object.keys(bodyProps).length > 0) {
    props.BODY = bodyProps;
  }

  const optionsProps = createOptionsProps(objProps);
  if (optionsProps && Object.keys(optionsProps).length > 0) {
    props.OPTION = optionsProps;
  }

  const uniformTexture = createUniformTexture(objProps);
  if (uniformTexture != null) {
    props.UNIFORM_TEXTURE = uniformTexture;
  }

  if (objProps.CONFIG.MODULE_COLOR != null) {
    props.MODULECOLOR = objProps.CONFIG.MODULE_COLOR;
  }

  if (objProps.RASPIL && objProps.RASPIL.length !== 0) {

    props.RASPIL = {
      data: objProps.RASPIL.data.flat().map(el => {
        return {
          height: el.height,
          width: el.width,
          serviseData: el.serviseData.filter(el => el.value).map(el => {
            if (el.width) {
              return {
                ID: el.ID,
                width: el.width,
                NAME: el.NAME
              }
            } else {
              return {
                ID: el.ID,
                NAME: el.NAME
              }
            }
          })
        }
      })
    }

    // props.PROFILE = '251698';
    props.PROFILE = objProps.CONFIG.PROFILE.filter(el => el.value === true)[0]?.ID
  }

  props.USLUGI = []
  if (objProps.RASPIL.data && objProps.RASPIL.data.length > 1) {
    props.USLUGI.push("98683");
    objProps.CONFIG.USLUGI.forEach(el => {
      if (el.value) {
        props.USLUGI.push(el.ID);
      }
    });
  }

  if (objProps.RASPIL.data) {

    console.log('====== RASPIL 2 =====', objProps.RASPIL.data)

    props.PROFILE = objProps.CONFIG.PROFILE.filter(el => el.value)[0]?.ID;
    props.RASPIL_COUNT = objProps.RASPIL.data.length

    function createRaspil(data) {
      return data.flat().map(el => { console.log(el); return `${el.width}мм` }).join(' x ');
    }

    props.USLUGIraspil = createRaspil(objProps.RASPIL.data);
  }

  if (objProps.CONFIG.KROMKA) {
    props.KROMKA = objProps.CONFIG.KROMKA;
  }

  if (objProps.RASPIL.data && objProps.RASPIL.data.length === 1) {

    console.log('====== USLUGI =====')

    objProps.CONFIG.USLUGI.forEach(el => {

      console.log(el, '====== USLUGI 2 =====')
      if (el.value === true) {
        props.USLUGI.push(el.ID);
      }
    });
  }

  if (objProps.CONFIG.MECHANISM) {
    props.MECHANISM = objProps.CONFIG.MECHANISM;
    props.MECHANISMNAME = objProps.CONFIG.MECHANISM_TEMP.find(el => el.active).NAME;
  }


  if (objProps.CONFIG.FILLING) {
    props.FILLING = objProps.CONFIG.FILLING;
  }

  if (objProps.CONFIG?.SHELFQUANT) {
    props.SHELFQUANT = objProps.CONFIG.SHELFQUANT?.current;
  }



  if (objProps.CONFIG.SECTIONS) {
    const propsUM = convertModuleToLegacyFormat(objProps);
    const cleanedData = removeEmptyObjects(propsUM);
    console.log('cleanedData', cleanedData)
    let HANDLES = []
    facadeProps.forEach(fasade => {
      if (fasade.HANDLES) {
        HANDLES.push(fasade.HANDLES)
      }
    })

    return {
      BASKETID: key,
      PRODUCT: objProps.CONFIG.ID,
      PROPS: cleanedData,
      QUANTITY: 1,
      TYPE: "umscene",
      HANDLES,
    };
  } else {
    return {
      BASKETID: key,
      PRODUCT: objProps.CONFIG.ID,
      PROPS: props,
      QUANTITY: 1,
      TYPE: "scene",
    };
  }
}

// Определения свойств (перенесено из Angular кода)
export const propsLabel = {
  COLOR: { type: "COLOR", val: "int", NAME: "Цвет", SORT: 300 },
  MODULECOLOR: { type: "FASADE", val: "int", NAME: "Цвет корпуса", SORT: 300 },
  SIZE: { type: "SIZE", val: "int", NAME: "Размер", SORT: 400 },
  THICKNESS: { type: "THICKNESS", val: "int", NAME: "Толщина", SORT: 500 },
  OPTION: { type: "OPTION", val: "array", NAME: "Опции", SORT: 600 },
  SIZEEDITHEIGHT: { type: false, val: "int", NAME: "Высота", SORT: 800 },
  SIZEEDITDEPTH: { type: false, val: "int", NAME: "Глубина", SORT: 800 },
  SIZEEDITWIDTH: { type: false, val: "int", NAME: "Ширина", SORT: 800 },
  HEM: { type: "HEM", val: "int", NAME: "Кромка", SORT: 900 },
  SHELFQUANT: { type: false, val: "int", NAME: "Количество полок", SORT: 900 },
  SIZEEDITJOINDEPTH: {
    type: false,
    val: "int",
    NAME: "Глубина пристыковочного модуля",
    SORT: 1000,
  },
  BACKWALL: { type: "FASADE", val: "color_obj_list", NAME: "Задняя стенка", SORT: 100 },
  LEFTSIDECOLOR: { type: "FASADE", val: "color_obj_list", NAME: "Левая стенка", SORT: 100 },
  RIGHTSIDECOLOR: { type: "FASADE", val: "color_obj_list", NAME: "Правая стенка", SORT: 100 },
  TOPFASADECOLOR: { type: "FASADE", val: "color_obj_list", NAME: "Накладка на крышку", SORT: 100 },

  DOORS: { type: "FASADE", val: "obj_list", NAME: "Двери", SORT: 100 },
  FACADE: { type: "FASADE", val: "int", NAME: "Цвет фасада", SORT: 100 },
  FASADE: { type: "FASADE", val: "int", NAME: "Фасад", SORT: 100 },
  FASADE1: { type: "FASADE", val: "int", NAME: "Цвет фасада 1", SORT: 1000 },
  FASADE2: { type: "FASADE", val: "int", NAME: "Цвет фасада 2", SORT: 1100 },
  FASADE3: { type: "FASADE", val: "int", NAME: "Цвет фасада 3", SORT: 1200 },
  FASADE4: { type: "FASADE", val: "int", NAME: "Цвет фасада 4", SORT: 1300 },
  FASADE5: { type: "FASADE", val: "int", NAME: "Цвет фасада 5", SORT: 1300 },


  UM_MECHANIZM: { type: "UM_MECHANIZM", val: "array", NAME: "Подъёмные механизмы", SORT: 100 },


  FASADEWIDTH: { type: false, val: "int", NAME: "Ширина фасада", SORT: 1360 },
  FASADE_WIDTH: { type: false, val: "int", NAME: "Ширина фасада", SORT: 1360 },
  FASADESIZE: { type: "FASADESIZE", val: "int", NAME: "Высота фасада", SORT: 1350 },
  SIZES: { type: "SIZES", val: "int", NAME: "Высота фасада", SORT: 1350 },
  FASADESIZE1: {
    type: "FASADESIZE",
    val: "int",
    NAME: "Размер фасада 1",
    SORT: 1350,
  },
  FASADESIZE2: {
    type: "FASADESIZE",
    val: "int",
    NAME: "Размер фасада 2",
    SORT: 1350,
  },
  FASADESIZE3: {
    type: "FASADESIZE",
    val: "int",
    NAME: "Размер фасада 3",
    SORT: 1350,
  },
  FASADESIZE4: {
    type: "FASADESIZE",
    val: "int",
    NAME: "Размер фасада 4",
    SORT: 1350,
  },
  FASADESIZE5: {
    type: "FASADESIZE",
    val: "int",
    NAME: "Размер фасада 5",
    SORT: 1350,
  },

  FASADESIZEWIDTH1: {
    type: false,
    val: "int",
    NAME: "Ширина фасада 1",
    SORT: 1350,
  },
  FASADESIZEWIDTH2: {
    type: false,
    val: "int",
    NAME: "Ширина фасада 2",
    SORT: 1350,
  },
  FASADESIZEWIDTH3: {
    type: false,
    val: "int",
    NAME: "Ширина фасада 3",
    SORT: 1350,
  },
  FASADESIZEWIDTH4: {
    type: false,
    val: "int",
    NAME: "Ширина фасада 4",
    SORT: 1350,
  },
  FASADESIZEWIDTH5: {
    type: false,
    val: "int",
    NAME: "Ширина фасада 5",
    SORT: 1350,
  },

  GLASS: { type: "GLASS", val: "int", NAME: "Стекло", SORT: 700 },
  GLASS1: { type: "GLASS", val: "int", NAME: "Стекло 1", SORT: 1400 },
  GLASS2: { type: "GLASS", val: "int", NAME: "Стекло 2", SORT: 1500 },
  GLASS3: { type: "GLASS", val: "int", NAME: "Стекло 3", SORT: 1600 },
  GLASS4: { type: "GLASS", val: "int", NAME: "Стекло 4", SORT: 1700 },
  GLASS5: { type: "GLASS", val: "int", NAME: "Стекло 5", SORT: 1700 },

  PATINA: { type: "PATINA", val: "int", NAME: "Патина", SORT: 1800 },
  PATINA1: { type: "PATINA", val: "int", NAME: "Патина 1", SORT: 1800 },
  PATINA2: { type: "PATINA", val: "int", NAME: "Патина 2", SORT: 1800 },
  PATINA3: { type: "PATINA", val: "int", NAME: "Патина 3", SORT: 1800 },
  PATINA4: { type: "PATINA", val: "int", NAME: "Патина 4", SORT: 1800 },
  PATINA5: { type: "PATINA", val: "int", NAME: "Патина 5", SORT: 1800 },

  SHOWCASE: { type: "SHOWCASE", val: "int", NAME: "Тип витрины", SORT: 1800 },
  SHOWCASE1: { type: "SHOWCASE", val: "int", NAME: "Тип витрины 1", SORT: 1800 },
  SHOWCASE2: { type: "SHOWCASE", val: "int", NAME: "Тип витрины 2", SORT: 1800 },
  SHOWCASE3: { type: "SHOWCASE", val: "int", NAME: "Тип витрины 3", SORT: 1800 },
  SHOWCASE4: { type: "SHOWCASE", val: "int", NAME: "Тип витрины 4", SORT: 1800 },
  SHOWCASE5: { type: "SHOWCASE", val: "int", NAME: "Тип витрины 5", SORT: 1800 },

  PALETTE: { type: "PALETTE", val: "int", NAME: "Палитра", SORT: 1800 },
  PALETTE1: { type: "PALETTE", val: "int", NAME: "Палитра 1", SORT: 1800 },
  PALETTE2: { type: "PALETTE", val: "int", NAME: "Палитра 2", SORT: 1800 },
  PALETTE3: { type: "PALETTE", val: "int", NAME: "Палитра 3", SORT: 1800 },
  PALETTE4: { type: "PALETTE", val: "int", NAME: "Палитра 4", SORT: 1800 },
  PALETTE5: { type: "PALETTE", val: "int", NAME: "Палитра 5", SORT: 1800 },

  FASADEALIGN: {
    type: "FASADEALIGN",
    val: "list",
    NAME: "Сторона открывания",
    SORT: 1800,
    VALUE: { left: "Левая", right: "Правая" },
  },
  FASADEALIGN1: {
    type: "FASADEALIGN",
    val: "list",
    NAME: "Сторона открывания 1",
    SORT: 1800,
  },
  FASADEALIGN2: {
    type: "FASADEALIGN",
    val: "list",
    NAME: "Сторона открывания 2",
    SORT: 1800,
  },
  FASADEALIGN3: {
    type: "FASADEALIGN",
    val: "list",
    NAME: "Сторона открывания 3",
    SORT: 1800,
  },
  FASADEALIGN4: {
    type: "FASADEALIGN",
    val: "list",
    NAME: "Сторона открывания 4",
    SORT: 1800,
  },
  FASADEALIGN5: {
    type: "FASADEALIGN",
    val: "list",
    NAME: "Сторона открывания 5",
    SORT: 1800,
  },

  FASADEFIRST: {
    type: "FASADEFIRST",
    val: "list",
    NAME: "Передний фасад",
    SORT: 1800,
    VALUE: { left: "Левый", right: "Правый" },
  },

  MILLING: { type: "MILLING", val: "int", NAME: "Фрезеровка", SORT: 200 },
  MILLING1: { type: "MILLING", val: "int", NAME: "Фрезеровка 1", SORT: 1800 },
  MILLING2: { type: "MILLING", val: "int", NAME: "Фрезеровка 2", SORT: 1900 },
  MILLING3: { type: "MILLING", val: "int", NAME: "Фрезеровка 3", SORT: 2000 },
  MILLING4: { type: "MILLING", val: "int", NAME: "Фрезеровка 4", SORT: 2100 },
  MILLING5: { type: "MILLING", val: "int", NAME: "Фрезеровка 5", SORT: 2100 },

  USLUGI: { type: "USLUGI", val: "array", NAME: "Услуга", SORT: 2110 },
  USLUGIL: { type: "USLUGI", val: "array", NAME: "Услуга левая часть", SORT: 2120 },
  USLUGIR: {
    type: "USLUGI",
    val: "array",
    NAME: "Услуга правая часть",
    SORT: 2130,
  },
  USLUGI1: { type: "USLUGI", val: "array", NAME: "Услуга 1", SORT: 2201 },
  USLUGI2: { type: "USLUGI", val: "array", NAME: "Услуга 2", SORT: 2202 },
  USLUGI3: { type: "USLUGI", val: "array", NAME: "Услуга 3", SORT: 2203 },
  USLUGI4: { type: "USLUGI", val: "array", NAME: "Услуга 4", SORT: 2204 },
  USLUGI5: { type: "USLUGI", val: "array", NAME: "Услуга 5", SORT: 2205 },

  USLUGIraspil: { type: false, val: "str", NAME: "Распил", SORT: 2300 },

  PROFILE: { type: "USLUGI", val: "int", NAME: "Тип завала", SORT: 2200 },
  FILLING: { type: "FILLING", val: "int", NAME: "Вариант компоновки", SORT: 2400 },

  FASADETYPE: { type: "FASADETYPE", val: "int", NAME: "Тип фасада", SORT: 2500 },
  FASADETYPE1: { type: "FASADETYPE", val: "int", NAME: "Тип фасада 1", SORT: 2510 },
  FASADETYPE2: { type: "FASADETYPE", val: "int", NAME: "Тип фасада 2", SORT: 2520 },
  FASADETYPE3: { type: "FASADETYPE", val: "int", NAME: "Тип фасада 3", SORT: 2530 },
  FASADETYPE4: { type: "FASADETYPE", val: "int", NAME: "Тип фасада 4", SORT: 2540 },
  FASADETYPE5: { type: "FASADETYPE", val: "int", NAME: "Тип фасада 5", SORT: 2550 },

  SECTIONS: { type: false, val: "int", NAME: "Размер секции", SORT: 2550 },
  SECTIONS1: { type: false, val: "int", NAME: "Размер секции 1", SORT: 2550 },
  SECTIONS2: { type: false, val: "int", NAME: "Размер секции 2", SORT: 2550 },
  SECTIONS3: { type: false, val: "int", NAME: "Размер секции 3", SORT: 2550 },
  SECTIONS4: { type: false, val: "int", NAME: "Размер секции 4", SORT: 2550 },
  SECTIONS5: { type: false, val: "int", NAME: "Размер секции 5", SORT: 2550 },

  SHELFPOSITION: { type: false, val: "int", NAME: "Позиции полок", SORT: 2550 },
  SHELFPOSITION1: { type: false, val: "int", NAME: "Позиции полок 1", SORT: 2550 },
  SHELFPOSITION2: { type: false, val: "int", NAME: "Позиции полок 2", SORT: 2550 },
  SHELFPOSITION3: { type: false, val: "int", NAME: "Позиции полок 3", SORT: 2550 },
  SHELFPOSITION4: { type: false, val: "int", NAME: "Позиции полок 4", SORT: 2550 },
  SHELFPOSITION5: { type: false, val: "int", NAME: "Позиции полок 5", SORT: 2550 },
  SHELFPOSITION6: { type: false, val: "int", NAME: "Позиции полок 6", SORT: 2550 },
  SHELFPOSITION7: { type: false, val: "int", NAME: "Позиции полок 7", SORT: 2550 },
  SHELFPOSITION8: { type: false, val: "int", NAME: "Позиции полок 8", SORT: 2550 },
  SHELFPOSITION9: { type: false, val: "int", NAME: "Позиции полок 9", SORT: 2550 },
  SHELFPOSITION10: {
    type: false,
    val: "int",
    NAME: "Позиции полок 10 ",
    SORT: 2550,
  },

  SECTIONSFILLING: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции",
    SORT: 2550,
  },
  SECTIONSFILLING1: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции 1",
    SORT: 2550,
  },
  SECTIONSFILLING2: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции 2",
    SORT: 2550,
  },
  SECTIONSFILLING3: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции 3",
    SORT: 2550,
  },
  SECTIONSFILLING4: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции 4",
    SORT: 2550,
  },
  SECTIONSFILLING5: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции 5",
    SORT: 2550,
  },
  SECTIONSFILLING6: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции 6",
    SORT: 2550,
  },
  SECTIONSFILLING7: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции 7",
    SORT: 2550,
  },
  SECTIONSFILLING8: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции 8",
    SORT: 2550,
  },
  SECTIONSFILLING9: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции 9",
    SORT: 2550,
  },
  SECTIONSFILLING10: {
    type: "PRODUCTS",
    val: "int",
    NAME: "Наполнение секции 10",
    SORT: 2550,
  },
  MECHANISM: {
    type: "MECHANISM",
    val: "int",
    NAME: "Подъемный механизм",
    SORT: 2560,
  },
};