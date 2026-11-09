<script lang="ts" setup>
//@ts-nocheck

import { defineProps, computed, defineEmits, onMounted } from "vue";
import default_url from "@/assets/svg/surface-redactor/default.svg";
import delete_url from "@/assets/svg/surface-redactor/delete.svg";
import { _URL } from "@/types/constants";

const props = defineProps({
    type: String,
    data: Object,
    additionalClass: String,
    disableDeleteChoice: {
        type: Boolean,
        default: false,
    }
});

onMounted(() => {
});

const emit = defineEmits(["choose-option", "delete-choise"]);

let title = computed(() => {
    const typeMap = {
        drawer: "Ящик",
        drawerColor: "Цвет ящика",
    };

    return typeMap[props.type];
});

let name = computed(() => {
    return props.data?.name || props.data?.NAME
        ? props.data.name || props.data?.NAME
        : "";
});

let imgSrc = computed(() => {
    if (props.data?.imgSrc) {
        return _URL + props.data.imgSrc;
    }

    if (props.data?.PREVIEW_PICTURE) {
        return _URL + props.data.PREVIEW_PICTURE;
    }
    return default_url;
});

let isColorChosed = computed(() => {
    return props.data?.hex ? true : false;
});

let chooseOption = () => {
    emit("choose-option", props.type);
};

const deleteChoise = (event) => {
    // event.stopPropagation();
    emit("delete-choise", props.type);
};
</script>

<template>
    <div :class="`config ${props.additionalClass}`" @click="chooseOption">
        <div class="config__left">
            <!-- <p class="config__top_segment">surface</p> -->
            <div class="config__banner">
                <img v-if="props.type !== 'palette'" class="config__img" :src="imgSrc" alt="" />
                <div v-else @click="chooseOption">
                    <img v-if="!isColorChosed" class="config__img" :src="imgSrc" alt="" />
                    <div v-else class="config__color" :style="{ backgroundColor: `#${props.data?.hex}` }"></div>
                </div>

            </div>

        </div>
        <div class="config__right">
            <div>
                <p class="config__title">{{ title }}</p>
            </div>
            <p class="config__name">{{ name }}</p>
        </div>
        <img v-if="!props.disableDeleteChoice" class="config__delete" :src="delete_url" alt="" @click="deleteChoise" />
    </div>
</template>

<style lang="scss" scoped>
.config {
    display: flex;
    width: 100%;
    padding: 0.5rem;
    align-items: center;
    gap: 2rem;
    border-radius: 2rem;
    box-shadow: 4px 4px 4px 4px rgba(34, 60, 80, 0.11);
    overflow: hidden;
    cursor: pointer;

    transition-property: box-shadow;
    transition-duration: 0.25s;
    transition-timing-function: ease;

    @media (hover: hover) {
        &:hover {
            box-shadow: 4px 4px 4px 4px rgba($dark-stroke, 0.7);
        }
    }

    &.active {
        box-shadow: 4px 4px 4px 4px rgba($dark-stroke, 1);
    }

    &__left {}

    &__right {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        // max-height: 50%;
        overflow: hidden;
    }

    &__banner {

        padding: 5px;
        cursor: pointer;
        border-radius: 2rem;
        box-shadow: 0px 0px 4px 1px rgba($dark-stroke, 0.5);
    }

    &__img {
        height: 55px;
        width: 55px;


    }

    &__color {
        height: 45px;
        width: 45px;
        border-radius: 12px;
        cursor: pointer;
    }

    &__delete {
        align-self: flex-start;
        height: 20px;
        cursor: pointer;

        @media (min-height: 1000px) {
            height: 25px;
        }
    }

    &__title {
        color: rgb(131, 133, 135);
        font-size: 1rem;
        // flex: 2;

        @media (min-height: 1000px) {
            font-size: 1.2rem;
        }
    }

    &__name {
        font-size: 1.2rem;
        // line-height: 14px;
        text-overflow: ellipsis;
        overflow: hidden;
    }
}

.disabled {
    pointer-events: none;
    background-color: rgba(228, 140, 140, 0.133);
}
</style>
