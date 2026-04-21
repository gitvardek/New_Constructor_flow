<template>
  <div class="project-params-dialog">
    <h3 class="project-params-dialog__label">{{ title }}</h3>
    <ClosePopUpButton class="project-params-dialog__close" @close="onCancel" />

    <div class="project-params-dialog__fields">
      <div class="project-params-dialog__field">
        <label class="project-params-dialog__field-label">Ширина, мм</label>
        <input
          v-model="widthInput"
          type="text"
          class="project-params-dialog__input"
          :placeholder="widthPlaceholder"
        />
      </div>
      <div class="project-params-dialog__field">
        <label class="project-params-dialog__field-label">Высота, мм</label>
        <input
          v-model="heightInput"
          type="text"
          class="project-params-dialog__input"
          :placeholder="heightPlaceholder"
        />
      </div>
      <div v-if="isWindow" class="project-params-dialog__field">
        <label class="project-params-dialog__field-label">Расстояние от пола, мм</label>
        <input
          v-model="distanceFromFloorInput"
          type="text"
          class="project-params-dialog__input"
          :placeholder="distanceFromFloorPlaceholder"
        />
      </div>
    </div>

    <div class="project-params-dialog__actions">
      <button class="btn btn--confirm" @click="onApply">Применить</button>
      <button class="btn btn--cancel" @click="onCancel">Отменить</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ClosePopUpButton from '@/components/ui/svg/ClosePopUpButton.vue';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import { useOpeningSizeEditorStore } from '@/store/constructor2d/store/useOpeningSizeEditorStore';
import { useWallHeightStore } from '@/store/constructor2d/store/useWallHeightStore';

const popupStore = usePopupStore();
const openingStore = useOpeningSizeEditorStore();
const wallHeightStore = useWallHeightStore();

const widthInput = ref('');
const heightInput = ref('');
const distanceFromFloorInput = ref('');

const title = computed(() => {
  const c2d = (window as unknown as { C2D?: { layers?: { doorsAndWindows?: { getDrawObjectById?: (id: string | number) => { name?: string } | undefined } } } }).C2D;
  const id = openingStore.objectId;
  if (id == null) return 'Размеры проёма';
  const obj = c2d?.layers?.doorsAndWindows?.getDrawObjectById?.(id);
  if (obj?.name === 'door') return 'Изменить размеры двери';
  if (obj?.name === 'window') return 'Изменить размеры окна';
  return 'Размеры проёма';
});

const openingType = computed(() => {
  const c2d = (window as unknown as { C2D?: { layers?: { doorsAndWindows?: { getDrawObjectById?: (id: string | number) => { name?: string } | undefined } } } }).C2D;
  const id = openingStore.objectId;
  if (id == null) return null;
  return c2d?.layers?.doorsAndWindows?.getDrawObjectById?.(id)?.name ?? null;
});

const isWindow = computed(() => openingType.value === 'window');

const maxWallMm = computed(() => wallHeightStore.wallHeightMm * 10);
const currentOpeningValuesMm = computed(() => {
  const c2d = (window as unknown as {
    C2D?: {
      layers?: {
        doorsAndWindows?: {
          getDrawObjectById?: (id: string | number) =>
            | { width: number; openingHeight?: number; distanceFromFloor?: number; name?: string }
            | undefined;
        };
      };
    };
  }).C2D;
  const id = openingStore.objectId;
  if (id == null) return null;
  const obj = c2d?.layers?.doorsAndWindows?.getDrawObjectById?.(id);
  if (!obj) return null;
  const defaultOpen = obj.name === 'door' ? 210 : 150;
  const openPlan = typeof obj.openingHeight === 'number' && obj.openingHeight > 0
    ? obj.openingHeight
    : defaultOpen;
  const floorDistPlan = obj.name === 'window' && typeof obj.distanceFromFloor === 'number' && obj.distanceFromFloor >= 0
    ? obj.distanceFromFloor
    : 0;
  return {
    width: String(obj.width * 10),
    height: String(openPlan * 10),
    distanceFromFloor: String(floorDistPlan * 10),
  };
});
const widthPlaceholder = computed(() => currentOpeningValuesMm.value?.width ?? '');
const heightPlaceholder = computed(() => currentOpeningValuesMm.value?.height ?? '');
const distanceFromFloorPlaceholder = computed(() => currentOpeningValuesMm.value?.distanceFromFloor ?? '');

