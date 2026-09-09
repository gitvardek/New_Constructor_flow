<script setup lang="ts">
// @ts-nocheck

// ==== Гардеробная система (WARDROBE) ====
// Подраздел "Настройка профилей" панели "Секторы"
// (WardrobeRightPanelView.vue) — список ВСЕХ профилей модуля, а не только
// выбранного сектора: профиль стоит на границе секторов или на краю модуля
// (GridModule.wardrobeProfiles). Параметры:
// - Высота (MainInput): GridModule.height = максимум по всем профилям
//   (UMconstructorClass.reset()), а min/max зависят от КРЕПЛЕНИЯ.
// - Тип профиля (AccordionSelect): товар из
//   _WARDROBE_SYSTEM[productID].profile, у каждого свой список цветов.
// - Крепление профиля (AccordionSelect): из
//   _WARDROBE_SYSTEM[productID].fastenings (Пол-потолок/Пол-стена/...); его
//   type задаёт цвет в 2D (SceneBuilder.createWardrobeProfile) и диапазон
//   высоты.
// - Цвет: как материал полок в WardrobeFillingsView.vue (Accordion +
//   MaterialSelector.vue с карточкой в заголовке), каталог —
//   .profile[profileProductId].colors через _COLOR, НЕ _FASADE
//   (getWardrobeProfileMaterials).

import { ref, toRefs, onMounted, watch } from "vue";
import UMconstructorClass from "@/components/UMconstructor/ts/UMconstructorClass.ts";
import { GridModule } from "@/components/UMconstructor/types/UMtypes.ts";
import {
  getWardrobeProfileProducts,
  getWardrobeProfileFastenings,
  getWardrobeProfileMaterials,
  getWardrobeProfileHeightRange,
} from "@/components/UMconstructor/utils/WardrobeSystem.ts";
import { useModelState } from "@/store/appliction/useModelState.ts";
import { _URL } from "@/types/constants";
import Accordion from "@/components/ui/accordion/Accordion.vue";
import AccordionSelect from "@/components/ui/accordion/AccordionSelect.vue";
import MaterialSelector from "@/components/right-menu/customiser-pages/ColorRightPage/MaterialSelector.vue";
import MainInput from "@/components/ui/inputs/MainInput.vue";

const modelState = useModelState();

const props = defineProps({
  module: {
    type: ref<GridModule>,
    required: true,
  },
  UMconstructor: {
    type: UMconstructorClass,
    required: true,
  },
});

const { module, UMconstructor } = toRefs(props);

// Выделенный профиль (уточнение пользователя: клик по профилю на канвасе
// <-> выделение в этой панели) — UM_STORE.selectedWardrobeProfileId, тот же
// ref+watch приём, что и у selectedShelfId в WardrobeFillingsView.vue (не
// computed — тот же стиль, что уже устоялся в соседних wardrobe-панелях).
const selectedProfileId = ref<number | null>(null);

const refreshSelectedProfile = () => {
  selectedProfileId.value = UMconstructor?.value?.UM_STORE.selectedWardrobeProfileId ?? null;
};

onMounted(refreshSelectedProfile);
watch(() => UMconstructor?.value?.UM_STORE.selectedWardrobeProfileId, refreshSelectedProfile);

// Обратное направление — клик по профилю ЗДЕСЬ выделяет его на канвасе.
// UMconstructor.selectWardrobeProfile — тот же общий вход, что использует и
// сам канвас (ctx.selectWardrobeProfile), пишет в UM_STORE И толкает
// подсветку в уже отрисованные PIXI-объекты.
const selectProfile = (profileId: number) => {
  UMconstructor.value.selectWardrobeProfile(profileId);
};

// Список товаров-профилей ("Тип профиля") и список креплений ("Крепление
// профиля") — общие для всего модуля (не зависят от конкретного profileId),
// поэтому не завязаны на v-for ниже как функции с параметром.
const profileProductOptions = () =>
  getWardrobeProfileProducts(module.value?.productID).map((p) => ({ value: p.id, label: p.name }));

const fasteningOptions = () =>
  getWardrobeProfileFastenings(module.value?.productID).map((f) => ({ value: f.id, label: f.name }));

// Список цветов зависит от КОНКРЕТНОГО товара-профиля этой записи.
const profileMaterialsList = (profile: any) =>
  getWardrobeProfileMaterials(module.value?.productID, profile.profileProductId);

// Диапазон высоты зависит от КОНКРЕТНОГО крепления этой записи.
const profileHeightRange = (profile: any) =>
  getWardrobeProfileHeightRange(module.value?.productID, profile.fasteningId);

const onTypeChange = (profileId: number, profileProductId: number) => {
  UMconstructor.value.PROFILES.updateWardrobeProfileType(module.value, profileId, profileProductId);
};

const onFasteningChange = (profileId: number, fasteningId: number) => {
  UMconstructor.value.PROFILES.updateWardrobeProfileFastening(module.value, profileId, fasteningId);
};

