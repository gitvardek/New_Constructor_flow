<template>
  <div class="basket-item">
    <div class="basket-item__picture">
      <div class="basket-item__picture-container">
        <img
          :src="`${API_URL + item?.product.PREVIEW_PICTURE}`"
          alt=""
          class="basket-items__picture_img"
        />
        <img
          src="@/assets/svg/left-menu/question.svg"
          class="basket-items__picture-question"
          @click="openPopup(item)"
        />
      </div>
    </div>

    <div class="basket-item__product">
      <h3 :class="item?.error ? 'basket-item__product-name--error' : ''">
        {{ item?.product.NAME }}
        <span v-if="isFeedbackProject">{{
          getArticleByProductId(item?.product.ID)
        }}</span>
        <span v-if="item?.error"> (НЕДОСТУПНО!)</span>
      </h3>
      <!-- Секция свойств товаров общяя -->
      <div
        class="basket-item__props"
        v-if="item?.product.PROPS && item?.product.TYPE !== 'umscene'"
      >
        <div v-for="(propValue, propKey) in item.product.PROPS" :key="propKey">
          <div v-if="getPropDefinition(String(propKey))">
            <!-- {{ propValue }} -->
            <span
              class="basket-item__props-lable"
              v-if="
                propValue && propValue.length !== 0 && propKey !== 'MECHANISM'
              "
              >{{ getPropLabel(String(propKey)) }}:</span
            >
            <!-- Обработка массивов -->
            <ul v-if="Array.isArray(propValue)" class="basket-item__props-list">
              <li v-for="(propVal, index) in propValue" :key="index">
                <span
                  v-if="shouldShowPropValue(propKey, propVal)"
                  :class="getErrorClass(propVal, item?.error?.props)"
                >
                  <!-- {{ formatPropValue(propKey, propVal , item) }} -->

                  <span
                    v-html="formatPropValue(propKey, propVal, item, index)"
                  ></span>

                  <span v-if="hasArticle(propKey, propVal)">
                    - артикул {{ getArticleCode(propKey, propVal) }}
                  </span>
                  {{
                    getErrorText(
                      propVal,
                      item.product.props_error,
                      item,
                      propKey,
                    )
                  }}

                  <!-- Дополнительная информация для PRODUCTS -->
                  <template
                    v-if="getPropDefinition(propKey).type === 'PRODUCTS'"
                  >
                    <p
                      v-if="
                        propVal.FASADE &&
                        propVal.FASADE.fasade &&
                        propVal.FASADE.fasade.COLOR
                      "
                    >
                      Цвет:
                      {{ getFasadeSectionName(propVal.FASADE.fasade.COLOR) }} -
                      {{ getFasadeName(propVal.FASADE.fasade.COLOR) }}
                      <span v-if="propVal.FASADE.fasade.PALETTE">
                        -
                        {{
                          getPaletteName(propVal.FASADE.fasade.PALETTE)
                        }};</span
                      >
                    </p>

                    <p
                      v-if="
                        propVal.FASADE &&
                        propVal.FASADE.fasade &&
                        propVal.FASADE.fasade.MILLING
                      "
                    >
                      Фрезеровка:
                      {{ getMillingSectionName(propVal.FASADE.fasade.MILLING) }}
                      -
                      {{ getMillingName(propVal.FASADE.fasade.MILLING) }}
                    </p>
                  </template>
                </span>
              </li>
            </ul>

            <!-- Обработка одиночных значений -->
            <span v-else :class="getErrorClass(propValue, item?.error?.props)">
              <template v-if="getPropDefinition(propKey).val === 'obj_list'">
                <ul>
                  <div v-for="(objItem, objIndex) in propValue" :key="objIndex">
                    <li v-if="isObject(objItem)">
                      Секция {{ objIndex }}:
                      <p v-for="(val, key) in objItem" :key="key">
                        Дверь {{ key }}:
                        <template v-if="isObject(val)">
                          <span
                            v-for="(segment, segmentKey) in val"
                            :key="segmentKey"
                          >
                            {{ segmentKey }}:
                            {{ getFasadeSectionName(segment) }} -
                            {{ getFasadeName(segment) }}
                            <span
                              v-if="hasArticleForSegment(segment, segmentKey)"
                            >
                              - артикул
                              {{
                                getArticleCodeForSegment(segment, segmentKey)
                              }}
                            </span>
                            {{
                              hasError(segment, item?.error?.props)
                                ? "(НЕДОСТУПНО!)"
                                : ""
                            }};
                          </span>
                        </template>

                        <template v-else-if="Array.isArray(val)">
                          <span
                            v-for="(segment, segmentIndex) in val"
                            :key="segmentIndex"
                          >
                            {{ segmentIndex + 1 }}:
                            {{ getFasadeSectionName(segment) }} -
                            {{ getFasadeName(segment) }}
                            <span v-if="hasArticleForSegment(segment, key)">
                              - артикул
                              {{ getArticleCodeForSegment(segment, key) }}
                            </span>
                            {{
                              hasError(segment, item?.error?.props)
                                ? "(НЕДОСТУПНО!)"
                                : ""
                            }};
                          </span>
                        </template>

                        <template v-else>
                          {{ getFasadeSectionName(val) }} -
                          {{ getFasadeName(val) }}
                          <span v-if="hasArticleForSegment(val, key)">
                            - артикул {{ getArticleCodeForSegment(val, key) }}
                          </span>
                          {{
                            hasError(val, item?.error?.props)
                              ? "(НЕДОСТУПНО!)"
                              : ""
                          }};
                        </template>
                      </p>
                    </li>

                    <li v-else>
                      {{ objIndex }}: {{ getFasadeSectionName(objItem) }} -
                      {{ getFasadeName(objItem) }}
                      <span v-if="hasArticleForSegment(objItem, propKey)">
                        - артикул
                        {{ getArticleCodeForSegment(objItem, propKey) }}
                      </span>
                      {{
                        hasError(objItem, item?.error?.props)
                          ? "(НЕДОСТУПНО!)"
                          : ""
                      }};
                    </li>
                  </div>
                </ul>
              </template>

              <template
                v-else-if="getPropDefinition(propKey).val === 'color_obj_list'"
              >
                <ul>
                  <div
                    v-for="(colorItem, colorKey) in propValue"
                    :key="colorKey"
                  >
                    <li v-if="String(colorKey) === 'COLOR'">
                      Цвет: {{ getFasadeSectionName(colorItem) }} -
                      {{ getFasadeName(colorItem) }}
                      <span v-if="hasArticleForSegment(colorItem, propKey)">
                        - артикул
                        {{ getArticleCodeForSegment(colorItem, propKey) }}
                      </span>
                      <span v-if="propValue.PALETTE">
                        - {{ getPaletteName(propValue.PALETTE) }}</span
                      >
                      {{
                        hasError(colorItem, item?.error?.props)
                          ? "(НЕДОСТУПНО!)"
                          : ""
                      }};
                    </li>
                    <!-- TODO -->
                    <!-- <li v-if="String(colorKey) === 'MILLING'">
                      Фрезеровка: {{ getMillingSectionName(colorItem) }} - {{ getMillingName(colorItem) }}
                      {{ hasError(colorItem, item?.error?.props) ? '(НЕДОСТУПНО!)' : '' }};
                    </li> -->
                  </div>
                </ul>
              </template>
              <!-- // -->
              <template
                v-else-if="
                  getPropDefinition(propKey).val === 'int' &&
                  getPropDefinition(propKey).type
                "
              >
                {{
                  getTypeName(
                    getPropDefinition(propKey).type,
                    propValue,
                    item?.product.TYPE,
                  )
                }}

                <span v-if="hasArticle(propKey, propValue)">
                  - артикул {{ getArticleCode(propKey, propValue) }}
                </span>
                <!-- {{ propValue }} {{ item.error.props[0].id }} -->
                {{
                  hasError(propValue, item?.error?.props) ? "(НЕДОСТУПНО!)" : ""
                }}
              </template>

              <template v-else-if="getPropDefinition(propKey).val === 'list'">
                {{ getListValue(propKey, propValue) }}
              </template>

              <template
                v-else-if="
                  !getPropDefinition(propKey).type &&
                  getPropDefinition(propKey).val === 'int'
                "
              >
                {{ propValue }}
              </template>

              <template v-else>
                {{ getUsliguName(propValue) }}
              </template>
            </span>
          </div>
          <span v-if="propKey === 'RASPIL'">
            <div v-for="(item, index) in propValue.data" :key="propKey">
              <span
                v-if="item.serviseData.length"
                class="basket-item__props-lable"
                >Услуга {{ ++index }} :</span
              >
              <ul class="basket-item__props-list">
                <li v-for="(lisItem, index) in item.serviseData" :key="index">
                  <!-- {{ item.serviseData.length }} -->
                  <span>{{ lisItem.NAME }}</span>
                  <span v-if="lisItem.width">{{ lisItem.width }} мм.</span>
                </li>
              </ul>
            </div>
          </span>

          <span v-if="propKey === 'KROMKA'">
            <span class="basket-item__props-lable">Кромка:</span>
            <span>{{ getTypeName("HEM", propValue, item?.product.TYPE) }}</span>
          </span>

          <span v-if="propKey === 'MECHANISM'">
            <span class="basket-item__props-lable">Подъемный механизм:</span>
            <span>{{ item?.product.PROPS.MECHANISMNAME }}</span>
          </span>

          <span v-if="propKey === 'BODY'">
            <div class="basket-item__props-list">
              <div v-if="propValue.SIZE.DEPTH">
                <span class="basket-item__props-lable">Глубина:</span>
                <span>{{ propValue.SIZE.DEPTH }}</span>
              </div>
              <div v-if="propValue.SIZE.HEIGHT">
                <span class="basket-item__props-lable">Высота:</span>
                <span>{{ propValue.SIZE.HEIGHT }}</span>
              </div>
              <div v-if="propValue.SIZE.WIDTH">
                <span class="basket-item__props-lable">Ширина:</span>
                <span>{{ propValue.SIZE.WIDTH }}</span>
              </div>
            </div>
          </span>
        </div>
      </div>

      <!-- Секция свойств товара тип УМ-->
      <div class="basket-item__props" v-else>
        <div
          style="list-style: none"
          v-for="(propValue, propKey) in renderDescription(item?.product.PROPS)"
          :key="propKey"
        >
          <!-- {{ propValue }} -->
          <div v-if="Array.isArray(propValue.value)">
            <span class="basket-item__props-lable">{{ propValue.key }}:</span>
            <div
              class="basket-item__props-block__lables"
              style="list-style: none"
              v-for="(value, i) in propValue.value"
              :key="i"
            >
              <div v-if="propValue.key !== 'Подъёмные механизмы'">
                <span>{{ i + 1 }} {{ value.key }}:</span>
                <span>{{
                  value.value ? ` - поз. ${value.value} мм` : ""
                }}</span>
              </div>
              <div v-else>
                <span>{{ value.key }}: </span>
                <span>{{ value.value }}</span>
              </div>
            </div>
          </div>
          <div v-else>
            <span class="basket-item__props-lable">{{ propValue.key }}:</span
            ><span>{{ propValue.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="basket-item__quantity">
      <button
        v-if="item?.product.TYPE === 'catalog'"
        class="basket-item__quantity-btn"
        @click="decrement(item.product.BASKETID, item?.product.TYPE)"
        :disabled="item.error"
      >
        -
      </button>
      <input
        type="text"
        :disabled="item?.product.TYPE !== 'catalog'"
        class="basket-item__quantity-input"
        v-model="item.product.quantity"
        placeholder="1"
        @change="
          () => updateQuantity(item.product.BASKETID, item?.product.TYPE)
        "
      />
      <button
        v-if="item?.product.TYPE === 'catalog'"
        class="basket-item__quantity-btn"
        @click="increment(item.product.BASKETID, item?.product.TYPE)"
        :disabled="item.error"
      >
        +
      </button>
    </div>

    <div class="basket-item__price">
      {{ item.product.unitPriceFormat ?? 0 }}
      <!-- {{ !oldPrice ? item.product.unitPriceFormat :  item.product.unitPriceOldFormat }}  -->
    </div>

    <div class="basket-item__price basket-item__total">
      <!-- {{ item.product.allPriceFormat ?? 0}} -->
      {{ item.product.allPriceFormat ?? 0 }}
      <!-- {{ !oldPrice ? item.product.allPriceFormat : item.product.allPriceOldFormat}} -->
    </div>

    <div class="basket-item__price basket-item__old-total" v-if="!oldPrice">
      <span>{{ item.product.allPriceOldFormat ?? 0 }}</span>
    </div>

    <div class="basket-item__price basket-item__action">
      <DeleteBasketButton
        @click="
          deleteProductInBusket(item.product.BASKETID, item?.product.TYPE)
        "
      />
    </div>
    <InfoPopUp
      v-if="isShowInfoPopup"
      @close="closeInfoPopup"
      v-bind="currentProductInfo"
    />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { useBasketStore } from "@/store/appStore/useBasketStore";
import { useAppData } from "@/store/appliction/useAppData";
import { ref, computed, onBeforeMount } from "vue";
import DeleteBasketButton from "../ui/buttons/basket/DeleteBasketButton.vue";
import axios from "axios";
import InfoPopUp from "../popUp/InfoPopUp.vue";
import { _URL } from "@/types/constants";
import { propsLabel } from "./helper/basketMapper";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useConfigStore } from "@/store/appStore/useConfigStore";
import { BASE_DOMAIN } from "@/utils/originalDomain";

// const API_URL = ref('https://dev.vardek.online');
const API_URL = ref(`https://${BASE_DOMAIN}`);

interface Props {
  item: any;
}

const isShowInfoPopup = ref(false);

const currentProductInfo = ref({
  title: "",
  description: "",
  image: "",
});

const props = defineProps<Props>();
const basketStore = useBasketStore();
const appDataStore = useAppData();
const quantity = ref(props.item.product.quantity);
const {
  oldPrice,
  isFeedbackProject,
  getArticleByProductId,
  getArticleByFasadId,
} = useConfigStore();

// Получаем данные из store
const appData = computed(() => appDataStore.getAppData);

const openPopup = async (item) => {
  try {
    const { data } = await axios.post(`/api/modeller/product/getbyid/`, {
      ID: item.product.ID,
    });

    const {
      NAME,
      DETAIL_TEXT,
      DETAIL_PICTURE,
      PREVIEW_PICTURE,
      PREVIEW_TEXT,
      PROPERTY_IMAGES_VALUE,
      PROPERTY_VIDEO_VALUE,
      PROPERTY_VIDEO_IMAGE_VALUE,
    } = data.DATA.response;

    currentProductInfo.value = {
      title: NAME,
      detailText: DETAIL_TEXT,
      previewText: PREVIEW_TEXT,
      image: getImageUrl(DETAIL_PICTURE),
      images: PROPERTY_IMAGES_VALUE,
      videoUrl: PROPERTY_VIDEO_VALUE,
      videoPoster: getImageUrl(PROPERTY_VIDEO_IMAGE_VALUE),
    };
    isShowInfoPopup.value = true;
  } catch (error) {
    console.error("API Error:", error);
  }
};

const closeInfoPopup = () => {
  isShowInfoPopup.value = false;
  currentProductInfo.value = {
    title: "",
    description: "",
    image: "",
  };
};

const getImageUrl = (imageName: string) => {
  return ` ${_URL}${imageName}`;
};

// Вспомогательные функции
const getPropDefinition = (key: string) => {
  return propsLabel[key as keyof typeof propsLabel];
};

const getPropLabel = (key: string) => {
  const propDef = getPropDefinition(key);
  return propDef ? propDef.NAME + parsePropIndex(key) : "";
};

const parsePropIndex = (key: string) => {
  // Извлекаем числовой индекс из ключа (если есть)
  const match = key.match(/\d+$/);
  return match ? ` ${match[0]}` : "";
};

const shouldShowPropValue = (key: string, propVal: any) => {
  const propDef = getPropDefinition(key);
  return propDef && propDef.type && propDef.type !== "PRODUCT";
};

// const formatPropValue = (key: string, propVal: any, item: any) => {
//   const propDef = getPropDefinition(key);
//   console.log('propValpropVal', propVal);

//   if (propDef && propDef.type === 'PRODUCTS') {
//     if (propVal.ID) {
//       return propVal.VALUE === null
//         ? getProductInfo(propVal.ID).NAME
//         : `${getProductInfo(propVal.ID).NAME} - поз. ${propVal.VALUE} мм.`;
//     } else {
//       return getProductInfo(propVal).NAME;
//     }
//   }

//   if(item?.product.TYPE=== 'scene') {
//     if (typeof propVal === 'object' && propVal !== null) {
//       let getListValue = '';
//       Object.entries(propVal).forEach(([key, value]) => {
//         if (typeof value === 'object' && value !== null) {
//           value = JSON.stringify(value);
//         }
//         getListValue += `<li><strong>${key}:</strong> ${value}</li>`;
//       });

//       const ul = document.createElement('ul');
//       ul.innerHTML = getListValue;
//       console.log(ul);
//       return ul; // возвращаем DOM элемент
//     }
//     console.log('тип')

//     return getTypeName(propDef?.type, propVal.COLOR);
//   }
//   return getTypeName(propDef?.type, propVal);
// };

const formatPropValue = (key: string, propVal: any, item: any, index: any) => {
  const propDef = getPropDefinition(key);
  console.log("propValpropVal", propVal);

  if (propDef && propDef.type === "PRODUCTS") {
    if (propVal.ID) {
      return propVal.VALUE === null
        ? getProductInfo(propVal.ID).NAME
        : // : `${getProductInfo(propVal.ID).NAME} - поз. ${propVal.ADDITIVES} мм.`;
          `${getProductInfo(propVal.ID).NAME}`;
    } else {
      return getProductInfo(propVal).NAME;
    }
  }

  if (item?.product.TYPE === "scene") {
    if (typeof propVal === "object" && propVal !== null) {
      // Вместо создания DOM элемента, возвращаем HTML строку
      let listValue = "";
      const count = ++index;
      Object.entries(propVal).forEach(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          value = JSON.stringify(value);
        }
        if (
          key !== "HANDLES" &&
          getTypeName(key, value, item?.product.TYPE) &&
          getPropLabel(key) &&
          !isFeedbackProject
        ) {
          listValue += `<li>${getPropLabel(key)} ${index}: ${getTypeName(key, value, item?.product.TYPE)}</li>`; // ${getTypeName(key, value)}
        }
        if (
          key !== "HANDLES" &&
          getTypeName(key, value, item?.product.TYPE) &&
          getPropLabel(key) &&
          isFeedbackProject
        ) {
          listValue += `<li>${getPropLabel(key)} ${index}: ${getTypeName(key, value, item?.product.TYPE)} ${getArticleByFasadId(propVal?.article)}</li>`; // ${getTypeName(key, value)}
        }
      });

      // Возвращаем HTML строку, а не DOM элемент
      return `<ul>${listValue}</ul>`;
    }
  }
  return getTypeName(propDef?.type, propVal);
};

