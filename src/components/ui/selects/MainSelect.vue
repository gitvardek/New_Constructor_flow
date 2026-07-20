<template>
    <div>
        <select v-model="selectedOption" @change="handleChange">
            <option v-for="(item, key) in options" :key="key" :value="key">
                {{ item }}
            </option>
        </select>
    </div>
</template>

<script lang="ts" setup>
import { ref, defineProps, defineEmits, watch } from 'vue';

interface Option {
    value: string | number;
    text: string;
  }

const props = defineProps<{
    modelValue: string | number;
    options: Option;
    id?: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: string | number): void;
    (e: 'change', value: string | number): void;
}>();

const selectedOption = ref(props.modelValue);

const handleChange = () => {
    emit('update:modelValue', selectedOption.value);
    emit('change', selectedOption.value);
};

watch(() => props.modelValue, (newValue) => {
    selectedOption.value = newValue;
});
</script>

<style scoped>
select {
    padding: 15px;
    margin-bottom: 15px;
    appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background: url('@/assets/img/arrow-down.png') no-repeat right 10px center;
    font-size: 1.6rem;
    font-weight: 600;
    outline: none;
}
</style>