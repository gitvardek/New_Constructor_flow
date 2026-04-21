<script setup lang="ts">
//@ts-nocheck

import {
  computed,
  ref,
  onMounted,
  onUnmounted,
  toRaw,
  onBeforeMount,
} from "vue";

import { useAppData } from "@/store/appliction/useAppData";
import { useMenuStore } from "@/store/appStore/useMenuStore";
import { useModelStore } from "@/store/appStore/useModelStore";
import { useModelState } from "@/store/appliction/useModelState";
import { usePopupStore } from "@/store/appStore/popUpsStore";
import { useEventBus } from "@/store/appliction/useEventBus";
import { useCustomiserStore } from "@/store/appStore/useCustomiserStore";
import { useTransformController } from "../ui/transformController/useTransformController";

import PopUpOptionsMenu from "@/components/left-menu/option/PopUpOptionsMenu.vue";
import RoomOptionsMenu from "@/components/left-menu/option/RoomOptionsMenu.vue";
import S2DAppartSVG from "@/components/ui/svg/left-menu/S2DAppartSVG.vue";
import MainButton from "../ui/buttons/MainButton.vue";
import DirectionControl from "../ui/direction/DirectionControl.vue";

import MainSelect from "@/components/ui/selects/MainSelect.vue";
import CatalogSVG from "../ui/svg/CatalogSVG.vue";
import Accordion from "../ui/accordion/Accordion.vue";

const eventBus = useEventBus();
const store = useModelStore();
const modelState = useModelState();

const menuStore = useMenuStore();
const customiserStore = useCustomiserStore();
const popupStore = usePopupStore();

const {
  getTransformControlsValue,
  setTransformControlsValue,
  getTransformControlSnapAngles,
  setControlSnapAngle,
  getControlSnapAngle,
  getTransformControlsName,
  setTransformControlsName,
} = useTransformController();

const catalogSectionsType = ref(null);
const catalogSections = ref(null);
const { _PRODUCTS } = modelState;

const selectedSectionType = ref<string>("standart");
const cameraBtn = ref<InstanceType<typeof MainButton>[]>([]);
const roomOptionsRef = ref<HTMLElement | null>(null);
const productSerch = ref(null);
const filteredProductList = ref<any[]>([]);
const filteredCatalogSections = ref(null);

const selectCatalog = (value: string) => {
  selectedSectionType.value = value;

  filterCatalog(value);
};

const onDragStart = (modelId: string) => {
  store.selectModel(modelId);
};

const closeAllMenus = () => {
  menuStore.closeAllMenus();
  disableTransformMode();
};

const showTechMenu = (id: string, products: []) => {
  clearSearch();
  disableTransformMode();
  menuStore.openMenu("tech", id, products);
  customiserStore.hideCustomiserPopup();
};

const disableTransformMode = () => {
  eventBus.emit("A:GlobalTransformMode_Off");
  setTransformControlsValue(false);
};

// Новое меню
const showRoomParMenu = () => {
  // customiserStore.hideCustomiserPopup();
  menuStore.openMenu("roomPar");
  // eventBus.emit("A:TransformMode_Off");
  // modelState.setTransformControlsValue(false);
  disableTransformMode();
  eventBus.emit("A:ClearSelected", { object: null });
};

const changeCameraPos = (value: number) => {
  eventBus.emit("A:ChangeCameraPos", value);
};

const openPopup = (popupName: keyof typeof popupStore.popups) => {
  disableTransformMode();
  popupStore.openPopup(popupName);
};

const filterCatalog = (type) => {
  filteredCatalogSections.value = Object.values(catalogSections.value)
    .filter((item) => {
      return item.TYPE === type && item.PRODUCTS;
    })
    .sort((a, b) => a.SORT - b.SORT);
};

let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

const onSearchChange = (e: Event) => {
  const value = e.target.value.trim();

  clearTimeout(debounceTimeout);

  if (!value) {
    filteredProductList.value = [];
    return;
  }

  if (menuStore.openMenus.length === 0) {
    menuStore.openMenu("tech");
    customiserStore.hideCustomiserPopup();
  }

  debounceTimeout = setTimeout(() => {
    const reg = new RegExp(value.toLowerCase(), "g");
    const filteredData = Object.values(_PRODUCTS).filter((prod) =>
      reg.test(prod.NAME.toLowerCase()),
    );
    filteredProductList.value = filteredData;
  }, 400);
};

const clearSearch = () => {
  filteredProductList.value = [];
  productSerch.value.value = null;
};