const syncInputsFromObject = () => {
  const c2d = (window as unknown as {
    C2D?: {
      layers?: {
        doorsAndWindows?: {
          getDrawObjectById?: (id: string | number) =>
            | { width: number; openingHeight?: number; distanceFromFloor?: number; name?: string }
            | undefined;
        };
      };
    };
  }).C2D;

  const id = openingStore.objectId;
  if (id == null) {
    widthInput.value = '';
    heightInput.value = '';
    distanceFromFloorInput.value = '';
    return;
  }
  const obj = c2d?.layers?.doorsAndWindows?.getDrawObjectById?.(id);
  if (!obj) {
    widthInput.value = '';
    heightInput.value = '';
    distanceFromFloorInput.value = '';
    return;
  }
  const defaultOpen = obj.name === 'door' ? 210 : 150;
  const openPlan = typeof obj.openingHeight === 'number' && obj.openingHeight > 0
    ? obj.openingHeight
    : defaultOpen;
  const floorDistPlan = obj.name === 'window' && typeof obj.distanceFromFloor === 'number' && obj.distanceFromFloor >= 0
    ? obj.distanceFromFloor
    : 0;
  widthInput.value = String(obj.width * 10);
  heightInput.value = String(openPlan * 10);
  distanceFromFloorInput.value = String(floorDistPlan * 10);
};

watch(
  () => popupStore.popups.doorWindowSize,
  (open) => {
    if (open) {
      syncInputsFromObject();
    } else {
      openingStore.clear();
    }
  },
);

const parseMm = (value: string): number | null => {
  const n = Number(String(value ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const parseMmNonNegative = (value: string): number | null => {
  const n = Number(String(value ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
};

const parseOptionalMm = (value: string): number | null | undefined => {
  if (String(value ?? '').trim() === '') return undefined;
  return parseMm(value);
};

const parseOptionalMmNonNegative = (value: string): number | null | undefined => {
  if (String(value ?? '').trim() === '') return undefined;
  return parseMmNonNegative(value);
};

const onCancel = () => {
  popupStore.closePopup('doorWindowSize');
};

const onApply = () => {
  const id = openingStore.objectId;
  if (id == null) return;

  const c2d = (window as unknown as {
    C2D?: {
      layers?: {
        doorsAndWindows?: {
          getDrawObjectById?: (id: string | number) =>
            | { width: number; openingHeight?: number; distanceFromFloor?: number; name?: string }
            | undefined;
          applyOpeningDimensionsMm?: (a: string | number, w: number, hh: number, floorDistanceMm?: number) => boolean;
        };
      };
    };
  }).C2D;

  const currentObj = c2d?.layers?.doorsAndWindows?.getDrawObjectById?.(id);
  if (!currentObj) return;

  const widthParsed = parseOptionalMm(widthInput.value);
  const heightParsed = parseOptionalMm(heightInput.value);
  const floorDistParsed = isWindow.value
    ? parseOptionalMmNonNegative(distanceFromFloorInput.value)
    : 0;
  if (widthParsed === null || heightParsed === null || (isWindow.value && floorDistParsed === null)) return;

  const currentHeightMm = (typeof currentObj.openingHeight === 'number' && currentObj.openingHeight > 0
    ? currentObj.openingHeight
    : currentObj.name === 'door'
      ? 210
      : 150) * 10;
  const currentFloorDistMm = (currentObj.name === 'window'
    && typeof currentObj.distanceFromFloor === 'number'
    && currentObj.distanceFromFloor >= 0
      ? currentObj.distanceFromFloor
      : 0) * 10;

  const w = widthParsed ?? currentObj.width * 10;
  const h = heightParsed ?? currentHeightMm;
  const floorDistMm = isWindow.value ? (floorDistParsed ?? currentFloorDistMm) : 0;

  const maxH = maxWallMm.value;
  const hClamped = maxH > 0 ? Math.min(h, maxH) : h;
  const maxFloorDist = maxH > 0 ? Math.max(0, maxH - hClamped) : Number.POSITIVE_INFINITY;
  const floorDistClamped = Math.min(floorDistMm ?? 0, maxFloorDist);

  c2d?.layers?.doorsAndWindows?.applyOpeningDimensionsMm?.(id, w, hClamped, floorDistClamped);
  popupStore.closePopup('doorWindowSize');
};
</script>

<style scoped lang="scss">
.project-params-dialog {
  position: relative;
  background-color: $white;
  border-radius: 25px;
  padding: 16px;
  max-width: 318px;
  width: 100%;

  &__label {
    display: block;
    font-size: 16px;
    margin-bottom: 6px;
    color: $strong-grey;
    padding-right: 28px;
  }

  &__hint {
    font-size: 12px;
    color: $strong-grey;
    margin: 0 28px 12px 0;
    line-height: 1.35;
  }

  &__close {
    position: absolute;
    top: 16px;
    right: 16px;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__field-label {
    font-size: 14px;
    color: $strong-grey;
  }

  &__input {
    width: 100%;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    background-color: $light-stroke;
    font-size: 16px;
    outline: none;
    box-sizing: border-box;
  }

  &__actions {
    display: flex;
    justify-content: flex-start;
    gap: 12px;

    .btn {
      font-size: 16px;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;

      &--confirm {
        background-color: $red;
        color: white;
      }

      &--cancel {
        background-color: transparent;
        color: $strong-grey;
      }
    }
  }
}
</style>