const onColorChange = (profileId: number, color: any) => {
  UMconstructor.value.PROFILES.updateWardrobeProfileColor(module.value, profileId, color.ID);
};

const onHeightChange = (profileId: number, value: number) => {
  UMconstructor.value.PROFILES.updateWardrobeProfileHeight(module.value, profileId, value);
};

// Карточка текущего цвета в заголовке Accordion — см. WardrobeFillingsView.vue.
const currentProfileColor = (profile: any) => (profile.colorId ? modelState._COLOR[profile.colorId] : null);

const currentProfileColorImg = (profile: any) => {
  const color = currentProfileColor(profile);
  return color?.PREVIEW_PICTURE ? _URL + color.PREVIEW_PICTURE : null;
};

const currentProfileColorName = (profile: any) => currentProfileColor(profile)?.NAME ?? "Не выбран";
</script>

<template>
  <div class="UM wardrobe-profiles">
    <p v-if="!module?.wardrobeProfiles?.length" class="UM no-select wardrobe-profiles__hint">
      В модуле нет ни одного профиля.
    </p>

    <div v-for="(profile, profileIndex) in module.wardrobeProfiles" :key="profile.id"
      :class="['UM wardrobe-profiles__item', { 'wardrobe-profiles__item--active': profile.id === selectedProfileId }]"
      @click="selectProfile(profile.id)">
      <p class="UM no-select wardrobe-profiles__item-title">Профиль {{ profileIndex + 1 }}</p>

      <div class="actions-items--height">
        <div class="actions-inputs">
          <p class="actions-title">Высота профиля</p>
          <div class="actions-input--container">
            <MainInput :type="'number'" :inputClass="'actions-input'" :modelValue="profile.height"
              :min="profileHeightRange(profile).min" :max="profileHeightRange(profile).max" :step="1" :isUM="true"
              @update:modelValue="(value) => onHeightChange(profile.id, Number(value))" />
          </div>
        </div>
      </div>

      <AccordionSelect label="Тип профиля" :options="profileProductOptions()" :modelValue="profile.profileProductId"
        @update:modelValue="(value) => onTypeChange(profile.id, value)" />

      <AccordionSelect label="Крепление профиля" :options="fasteningOptions()" :modelValue="profile.fasteningId"
        @update:modelValue="(value) => onFasteningChange(profile.id, value)" />

      <Accordion class="wardrobe-profiles__color">
        <template #title>
          <div class="wardrobe-material-card">
            <img v-if="currentProfileColorImg(profile)" class="wardrobe-material-card__img"
              :src="currentProfileColorImg(profile)" alt="" />
            <div v-else class="wardrobe-material-card__img wardrobe-material-card__img--empty"></div>
            <div class="wardrobe-material-card__info">
              <p class="wardrobe-material-card__label">Цвет</p>
              <p class="wardrobe-material-card__name">{{ currentProfileColorName(profile) }}</p>
            </div>
          </div>
        </template>

        <div class="wardrobe-profiles__color-body">
          <MaterialSelector :materials="profileMaterialsList(profile)"
            @select="(color) => onColorChange(profile.id, color)" />
        </div>
      </Accordion>
    </div>
  </div>
</template>

<style scoped lang="scss">
.wardrobe-profiles {
  padding: 0.75rem;

  overflow-y: scroll;
  overflow-x: hidden;
  max-height: calc(var(--modal-large-height) - 75px);

  &__hint {
    opacity: 0.6;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.15s ease;

    // Тот же цвет/приём, что и у выделенной карточки полки, см.
    // WardrobeFillingsView.vue (.wardrobe-fillings__item--active).
    &--active {
      background: #d1ffd6a4;
      box-shadow: 0 0 0 1px rgba(5, 5, 5, 0.4) inset;
    }
  }

  &__item-title {
    font-weight: bold;
    opacity: 0.7;
    margin-bottom: 0.5rem;
  }

  &__color {
    margin-top: 0.5rem;
  }

  // Тот же приём, что и в WardrobeFillingsView.vue/WardrobeInsertView.vue —
  // MaterialSelector.vue требует жёсткую (не max-) высоту от родителя для
  // своей внутренней прокрутки, Accordion.vue такой родитель не даёт сам.
  &__color-body {
    height: fit-content;
    max-height: 50rem;

    :deep(.material-config__wrapper) {
      height: 100%;
      max-height: 100%;
    }
  }
}

.wardrobe-material-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;

  &__img {
    height: 45px;
    width: 45px;
    flex-shrink: 0;
    border-radius: 12px;
    box-shadow: 0px 0px 6px 0px rgba(48, 48, 48, 0.1);
    // object-fit: cover;

    &--empty {
      background: rgba(0, 0, 0, 0.05);
    }
  }

  &__info {
    min-width: 0;
  }

  &__label {
    color: rgb(131, 133, 135);
    font-size: 1.2rem;
    margin-bottom: 0;
  }

  &__name {
    font-size: 1.4rem;
    margin-bottom: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
