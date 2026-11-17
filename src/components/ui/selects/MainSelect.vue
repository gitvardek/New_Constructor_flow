<template>
    <div class="main-select">
        <label v-if="label" class="main-select__label" :for="id">{{ label }}</label>

        <select :id="id" v-model="selectedOption" :disabled="disabled" @change="handleChange">
            <!-- Пункт "сброс фильтра": значение — пустая строка (ALL_VALUE). -->
            <option v-if="allLabel !== null" :value="ALL_VALUE">{{ allLabel }}</option>

            <option v-for="option in normalizedOptions" :key="option.value" :value="option.value">
                {{ option.text }}
            </option>
        </select>
    </div>
</template>

<script lang="ts" setup>
// Универсальный селект. options принимает и массив { value, text }, и объект
// "ключ -> подпись" (в этом случае value — ключ объекта).
// allLabel (например "Все") добавляет первым пунктом сброс со значением "".
import { computed, ref, watch } from 'vue';

interface SelectOption {
    value: string | number;
    text: string;
}

const ALL_VALUE = '';

const props = withDefaults(defineProps<{
    modelValue: string | number;
    options: SelectOption[] | Record<string | number, string>;
    label?: string;
    allLabel?: string | null;
    id?: string;
    disabled?: boolean;
}>(), {
    allLabel: null,
    disabled: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: string | number): void;
    (e: 'change', value: string | number): void;
}>();

const normalizedOptions = computed<SelectOption[]>(() => Array.isArray(props.options)
    ? props.options
    : Object.entries(props.options ?? {}).map(([value, text]) => ({ value, text })));

const selectedOption = ref(props.modelValue);

const handleChange = () => {
    emit('update:modelValue', selectedOption.value);
    emit('change', selectedOption.value);
};

watch(() => props.modelValue, (newValue) => {
    selectedOption.value = newValue;
});
</script>

<style scoped lang="scss">
.main-select {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;

    &__label {
        font-size: 1.2rem;
        color: rgba(0, 0, 0, 0.5);
    }
}

select {
    width: 100%;
    box-sizing: border-box;
    padding: 0.5rem 2.5rem 0.5rem 1rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background: #fff url('@/assets/img/arrow-down.png') no-repeat right 10px center;
    font-size: 1.3rem;
    font-weight: 600;
    outline: none;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
}
</style>
