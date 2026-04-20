<template>
  <div
    class="room-params-dialog"
    :class="{ 'room-params-dialog--transparent': isTransparentMode }"
  >
    <h3 class="room-params-dialog__label">Параметры помещения</h3>
    <ClosePopUpButton class="room-params-dialog__close" @close="onCancel" />

    <div class="room-params-dialog__toolbar">
      <div class="room-params-dialog__toolbar-section room-params-dialog__toolbar-section--rooms">
        <div class="room-params-dialog__toolbar-heading">
          <label class="room-params-dialog__toolbar-label">Комнаты</label>
          <button class="btn btn--confirm room-params-dialog__add-room-button" @click="onCreateRoom">
            + Комната
          </button>
        </div>
        <RoomList
          :rooms="roomsList"
          :currentRoomId="currentRoomId"
          @load-room="switchRoom"
          @delete-room="deleteRoom"
        />
      </div>

      <div class="room-params-dialog__toolbar-section room-params-dialog__toolbar-section--height">
        <label class="room-params-dialog__toolbar-label">Высота стен, мм</label>
        <div class="room-params-dialog__toolbar-actions">
          <input
            v-model="heightInput"
            type="text"
            class="room-params-dialog__toolbar-input"
            data-room-param-field="height"
            @focus="isEditingHeight = true"
            @blur="onHeightBlur"
          />
          <button class="btn btn--confirm" @mousedown.prevent @click="onApplyHeight">Изменить</button>
        </div>
        <label class="room-params-dialog__transparent-toggle control control-checkbox">
          <input v-model="isTransparentMode" type="checkbox" />
          <div class="control_indicator"></div>
          <span>Прозрачный режим</span>
        </label>
      </div>
    </div>

    <p class="room-params-dialog__angle-note">
      Углы стен ограничены диапазоном 15°–300°. Значения за пределами диапазона не применяются.
    </p>

    <div class="room-params-dialog__cards">
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
          <span v-if="wall.isClosing" class="room-params-dialog__badge">закрывающая</span>
          <button
            v-if="!wall.isClosing"
            class="room-params-dialog__delete-wall-btn"
            :disabled="!canDeleteWall"
            @click="onDeleteWall(wall.id)"
            title="Удалить стену"
          >✕</button>
        </div>

        <div class="room-params-dialog__subfield">
          <label class="room-params-dialog__field-label">Длина, мм</label>
          <div class="room-params-dialog__row-actions">
            <input
              v-model="editableLengths[String(wall.id)]"
              type="text"
              class="room-params-dialog__input"
              :disabled="wall.isClosing"
              :data-room-param-field="`length:${String(wall.id)}`"
              @focus="editingLengthWallId = String(wall.id)"
              @blur="onLengthBlur(wall.id)"
            />
            <button
              v-if="!wall.isClosing"
              class="btn btn--confirm"
              @mousedown.prevent
              @click="onApplyLength(wall.id)"
            >
              Изменить
            </button>
          </div>
        </div>

        <div class="room-params-dialog__subfield">
          <label class="room-params-dialog__field-label">
            Угол, °
          </label>
          <div class="room-params-dialog__row-actions">
            <input
              v-model="editableAngles[String(wall.id)]"
              type="text"
              class="room-params-dialog__input"
              :disabled="!wall.isClosing && !wall.isAngleEditable"
              :data-room-param-field="`angle:${String(wall.id)}`"
              @focus="editingAngleWallId = String(wall.id)"
              @blur="onAngleBlur(wall.id)"
            />
            <button
              class="btn btn--confirm"
              :disabled="!wall.isClosing && !wall.isAngleEditable"
              @mousedown.prevent
              @click="onApplyAngle(wall.id)"
            >
              Изменить
            </button>
          </div>
          <span
            v-if="wall.hasGeometryNote"
            class="room-params-dialog__geometry-note"
          >
            может меняться от геометрии комнаты
          </span>
        </div>
      </div>

      <div
        v-if="hasClosingWall"
        class="room-params-dialog__field room-params-dialog__field--add-wall"
      >
        <div class="room-params-dialog__add-wall-content">
          <label class="room-params-dialog__field-label room-params-dialog__field-label--center">
            Добавить стену
          </label>
          <button class="room-params-dialog__add-button" @click="onAddWall">
            +
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import ClosePopUpButton from '@/components/ui/svg/ClosePopUpButton.vue';
import RoomList from '@/components/left-menu/option/roomOptions/RoomList.vue';
import { usePopupStore } from '@/store/appStore/popUpsStore';
import { useRoomState } from '@/store/appliction/useRoomState';
import { useSchemeTransition } from '@/store/canvasMerge/schemeTransition';
import { useConstructor2DHistory } from '@/store/constructor2d/useConstructor2DHistory';
import { useWallHeightStore } from '@/store/constructor2d/store/useWallHeightStore';
import { buildProjectFromWallWidths } from '@/Constructor2D/facade/blankRoom';