const getErrorClass = (propVal: any, propsError: any) => {
  // Здесь должна быть логика определения классов ошибок
  // Это упрощенная версия, нужно адаптировать под вашу логику
  if (!propsError || !Array.isArray(propsError)) return false;

  // if (propsError.some(error => error.id && error?.id?.includes(propVal))) {
  // if (propsError.some(error => error.id && error.id.includes(propVal))) {
  //   return 'error-background';
  // }
  return "";
};

const getErrorText = (
  propVal: any,
  propsError: any,
  _item?: any,
  _propKey?: any,
) => {
  // Здесь должна быть полная логика определения текста ошибки
  // Это упрощенная версия
  if (propsError && propsError.includes(propVal)) {
    return "(НЕДОСТУПНО!)";
  }
  return "";
};

const hasArticle = (_key: string, _propVal: any) => {
  // Логика проверки наличия артикула
  return false; // Заглушка
};

const getArticleCode = (_key: string, _propVal: any) => {
  // Логика получения кода артикула
  return ""; // Заглушка
};

const isObject = (value: any) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasArticleForSegment = (_segment: any, _key: string) => {
  // Логика проверки наличия артикула для сегмента
  return false; // Заглушка
};

const getArticleCodeForSegment = (_segment: any, _key: string) => {
  // Логика получения кода артикула для сегмента
  return ""; // Заглушка
};

