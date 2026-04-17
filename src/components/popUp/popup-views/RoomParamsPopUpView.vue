<template>
  <div class="room-params-dialog">
    <h3 class="room-params-dialog__label">Параметры помещения</h3>
    <ClosePopUpButton class="room-params-dialog__close" @close="onCancel" />

    <div class="room-params-dialog__fields">
      <div class="room-params-dialog__field room-params-dialog__field--rooms">
        <label class="room-params-dialog__field-label">Комнаты</label>
        <RoomList
          :rooms="roomsList"
          :currentRoomId="currentRoomId"
          @load-room="switchRoom"
          @delete-room="deleteRoom"
        />
      </div>

      <div class="room-params-dialog__field room-params-dialog__field--height">
        <label class="room-params-dialog__field-label">Высота стен, мм</label>
        <div class="room-params-dialog__row-actions">
          <input
            :value="getDisplayedHeight()"
            type="text"
            class="room-params-dialog__input"
            data-room-param-field="height"
            @input="onHeightInput"
            @focus="activeFieldKey = 'height'"
            @blur="activeFieldKey = null"
          />
          <button class="btn btn--confirm" @click="onApplyHeight">Изменить</button>
        </div>
      </div>

      <div
        v-for="wall in wallRows"
        :key="String(wall.id)"
        class="room-params-dialog__field"
        :class="{ 'room-params-dialog__field--readonly': wall.isClosing }"
      >
        <div class="room-params-dialog__field-header">
          <label class="room-params-dialog__field-label">
            {{ wall.title }}
          </label>
          <span v-if="wall.isClosing" class="room-params-dialog__badge">closing</span>
        </div>

        <div class="room-params-dialog__subfield">
          <label class="room-params-dialog__field-label">Длина, мм</label>
          <div class="room-params-dialog__row-actions">
            <input
              :value="getDisplayedLength(wall)"
              type="text"
              class="room-params-dialog__input"
              :disabled="wall.isClosing"
              :data-room-param-field="`length:${String(wall.id)}`"
              @input="onLengthInput(wall.id, $event)"
              @focus="activeFieldKey = `length:${String(wall.id)}`"
              @blur="activeFieldKey = null"
            />
            <button
              class="btn btn--confirm"
              :disabled="wall.isClosing"
              @click="onApplyLength(wall.id)"
            >
              Изменить
            </button>
          </div>
        </div>

        <div class="room-params-dialog__subfield">
          <label class="room-params-dialog__field-label">Угол, °</label>
          <div class="room-params-dialog__row-actions">
            <input
              :value="getDisplayedAngle(wall)"
              type="text"
              class="room-params-dialog__input"
              :disabled="wall.isClosing || !wall.isAngleEditable"
              :data-room-param-field="`angle:${String(wall.id)}`"
              @input="onAngleInput(wall.id, $event)"
              @focus="activeFieldKey = `angle:${String(wall.id)}`"
              @blur="activeFieldKey = null"
            />
            <button
              class="btn btn--confirm"
              :disabled="wall.isClosing || !wall.isAngleEditable"
              @click="onApplyAngle(wall.id)"
            >
              Изменить
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="room-params-dialog__actions">
      <button class="btn btn--cancel" @click="onCancel">Закрыть</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import ClosePopUpButton from '@/components/ui/svg/ClosePopUpButton.vue';
import RoomList from '@/components/left-menu/option/roomOptions/RoomList.vue';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import { useRoomState } from '@/store/appliction/useRoomState';
import { useSchemeTransition } from '@/store/canvasMerge/schemeTransition';
import { useConstructor2DHistory } from '@/store/constructor2d/useConstructor2DHistory';
import { useWallHeightStore } from '@/store/constructor2d/store/useWallHeightStore';

type RoomParamsRow = {
  id: string | number;
  title: string;
  isClosing: boolean;
  isAngleEditable: boolean;
  lengthMm: number;
  angleDeg: number | null;
};

const popupStore = usePopupStore();
const roomState = useRoomState();
const schemeTransition = useSchemeTransition();
const constructor2DHistory = useConstructor2DHistory();
const wallHeightStore = useWallHeightStore();

