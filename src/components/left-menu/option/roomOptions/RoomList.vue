<script setup lang="ts">
interface Room {
  id: number;
  label: string;
}

interface Props {
  rooms: Room[];
  currentRoomId: number | string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "load-room", id: number): void;
  (e: "delete-room", id: number): void;
}>();

function handleLoadRoom(id: number) {
  emit("load-room", id);
}

function handleDeleteRoom(id: number) {
  emit("delete-room", id);
}
</script>

<template>
  <div class="room-select">
    <div v-for="room in props.rooms" :key="room.id" class="room-select__item">
      <button :class="[
        'button__filled button__filled--text',
        { active: room.id === props.currentRoomId },
      ]" @click="handleLoadRoom(room.id)">
        <span>{{ room.label }}</span>
      </button>

      <button class="button__filled" @click="handleDeleteRoom(room.id)">
        <span class="icon icon-garbage"></span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.room-select {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  padding: 10px 0;
  border-top: 1px solid $stroke;
  border-bottom: 1px solid $stroke;
}

.room-select__item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px;
  border: 1px solid $dark-grey;
  border-radius: 50px;
}

.button__filled {
  padding: 15px;

  &--text {
    padding: 15px;
  }

  &.active {
    color: $white;
    background-color: $red;
  }
}
</style>