const hasError = (value: any, propsError: any) => {
  // Логика проверки ошибки
  console.log(propsError);
  // return propsError && propsError.includes(value);
  if (!propsError || !Array.isArray(propsError)) return false;

  // return propsError.some(error => error.id && error.id.includes(value));
};

const getTypeName = (type: any, value: any, mainType: any = "") => {
  // Получаем имя из store данных
  // console.log('data', appData.value, type, value, mainType);
  console.log(type, mainType);

  if (value && typeof value === "object" && value.NAME) {
    return value.NAME;
  }
  if (
    appData.value &&
    appData.value[type] &&
    appData.value[type][value] &&
    type !== "MECHANISM"
  ) {
    return appData.value[type][value].NAME || `[${type}:${value}]`;
  }
  if (mainType === "scene" && type === "COLOR") {
    return appData.value["FASADE"][value]?.NAME;
  }

  if (mainType === "scene" && type === "SIZES") {
    console.log();
    return appData.value["FASADESIZE"][JSON.parse(value).id]?.NAME;
  }

  if (mainType === "umscene" && typeof value === "object") {
    console.log();
    return appData.value[type][value["1"][0]]?.NAME;
  }

  if (type === "HEM" && mainType === "scene") {
    return appData.value["HEM"][value].NAME;
  }
  if (type === "MECHANISM" && mainType === "scene") {
    return appData.value["MECHANISM"][value].NAME;
  }

  if (mainType === "scene") {
    return false;
  } else {
    return [`${type}:${value}`];
  }
};