type RoomParamsRow = {
  id: string | number;
  title: string;
  isClosing: boolean;
  isAngleEditable: boolean;
  hasGeometryNote: boolean;
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
const wallRows = ref<RoomParamsRow[]>([]);
const editableLengths = ref<Record<string, string>>({});
const editableAngles = ref<Record<string, string>>({});
const isTransparentMode = ref(false);
const isEditingHeight = ref(false);
const editingLengthWallId = ref<string | null>(null);
const editingAngleWallId = ref<string | null>(null);

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
  const regularWalls = orderedWalls.filter((wall: any) => wall.isClosing !== true);
  const firstRegularWallId = regularWalls[0]?.id;
  const secondRegularWallId = regularWalls[1]?.id;
  wallRows.value = orderedWalls.map((wall: any, index: number) => {
    const angleGeometry = planner.getWallPoint0AngleGeometry?.(wall.id);
    const id = wall.id;
    const hasGeometryNote =
      id === firstRegularWallId ||
      id === secondRegularWallId ||
      wall.isClosing === true;
    return {
      id,
      title: `С${index + 1}`,
      isClosing: wall.isClosing === true,
      isAngleEditable: planner.isWallPoint0AngleEditable?.(wall.id) === true,
      hasGeometryNote,
      lengthMm: Math.round((wall.width ?? 0) * 10),
      angleDeg: angleGeometry ? Number(angleGeometry.currentAngleDeg.toFixed(2)) : null,
    };
  });
  syncEditableFields();
};

const hasClosingWall = computed(() => wallRows.value.some((wall) => wall.isClosing));
const canDeleteWall = computed(() => wallRows.value.filter((w) => !w.isClosing).length > 3);

const onDeleteWall = (wallId: string | number) => {
  const c2d = (globalThis as any).C2D;
  c2d?.layers?.planner?.removeWallById?.(wallId);
  c2d?.updateRoomStore?.();
  refreshWallRows();
};

const formatAngle = (angleDeg: number | null): string =>
  angleDeg == null ? '' : String(angleDeg).replace('.', ',');

const syncEditableFields = () => {
  const nextLengths: Record<string, string> = { ...editableLengths.value };
  const nextAngles: Record<string, string> = { ...editableAngles.value };

  wallRows.value.forEach((wall) => {
    const wallId = String(wall.id);
    if (editingLengthWallId.value !== wallId) {
      nextLengths[wallId] = String(wall.lengthMm);
    }
    if (editingAngleWallId.value !== wallId) {
      nextAngles[wallId] = formatAngle(wall.angleDeg);
    }
  });

  editableLengths.value = nextLengths;
  editableAngles.value = nextAngles;
};

const onLengthBlur = (wallId: string | number) => {
  editingLengthWallId.value = null;
  const row = wallRows.value.find((wall) => String(wall.id) === String(wallId));
  if (row) {
    editableLengths.value[String(wallId)] = String(row.lengthMm);
  }
};

const onAngleBlur = (wallId: string | number) => {
  editingAngleWallId.value = null;
  const row = wallRows.value.find((wall) => String(wall.id) === String(wallId));
  if (row) {
    editableAngles.value[String(wallId)] = formatAngle(row.angleDeg);
  }
};

watch(
  () => popupStore.popups.roomParams,
  (open) => {
    if (open) {
      heightInput.value = String(wallHeightStore.wallHeightMm * 10);
      refreshWallRows();
      editingLengthWallId.value = null;
      editingAngleWallId.value = null;
    }
  },
  { immediate: true },
);