const { getRooms, getRoomId } = storeToRefs(roomState);
const roomsList = computed(() => getRooms.value || []);
const currentRoomId = computed(() => getRoomId.value);
const heightInput = ref(String(wallHeightStore.wallHeightMm * 10));
const draftLengths = ref<Record<string, string>>({});
const draftAngles = ref<Record<string, string>>({});
const activeFieldKey = ref<string | null>(null);
const wallRows = ref<RoomParamsRow[]>([]);
let liveSyncTimer: number | null = null;

const getPlanner = () => (globalThis as any).C2D?.layers?.planner;

const unwrapMaybeRef = <T,>(value: T | { value: T }): T => {
  if (value && typeof value === 'object' && 'value' in value) {
    return value.value as T;
  }
  return value as T;
};

const getActiveRoomId = (): string | number | null => {
  const currentRoomIdValue = unwrapMaybeRef<string | number | null>(roomState.getRoomId as any);
  if (currentRoomIdValue !== null && currentRoomIdValue !== undefined && currentRoomIdValue !== '') {
    return currentRoomIdValue;
  }
  const planner = getPlanner();
  const firstWall = planner?.objectWalls?.find?.((wall: any) => wall.name !== 'dividing_wall');
  return firstWall?.roomId ?? null;
};

const refreshWallRows = () => {
  const planner = getPlanner();
  const roomId = getActiveRoomId();
  if (!planner || roomId == null) {
    wallRows.value = [];
    return;
  }

  const orderedWalls = planner.getOrderedChain?.(roomId) ?? [];
  wallRows.value = orderedWalls.map((wall: any, index: number) => {
    const angleGeometry = planner.getWallPoint0AngleGeometry?.(wall.id);
    return {
      id: wall.id,
      title: wall.isClosing ? `W${index + 1} (closing)` : `W${index + 1}`,
      isClosing: wall.isClosing === true,
      isAngleEditable: planner.isWallPoint0AngleEditable?.(wall.id) === true,
      lengthMm: Math.round((wall.width ?? 0) * 10),
      angleDeg: angleGeometry ? Number(angleGeometry.currentAngleDeg.toFixed(2)) : null,
    };
  });
};

const formatAngle = (angleDeg: number | null): string =>
  angleDeg == null ? '' : String(angleDeg).replace('.', ',');

const getDisplayedHeight = (): string =>
  activeFieldKey.value === 'height'
    ? heightInput.value
    : String(wallHeightStore.wallHeightMm * 10);

const getDisplayedLength = (wall: RoomParamsRow): string => {
  const fieldKey = `length:${String(wall.id)}`;
  if (activeFieldKey.value === fieldKey) {
    return draftLengths.value[String(wall.id)] ?? String(wall.lengthMm);
  }
  return String(wall.lengthMm);
};

const getDisplayedAngle = (wall: RoomParamsRow): string => {
  const fieldKey = `angle:${String(wall.id)}`;
  if (activeFieldKey.value === fieldKey) {
    return draftAngles.value[String(wall.id)] ?? formatAngle(wall.angleDeg);
  }
  return formatAngle(wall.angleDeg);
};

const onHeightInput = (event: Event) => {
  heightInput.value = (event.target as HTMLInputElement).value;
};

const onLengthInput = (wallId: string | number, event: Event) => {
  draftLengths.value[String(wallId)] = (event.target as HTMLInputElement).value;
};

const onAngleInput = (wallId: string | number, event: Event) => {
  draftAngles.value[String(wallId)] = (event.target as HTMLInputElement).value;
};

watch(
  () => popupStore.popups.roomParams,
  (open) => {
    if (open) {
      heightInput.value = String(wallHeightStore.wallHeightMm * 10);
      refreshWallRows();
    }
  },
);

const reinit2D = async () => {
  await nextTick();
  const c2d = (globalThis as any).C2D;
  if (!c2d?.layers) return;

  c2d.layers.dimensionDisplay?.hide?.();
  c2d.layers.startPointActiveObject?.activate?.(false);
  c2d.layers.arrowRulerActiveObject?.clearGraphic?.();

  if (c2d.layers.planner && c2d.layers.doorsAndWindows) {
    c2d.layers.planner.init(true);
    c2d.layers.doorsAndWindows.init(true);
  }
};