const getListValue = (key: string, value: any) => {
  const propDef = getPropDefinition(key);
  console.log(key, value, propDef);
  return (propDef as any)?.VALUE ? (propDef as any).VALUE[value] : value;
};

// Возвращает название услуги/опции по ID или объекту
const getServiceName = (raw: any) => {
  if (raw && typeof raw === "object") {
    if (raw.NAME) return raw.NAME;
    if (raw.value && typeof raw.value === "object" && raw.value.NAME)
      return raw.value.NAME;
  }

  const idCandidate =
    raw && typeof raw === "object"
      ? (raw.ID ?? raw.value ?? raw.id ?? raw)
      : raw;
  const keyId =
    typeof idCandidate === "string" || typeof idCandidate === "number"
      ? idCandidate
      : String(idCandidate);

  const dicts = [
    appData.value?.USLUGI,
    appData.value?.OPTION,
    appData.value?.SERVICE,
    appData.value?.SERVICES,
    appData.value?.USLUGI_LIST,
  ];

  for (const dict of dicts) {
    if (dict && dict[keyId]) {
      return dict[keyId].NAME || dict[keyId].name || keyId;
    }
  }

  return keyId;
};

const getFasadeSectionName = (id: any) => {
  // Получаем название секции фасада из store данных
  if (
    appData.value &&
    appData.value.FASADE_SECTION &&
    appData.value.FASADE_SECTION[id]
  ) {
    return appData.value.FASADE_SECTION[id].NAME || `Секция фасада ${id}`;
  }
  return `Секция фасада ${id}`;
};