watch(currentRoomId, () => {
  if (popupStore.popups.roomParams) {
    refreshWallRows();
  }
});

watch(
  () => wallHeightStore.wallHeightMm,
  (value) => {
    if (!isEditingHeight.value) {
      heightInput.value = String(value * 10);
    }
  },
);

const onHeightBlur = () => {
  isEditingHeight.value = false;
  heightInput.value = String(wallHeightStore.wallHeightMm * 10);
};

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
  heightInput.value = String(parsed);
  isEditingHeight.value = false;
  (globalThis as any).C2D?.updateRoomStore?.();
  refreshWallRows();
};

const onCancel = () => {
  popupStore.closePopup('roomParams');
};

const onApplyLength = (wallId: string | number) => {
  const parsed = parsePositiveNumber(editableLengths.value[String(wallId)]);
  if (parsed == null) return;
  const c2d = (globalThis as any).C2D;
  const ok = c2d?.layers?.planner?.applyWallLengthMm?.(wallId, parsed);
  if (!ok) return;
  editingLengthWallId.value = null;
  c2d?.updateRoomStore?.();
  refreshWallRows();
};

const onApplyAngle = (wallId: string | number) => {
  const parsed = parsePositiveNumber(editableAngles.value[String(wallId)]);
  if (parsed == null) return;
  const c2d = (globalThis as any).C2D;

  const isClosing = wallRows.value.find((w) => String(w.id) === String(wallId))?.isClosing;
  if (isClosing) {
    const roomId = getActiveRoomId();
    if (roomId == null) return;
    const ok = c2d?.layers?.planner?.applyClosingWallAngleDeg?.(roomId, parsed);
    if (!ok) return;
  } else {
    const ok = c2d?.layers?.planner?.applyWallAngleDeg?.(wallId, parsed);
    if (!ok) return;
  }

  editingAngleWallId.value = null;
  c2d?.updateRoomStore?.();
  refreshWallRows();
};

const onAddWall = async () => {
  const roomId = getActiveRoomId();
  if (roomId == null) return;
  const c2d = (globalThis as any).C2D;
  const ok = c2d?.layers?.planner?.addDefaultWallBeforeClosing?.(roomId);
  if (!ok) return;
  await nextTick();
  refreshWallRows();
};

const onCreateRoom = async () => {
  const projectData = buildProjectFromWallWidths(4000, 4000, 5000, 5000);
  const template = projectData?.rooms?.[0];
  if (!template) return;

  const roomId = String(template.id ?? Date.now());
  const label = `Комната ${roomsList.value.length + 1}`;

  roomState.addRoom({
    id: roomId,
    label,
    description: template.description || '',
    params: template.params,
    content: template.content,
    basket: JSON.stringify({
      scene: [],
      catalog: [],
    }),
  } as any);

  roomState.setCurrentRoomId(roomId);
  roomState.routConvertData('/2d');

  await reinit2D();
  refreshWallRows();

  const snapshot = schemeTransition.getAllData();
  if (snapshot && Array.isArray(snapshot)) {
    constructor2DHistory.addAction(JSON.parse(JSON.stringify(snapshot)));
  }
};

watch(wallRows, () => {
  if (popupStore.popups.roomParams && !isEditingHeight.value) {
    heightInput.value = String(wallHeightStore.wallHeightMm * 10);
  }
});