onBeforeMount(() => {
  const app = useAppData().getAppData;

  const prepare = JSON.parse(JSON.stringify(app.CATALOG.SECTIONS_TYPE));
  // delete prepare.room; //Убираем ниши

  catalogSectionsType.value = prepare;
  catalogSections.value = app.CATALOG.SECTIONS;

  filterCatalog(selectedSectionType.value);
});

onMounted(() => {
  eventBus.on("A:Selected", () => {
    // menuStore.closeAllMenus();
    menuStore.closeMenu("roomPar");
  });
});

onUnmounted(() => {
  closeAllMenus();
});
</script>

<template>
  <section class="options">
    <div class="options__container">
      <div class="options-design">
        <h1 class="options__title">Проектирование</h1>
        <div class="goods">
          <!-- <div class="goods-item">
            <S2DAppartSVG class="goods-item__image" />
            <p class="goods-item__title">2D квартира</p>
            <div class="radial-sphere"></div>
          </div> -->

          <div
            class="goods-item"
            :class="{ active: menuStore.openMenus == 'roomPar' }"
            @click="showRoomParMenu"
          >
            <S2DAppartSVG class="goods-item__image" />
            <p class="goods-item__title">Параметры помещения</p>
            <div class="radial-sphere"></div>
          </div>
        </div>
      </div>

      <div class="options-design">
        <h1 class="options__title">Товары</h1>

        <div class="goods-items" @click="openPopup('catalog')">
          <CatalogSVG class="goods-items__image" />
          <p class="goods-items__title">Общий каталог</p>
          <div class="radial-sphere"></div>
        </div>

        <input
          ref="productSerch"
          class="search"
          type="text"
          placeholder="Поиск"
          @input="onSearchChange"
        />
        <!-- <MainSelect
          v-model="selectedSectionType"
          :options="catalogSectionsType"
          @change="closeAllMenus"
        /> -->
        <Accordion>
          <template #title>
            <p class="list__title">
              {{ catalogSectionsType[selectedSectionType] }}
            </p>
          </template>
          <template #params="{ onToggle }">
            <ul class="list__details_contant">
              <li v-for="(section, key) in catalogSectionsType" :key="key">
                <div
                  class="list__item"
                  @click="
                    () => {
                      selectCatalog(key);
                      onToggle();
                    }
                  "
                >
                  <p class="list__name">{{ catalogSectionsType[key] }}</p>
                </div>
              </li>
            </ul>
          </template>
        </Accordion>

        <div class="goods">
          <div
            v-for="(item, index) in filteredCatalogSections"
            :key="index"
            class="goods-item"
            :class="{
              active:
                menuStore.openMenus == 'tech' &&
                item.ID === menuStore.menuContentsByID,
            }"
            @click="showTechMenu(item.ID, item.PRODUCTS)"
          >
            <S2DAppartSVG class="goods-item__image" />
            <p class="goods-item__title">{{ item.NAME }}</p>
            <div class="radial-sphere"></div>
          </div>
        </div>
      </div>
    </div>
    <transition name="slide--left">
      <PopUpOptionsMenu
        :filteredData="filteredProductList"
        v-if="menuStore.openMenus == 'tech'"
        @close-menu="clearSearch"
      />
    </transition>
    <transition name="slide--left">
      <RoomOptionsMenu
        v-if="menuStore.openMenus == 'roomPar'"
        ref="roomOptionsRef"
      />
    </transition>

    <div class="options__camera">
      <h1 class="options__title">Позиция камеры</h1>
      <div class="options__camera--container">
        <DirectionControl @changeDirectionPos="changeCameraPos" />
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.options {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 315px;
  height: 100%;
  border-right: 1px solid $light-stroke;
  background-color: $bg;
  // transform-style: preserve-3d;
  z-index: 1;
  &-design {
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  &__title {
    margin-bottom: 10px;
  }
  &-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  &-item {
    height: 50px;
    position: relative;
    display: flex;
    align-items: center;
    gap: 25px;
    cursor: pointer;
    padding: 0 15px;
    &__title {
      z-index: 5;
      transition: 0.15s;
    }

    &__image {
      z-index: 5;
    }

    &.active {
      .options-item__title {
        color: $white;
      }

      .radial-sphere {
        max-width: 300px;
        background: $red;
      }
    }
  }
  &__container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    position: relative;
    background: $bg;
    transform-style: preserve-3d;

    // @media screen and (min-width: 1329px) {
    //   padding: 10px 20px;
    // }

    .room {
      display: flex;
      gap: 15px;
      position: absolute;
      top: 15px;
      left: 320px;
      // transform: translateZ(-10px);
      // transition: 0.5s ease-in-out;

      .room-popup {
        width: 570px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        position: relative;
        padding: 15px;
        background: $white;
        box-shadow: 0px 0px 10px 0px #3030301a;
        z-index: 1;
        border-radius: 15px;

        &__container {
          display: flex;
          flex-direction: column;
          gap: 15px;

          .room-select {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 10px 0;
            border-top: 1px solid $stroke;
            border-bottom: 1px solid $stroke;
          }

          .room-options {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;

            .option-small {
              flex: 46%;
              padding: 10px;
              border-radius: 15px;
              background-color: $bg;

              .option-label {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;

                .label__image {
                  display: flex;
                }

                .label__text {
                  font-size: 15px;
                  font-weight: 600;
                  color: $strong-grey;
                }
              }

              .option__checkbox {
                display: flex;
                align-items: center;
                gap: 10px;
              }
            }

            .option-standart {
              width: 100%;
              padding: 10px;
              border-radius: 15px;
              background-color: $bg;

              .select-group {
                display: flex;
                align-items: center;
                justify-content: space-between;

                .option-label {
                  width: 100%;
                  max-width: 262.5px;
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  margin-bottom: 10px;

                  .label__image {
                    display: flex;
                  }

                  .label__text {
                    font-size: 15px;
                    font-weight: 600;
                    color: $strong-grey;
                  }
                }
              }

              .option__checkbox {
                display: flex;
                align-items: center;
                gap: 10px;
              }
            }
          }
        }

        &.active {
          left: 330px;
        }
      }

      .color-select {
        width: 373px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 15px;
        background: $white;
        box-shadow: 0px 0px 10px 0px #3030301a;
        z-index: 1;
        border-radius: 15px;
        transition: 0.5s ease-in-out;

        .menu__close {
          position: absolute;
          right: 15px;
          top: 15px;
          cursor: pointer;
        }

        &__container {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;

          .color-item {
            width: 100%;
            display: flex;
            align-items: center;
            padding: 10px;
            background-color: $bg;
            border-radius: 15px;
            gap: 10px;

            &__title {
              font-size: 15px;
              font-weight: 500;
            }
          }
        }
      }

      &.active {
        left: 330px;
      }
    }
  }
  &__camera {
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 0px 10px;
    margin-bottom: auto;
    background: $bg;

    transition-property: opacity, filter;
    transition-duration: 0.3s;
    transition-timing-function: ease;

    &--container {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @media screen and (min-width: 1329px) {
      padding: 0 20px;
    }
  }
}

.icon {
  font-size: var(--font);
}

.button {
  &__rounded {
    padding: var(--value);
  }
}

.goods {
  max-height: 30vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;

  // @media screen and (min-width: 1329px) {
  //   max-height: 30vh;
  // }

  &-items {
    min-height: 48px;
    position: relative;
    display: flex;
    align-items: center;
    gap: 25px;
    padding: 0 15px;
    cursor: pointer;
    transition: 0.15s ease-in-out;

    &__title {
      z-index: 5;
      transition: 0.15s;
    }

    &__image {
      z-index: 5;
    }

    &.active {
      .goods-item__title {
        color: $white;
      }

      .radial-sphere {
        max-width: 300px;
        background: $red;
      }
    }
  }

  &-item {
    min-height: 50px;
    position: relative;
    display: flex;
    align-items: center;
    gap: 25px;
    padding: 0 15px;
    cursor: pointer;
    transition: 0.15s ease-in-out;

    &__title {
      z-index: 5;
      transition: 0.15s;
    }

    &__image {
      z-index: 5;
    }
  }

  .goods-item {
    min-height: 50px;
    position: relative;
    display: flex;
    align-items: center;
    gap: 25px;
    padding: 0 15px;
    cursor: pointer;
    transition: 0.15s ease-in-out;

    &.active {
      .goods-item__title {
        color: $white;
      }

      .radial-sphere {
        max-width: 300px;
        background: $red;
      }
    }
  }
}

.list {
  &__details_contant {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 5px;
  }
  &__item {
    color: $black;
    cursor: pointer;

    transition-property: color;
    transition-duration: 0.2s;
    transition-timing-function: ease;

    @media (hover: hover) {
      &:hover {
        color: $dark-grey;
      }
    }
  }
}

.radial-sphere {
  width: 100%;
  min-width: 50px;
  max-width: 50px;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 360px;
  background: $stroke;
  z-index: 1;
  transition: 0.15s;
}

.search {
  width: 95%;
  border-radius: 15px;
  padding: 10px 15px;
  background-color: $stroke;
}
</style>