const getFasadeName = (id: any) => {
  // Получаем название фасада из store данных
  if (appData.value && appData.value.FASADE && appData.value.FASADE[id]) {
    return appData.value.FASADE[id].NAME || `Фасад ${id}`;
  }
  return `Фасад ${id}`;
};

const getPaletteName = (id: any) => {
  // Получаем название палитры из store данных
  if (appData.value && appData.value.PALETTE && appData.value.PALETTE[id]) {
    return appData.value.PALETTE[id].NAME || `Палитра ${id}`;
  }
  return `Палитра ${id}`;
};

const getMillingSectionName = (id: any) => {
  // Получаем название секции фрезеровки из store данных
  if (appData.value && appData.value.MILLING && appData.value.MILLING[id]) {
    return appData.value.MILLING[id].SECTION_NAME || `Секция фрезеровки ${id}`;
  }
  return `Секция фрезеровки ${id}`;
};

const getMillingName = (id: any) => {
  // Получаем название фрезеровки из store данных
  if (appData.value && appData.value.MILLING && appData.value.MILLING[id]) {
    return appData.value.MILLING[id].NAME || `Фрезеровка ${id}`;
  }
  return `Фрезеровка ${id}`;
};
const getUsliguName = (id: any) => {
  // Получаем название фрезеровки из store данных
  if (appData.value && appData.value.USLUGI && appData.value.USLUGI[id]) {
    return appData.value.USLUGI[id].NAME || `Услуга ${id}`;
  }
  return `Услуга ${id}`;
};