const switchRoom = async (roomId: string | number) => {
  roomState.setCurrentRoomId(roomId);
  await reinit2D();
  refreshWallRows();
};

const deleteRoom = async (roomId: string | number) => {
  roomState.removeRoom(roomId);
  roomState.routConvertData('/2d');
  await reinit2D();

  const snapshot = schemeTransition.getAllData();
  if (snapshot && Array.isArray(snapshot)) {
    constructor2DHistory.addAction(JSON.parse(JSON.stringify(snapshot)));
  }
  refreshWallRows();
};

const parsePositiveNumber = (value: string): number | null => {
  const parsed = Number(String(value ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const onApplyHeight = () => {
  const parsed = parsePositiveNumber(heightInput.value);
  if (parsed == null) return;
  wallHeightStore.setWallHeightMm(parsed / 10);
  (globalThis as any).C2D?.updateRoomStore?.();
  refreshWallRows();
};

const onCancel = () => {
  popupStore.closePopup('roomParams');
};

const onApplyLength = (wallId: string | number) => {
  const parsed = parsePositiveNumber(draftLengths.value[String(wallId)]);
  if (parsed == null) return;
  const c2d = (globalThis as any).C2D;
  const ok = c2d?.layers?.planner?.applyWallLengthMm?.(wallId, parsed);
  if (!ok) return;
  c2d?.updateRoomStore?.();
  refreshWallRows();
};

const onApplyAngle = (wallId: string | number) => {
  const parsed = parsePositiveNumber(draftAngles.value[String(wallId)]);
  if (parsed == null) return;
  const c2d = (globalThis as any).C2D;
  const ok = c2d?.layers?.planner?.applyWallAngleDeg?.(wallId, parsed);
  if (!ok) return;
  c2d?.updateRoomStore?.();
  refreshWallRows();
};

const stopLiveSync = () => {
  if (liveSyncTimer !== null) {
    window.clearInterval(liveSyncTimer);
    liveSyncTimer = null;
  }
};

const startLiveSync = () => {
  if (liveSyncTimer !== null) return;
  liveSyncTimer = window.setInterval(() => {
    if (!popupStore.popups.roomParams) return;
    refreshWallRows();
  }, 120);
};

watch(wallRows, () => {
  if (popupStore.popups.roomParams && activeFieldKey.value !== 'height') {
    heightInput.value = String(wallHeightStore.wallHeightMm * 10);
  }
});

onMounted(() => {
  refreshWallRows();
  startLiveSync();
});

onUnmounted(() => {
  stopLiveSync();
});
</script>

<style scoped lang="scss">
.room-params-dialog {
  position: relative;
  background-color: $white;
  border-radius: 25px;
  padding: 20px;
  width: min(92vw, 1600px);
  max-width: 1600px;
  max-height: min(86vh, 960px);
  overflow: auto;

  &__label {
    display: block;
    font-size: 16px;
    margin-bottom: 8px;
    color: $strong-grey;
    padding-right: 28px;
  }

  &__close {
    position: absolute;
    top: 16px;
    right: 16px;
  }

  &__fields {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 16px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    background: $light-stroke;
    flex: 1 1 260px;
    min-width: 260px;
  }

  &__field--rooms {
    flex-basis: 100%;
  }

  &__field--height {
    background: #f8f4ea;
    flex-basis: 100%;
  }

  &__field--readonly {
    background: #f1f1f1;
  }

  &__row-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  &__field-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__field-label {
    font-size: 14px;
    color: $strong-grey;
  }

  &__subfield {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__input {
    width: 100%;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    background-color: $white;
    font-size: 16px;
    outline: none;
    box-sizing: border-box;

    &:disabled {
      background: #ebebeb;
      color: #777;
      cursor: not-allowed;
    }
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #dedede;
    color: #666;
    font-size: 12px;
    padding: 2px 8px;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
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

@media (max-width: 900px) {
  .room-params-dialog {
    width: min(96vw, 1600px);
    padding: 16px;

    &__field {
      min-width: 100%;
    }
  }
}
</style>