onMounted(() => {
  refreshWallRows();
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

  &--transparent {
    background-color: rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(1px);

    .room-params-dialog__toolbar {
      background: rgba(248, 244, 234, 0.16);
    }

    .room-params-dialog__field {
      background: rgba(196, 196, 196, 0.12);
    }

    .room-params-dialog__field--readonly {
      background: rgba(220, 220, 220, 0.1);
    }

    .room-params-dialog__field--add-wall {
      background: rgba(238, 246, 234, 0.12);
    }

    .room-params-dialog__input,
    .room-params-dialog__toolbar-input {
      background-color: rgba(255, 255, 255, 0.26);
    }
  }

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

  &__transparent-toggle {
    display: inline-flex;
    align-items: center;
    margin-top: 2px;
    font-size: 16px;
    color: $strong-grey;
    user-select: none;
    margin-bottom: 0;
    padding-left: 30px;

    span {
      line-height: 20px;
      color: #272727;
    }
  }

  &__toolbar {
    display: grid;
    grid-template-columns: minmax(420px, 2fr) minmax(280px, 1fr);
    gap: 14px;
    margin-bottom: 16px;
    padding: 12px 14px;
    border-radius: 16px;
    background: #f8f4ea;
  }

  &__toolbar-section {
    display: grid;
    gap: 10px;
    padding: 10px 8px;
    min-width: 0;
    align-content: start;
  }

  &__toolbar-section--rooms {
    border-bottom: 1px solid $light-stroke;
  }

  &__toolbar-section--height {
    grid-template-rows: auto 1fr;
    justify-content: start;
  }

  &__toolbar-label {
    font-size: 14px;
    color: $strong-grey;
  }

  &__toolbar-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__toolbar-actions {
    display: grid;
    grid-template-columns: minmax(180px, 320px) auto;
    gap: 10px;
    align-items: center;

    .btn {
      font-size: 14px;
      border: none;
      padding: 10px 14px;
      border-radius: 10px;
      cursor: pointer;

      &--confirm {
        background-color: $red;
        color: white;
      }
    }
  }

  &__add-room-button {
    flex: 0 0 auto;
    font-size: 13px;
    border: none;
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
  }

  &__toolbar-input {
    width: 100%;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    background-color: $white;
    font-size: 16px;
    color: #111111;
    outline: none;
    box-sizing: border-box;
  }

  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
    align-items: stretch;
    margin-bottom: 16px;
  }

  &__field {
    display: grid;
    grid-template-rows: auto 1fr 1fr;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    background: $light-stroke;
    min-width: 0;
    min-height: 200px;
    box-sizing: border-box;
  }

  &__field--readonly {
    background: #f1f1f1;
  }

  &__field--add-wall {
    background: #eef6ea;
    grid-template-rows: 1fr;
    place-items: center;
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

  &__field-label--center {
    text-align: center;
    max-width: 180px;
  }

  &__field-label--warning {
    color: #8a6b00;
    font-weight: 600;
  }

  &__subfield {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__input {
    width: 100%;
    padding: 10px 14px;
    border: none;
    border-radius: 10px;
    background-color: $white;
    font-size: 16px;
    color: #111111;
    outline: none;
    box-sizing: border-box;

    &:disabled {
      background: #ebebeb;
      color: #777;
      cursor: not-allowed;
    }
  }

  &__input--warning {
    border: 1px solid #e2bf45;
    box-shadow: inset 0 0 0 1px rgba(226, 191, 69, 0.22);
  }

  &__add-button {
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 12px;
    background: #6fa35c;
    color: #fff;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
  }

  &__row-actions {
    .btn {
      font-size: 14px;
      border: none;
      padding: 10px 14px;
      border-radius: 10px;
      cursor: pointer;

      &--confirm {
        background-color: $red;
        color: white;
      }

      &--warning {
        box-shadow: inset 0 0 0 1px #e2bf45;
      }
    }
  }

  &__row-actions--warning {
    padding: 8px;
    border-radius: 12px;
    background: rgba(255, 223, 93, 0.16);
  }

  &__add-wall-content {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 14px;
    height: 100%;
    text-align: center;
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

  &__warning-note {
    font-size: 12px;
    line-height: 1.3;
    color: #7b6200;
  }

  &__delete-wall-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: $red;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;

    &:hover:not(:disabled) {
      background: #fee;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  &__geometry-note {
    font-size: 15px;
    line-height: 1.3;
    color: #c45200;
    font-style: italic;
  }

  &__angle-note {
    margin: 0 0 8px 0;
    padding: 6px 10px;
    font-size: 12px;
    line-height: 1.4;
    color: #555;
    background: #f5f5f5;
    border-radius: 6px;
    border-left: 3px solid #ccc;
  }

}

@media (max-width: 900px) {
  .room-params-dialog {
    width: min(96vw, 1600px);
    padding: 16px;

    &__toolbar {
      grid-template-columns: 1fr;
    }
  }
}
</style>