const getProductInfo = (id: any) => {
  // Получаем информацию о продукте из store данных
  if (
    appData.value &&
    appData.value.CATALOG &&
    appData.value.CATALOG.PRODUCTS &&
    appData.value.CATALOG.PRODUCTS[id]
  ) {
    return { NAME: appData.value.CATALOG.PRODUCTS[id].NAME || `Продукт ${id}` };
  }
  return { NAME: `Продукт ${id}` };
};

function increment(id: string, type: string) {
  quantity.value++;
  updateQuantity(id, type);
}

function decrement(id: string, type: string) {
  if (quantity.value > 1) {
    quantity.value--;
    updateQuantity(id, type);
  }
}

function updateQuantity(id: string, type: string) {
  basketStore.updateQuantity(id, type, quantity);
}

const deleteProductInBusket = (id: string, type: string) => {
  console.log(id, type);
  basketStore.removeFromBasket(id, type);
  if (type === "scene" || type === "umscene") {
    useEventBus().emit("A:RemoveModelFromBasket", {
      product: null,
      basketId: id,
    });
  }
  basketStore.syncBasketDelay();
};

// -------------- сцена

const formatPropSceneValue = (key: string, propVal: any) => {
  console.log("propVal", propVal);
  console.log("key", key);
  // if (typeof secondItem === 'object' && secondItem !== null && !Array.isArray(secondItem)) {
  //   console.log('Второй элемент - объект:', secondItem);
  // }
  const propDef = getPropDefinition(key);
  return getTypeName(propDef?.type, propVal);
};

const shouldShowPropSceneValue = (key: string, propVal: any) => {
  const propDef = getPropDefinition(key);
  return propDef && propDef.type && propDef.type !== "PRODUCT";
};

const getFilteredProps = (item) => {
  if (!item) {
    return [];
  }

  const props = item;
  const filteredProps = [];

  for (let propKey in props) {
    if (props.hasOwnProperty(propKey)) {
      const propVal = props[propKey];

      filteredProps.push({
        key: propKey,
        value: propVal,
      });
    }
  }

  return filteredProps;
};

const renderDescription = (data) => {
  const result = [];
  const productId = props.item.product.ID;
  const { MECHANISM } = appData.value;

  const textValue = (value) => {
    const color = appData.value["FASADE"][value.COLOR]?.NAME;
    const pallette = appData.value["PALETTE"][value.PALETTE]?.NAME;
    const patina = appData.value["PATINA"][value.PATINA]?.NAME;
    const glass = appData.value["GLASS"][value.GLASS]?.NAME;
    const milling = appData.value["MILLING"][value.MILLING]?.NAME;

    return `${color ?? ""} ${pallette ?? ""} ${patina ?? ""} ${milling ?? ""}`;
  };

  // console.log(data, props.item, "data data data");
  if (data.DOORS) {
    // Перебираем все двери
    for (const [doorNumber, doorData] of Object.entries(data.DOORS)) {
      // Для каждой двери перебираем её части (обычно только часть "1")
      for (const [partNumber, partData] of Object.entries(doorData)) {
        // Каждая часть может содержать несколько элементов (0, 1 и т.д.), если это не двери-купе
        // тогда здесь уже будет id материала
        if (typeof partData === "number") {
          const description =
            appData.value["FASADE"][partData].NAME ||
            `Неизвестный материал (ID: ${partData})`;
          result.push({
            key: `Цвет фасада ${doorNumber}`,
            value: ` дверь ${doorNumber} часть ${+partNumber + 1} : ${description}`,
          });
        } else {
          for (const [elementNumber, materialId] of Object.entries(partData)) {
            const description =
              appData.value["FASADE"][materialId].NAME ||
              `Неизвестный материал (ID: ${materialId})`;
            result.push({
              key: `Цвет фасада ${doorNumber}`,
              value: ` дверь ${partNumber} часть ${+elementNumber + 1} : ${description}`,
            });
          }
        }
      }
    }
  }

  for (const [key, value] of Object.entries(data)) {
    // console.log(getPropDefinition(key)?.NAME);
    // console.log(value);
    if (
      getPropDefinition(key)?.NAME &&
      !isObject(value) &&
      !Array.isArray(value) &&
      key !== "MODULECOLOR"
    ) {
      result.push({
        key: getPropDefinition(key)?.NAME,
        value: Array.isArray(getTypeName(key, value))
          ? value
          : getTypeName(key, value),
      });
    }

    if (key === "MODULECOLOR") {
      result.push({
        key: "Цвет корпуса",
        value: appData.value["FASADE"][value]?.NAME,
      });
    }
    if (key === "HORIZONT") {
      result.push({ key: "Горизонт", value: value });
    }
    if (getPropDefinition(key)?.NAME && Array.isArray(value)) {
      console.log("МЕХАНИЗМЫ", key, value, getPropDefinition(key)?.NAME);

      if (key === "OPTION" && value.length) {
        value.forEach((el) => {
          result.push({
            key: "Опции",
            value: appData.value["OPTION"][el]?.NAME,
          });
        });
      }
      if (
        value.length &&
        getPropDefinition(key)?.NAME &&
        ![
          "MILLING",
          "PATINA",
          "PALETTE",
          "GLASS",
          "TYPE",
          "SHOWCASE",
          "OPTION",
        ].find((item) => key.includes(item))
      ) {
        if (Array.isArray(value)) {
          console.log(key, value, "value");

          let items = [];

          if (key !== "UM_MECHANIZM") {
            value.forEach((el) => {
              items.push({
                key: appData.value["CATALOG"]["PRODUCTS"][el.ID]?.NAME ?? "",
                value: el.VALUE || "",
              });
            });
          } else {
            value.forEach((el) => {
              console.log(el, '-------el')

              items.push({
                key: `
                cекция: ${el.section} / 
                дверь: ${el.doorNum} / 
                часть: ${el.segmentNum}
                `,
                value: MECHANISM[el.mechanizm][productId].NAME || "",
              });
            });
          }

          result.push({
            key: getPropDefinition(key)?.NAME,
            value: items,
          });
        } else {
          result.push({
            key: getPropDefinition(key)?.NAME,
            value: value,
          });
        }
      }
    }

    if (getPropDefinition(key)?.NAME && isObject(value)) {
      if (
        getPropDefinition(key)?.NAME &&
        key !== "LEFTSIDECOLOR" &&
        key !== "RIGHTSIDECOLOR" &&
        key !== "TOPFASADECOLOR" &&
        key !== "BACKWALL" &&
        key !== "DOORS"
      ) {
        for (const [doorNumber, doorData] of Object.entries(value)) {
          console.log("1 уровень ", doorNumber, doorData);
          // Для каждой двери перебираем её части (обычно только часть "1")
          for (const [partNumber, partData] of Object.entries(doorData)) {
            // Каждая часть может содержать несколько элементов (0, 1 и т.д.)
            console.log("2 уровень ", partNumber, partData);

            const description =
              appData.value[getPropDefinition(key)?.type][partData].NAME ||
              `Неизвестный материал (ID: ${partData})`;
            result.push({
              key: getPropDefinition(key)?.NAME,
              value: `дверь ${doorNumber} часть ${+partNumber + 1} : ${description}`,
            });
          }
        }

        //  result.push({key: getPropDefinition(key)?.NAME, value: `обхект ${value}`})
      }

      if (key === "LEFTSIDECOLOR") {
        result.push({
          key: getPropDefinition(key)?.NAME,
          value: textValue(value),
        });
      }
      if (key === "RIGHTSIDECOLOR") {
        result.push({
          key: getPropDefinition(key)?.NAME,
          value: textValue(value),
        });
      }
      if (key === "TOPFASADECOLOR") {
        result.push({
          key: getPropDefinition(key)?.NAME,
          value: textValue(value),
        });
      }
      if (key === "BACKWALL" && value.COLOR) {
        result.push({
          key: getPropDefinition(key)?.NAME,
          value: textValue(value),
        });
      }
      if (key === "BACKWALL" && !value.COLOR) {
        result.push({ key: getPropDefinition(key)?.NAME, value: "Выключена" });
      }
    } else if (getPropDefinition(key)?.NAME && Array.isArray(value)) {
      //У шкафов ЭКО фрезеровки, палитры и т.д. приходят в формате Array, а не Object
      value.forEach((doorData, doorNumber) => {
        if (typeof doorData === "number") {
          const description =
            appData.value[getPropDefinition(key)?.type][doorData].NAME ||
            `Неизвестный материал (ID: ${doorData})`;
          result.push({
            key: getPropDefinition(key)?.NAME,
            value: `${description}`,
          });
        }
      });
    }
  }

  return result;
};

onBeforeMount(() => {
  console.log(props.item, "props.item");
});
</script>

<style scoped lang="scss">
.basket-item {
  display: grid;
  grid-template-columns: 150px 1fr 120px 120px 120px 120px 42px;
  align-items: center;
  gap: 10px;
  padding: 15px 0;
  &:not(:last-child) {
    border-bottom: 1px solid #eee;
  }
  &__product-name--error {
    color: red !important;
  }

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 12px;
    border: 1px solid #eee;
    border-radius: 10px;
    background: #fafafa;
  }
  // &__picture-img {
  //   max-width: 130px;
  //   border-radius: 8px;
  // }
  // &__picture-question {
  //   position: absolute;
  //   right: 10px;
  //   top: 10px;
  // }
  &__picture {
    margin-bottom: auto;
    text-align: center;
    max-width: 130px;
    max-height: 130px;
    border-radius: 8px;
    overflow: hidden;

    &-container {
      position: relative;
    }
    & img:first-child {
      width: 100%;
    }
    & img:last-child {
      position: absolute;
      right: 7px;
      top: 10px;
      cursor: pointer;
    }
  }

  &__product h3 {
    color: #111b21;
    font-size: 15px;
    margin-bottom: 4px;
  }

  &__props {
    grid-column: 1 / -1;
    color: #111b21;
    &-lable {
      font-weight: 600;
      font-size: 15px;
      line-height: 100%;
      letter-spacing: 0%;
      color: #a3a9b5 !important;
      margin-right: 4px;
    }

    &-block__lables {
      left: 1rem;
      position: relative;
    }

    span {
      color: #111b21;
      font-weight: 600;
    }
    ul {
      margin: 0;
      padding-left: 20px;
      list-style: none;
    }

    li {
      position: relative;
      margin-bottom: 4px;
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 100%;
      letter-spacing: 0%;
      list-style: none;
      &::after {
        content: "";
        display: block;
        width: 4px;
        height: 4px;
        background-color: #111b21;
        position: absolute;
        top: 6px;
        left: -10px;
        border-radius: 50%;
      }
    }

    .error-background {
      // background-color: red;
      color: red;
      padding: 2px 4px;
    }
  }

  &__quantity {
    display: flex;
    align-items: center;
    gap: 6px;

    &-input {
      width: 38px;
      height: 38px;
      text-align: center;
      background-color: #f6f5fa;
      border: 1px solid #ecebf1;
      font-weight: 500;
      font-style: Medium;
      font-size: 15px;
      line-height: 100%;
      letter-spacing: 0%;
      vertical-align: middle;
      color: #111b21;
    }
    &-btn {
      background-color: transparent;
      border: none;
      color: #a3a9b5;
      font-size: 2rem;
    }
  }
  &__price {
    font-weight: 500;
    font-style: Medium;
    font-size: 15px;
    line-height: 100%;
    letter-spacing: 0%;
    vertical-align: middle;
    color: #111b21;
  }
  &__old-total span {
    display: inline-block;
    position: relative;
    &::after {
      content: "";
      display: block;
      width: 100%;
      height: 1px;
      background-color: #111b21;
      position: absolute;
      top: 7px;
      left: 0;
    }
  }
}
</style>
