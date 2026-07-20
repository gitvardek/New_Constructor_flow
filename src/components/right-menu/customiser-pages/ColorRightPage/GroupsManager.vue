<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEventBus } from "@/store/appliction/useEventBus"
import { useUniformState } from "@/store/appliction/useUniformState"

const eventBus = useEventBus()
const uniformState = useUniformState()

// Локальное состояние для отслеживания процесса создания группы
const isCreatingGroup = ref(false)
const groupCreationStep = ref<'idle' | 'selecting' | 'ready'>('idle')

// Следим за изменением uniformMode и сбрасываем состояние при отключении
watch(
  () => uniformState.getUniformModeData.uniformMode,
  (newUniformMode) => {
    if (!newUniformMode) {
      isCreatingGroup.value = false
      groupCreationStep.value = 'idle'
    }
  }
)

const allGroups = computed(() => {
  return uniformState!.getUniformGroups.map((group: any) => ({
    id: `uniform_${group.id}`,
    name: `Группа ${group.id + 1}`,
    color: group.color,
    items: group.objects || [],
    type: 'uniform',
    originalId: group.id
  }))
})

// Computed свойства для состояния кнопок
const canCreateGroup = computed(() => {
  return uniformState!.getUniformModeData.uniformMode && !isCreatingGroup.value
})

const canFinalizeGroup = computed(() => {
  return uniformState!.getPreGroup > 0 || groupCreationStep.value === 'ready'
})

const isInSelectionMode = computed(() => {
  return isCreatingGroup.value && groupCreationStep.value === 'selecting'
})

/** Работа с переходящий рисунок */

const preCreateUniformGroup = () => {
  // console.log(uniformState!.getUniformModeData.uniformMode, 'uniformMode')
  // console.log('Pre-Create-Uniform-Group')
  
  // Обновляем локальное состояние
  isCreatingGroup.value = true
  groupCreationStep.value = 'selecting'
  
  eventBus.emit("A:Pre-Create-Uniform-Group");
};

const сreateUniformGroup = () => {
  // console.log(uniformState!.getUniformModeData.uniformMode, 'uniformMode')

  
  // Обновляем локальное состояние
  isCreatingGroup.value = false
  groupCreationStep.value = 'idle'
  
  eventBus.emit("A:Create-Uniform-Group");
};

const cancelGroupCreation = () => {
  // console.log('Cancel group creation')
  
  // Сбрасываем локальное состояние
  isCreatingGroup.value = false
  groupCreationStep.value = 'idle'
  
  // Отправляем событие отмены (если нужно)
  eventBus.emit("A:Cancel-Uniform-Group");
};


const deleteGroup = (groupId: string) => {
  const originalId = parseInt(groupId.replace('uniform_', ''))
  eventBus.emit("A:Delite-Uniform-Group", originalId);
}

const addToGroup = (groupId: string) => {
  const originalId = parseInt(groupId.replace('uniform_', ''))
  eventBus.emit("A:Add-To-Uniform-Group", originalId);
}

const removeFromGroup = (groupId: string) => {
  const originalId = parseInt(groupId.replace('uniform_', ''))
  eventBus.emit("A:Remove-From-Uniform-Group", originalId);
}

</script>

<template>
  <div :class="$style.groupsManager">
    <!-- Объединенные группы -->
    <div :class="$style.groupsList">
      <div 
        v-for="group in allGroups" 
        :key="group.id" 
        :class="$style.groupItem"
      >
        <div :class="$style.groupHeader">
          <div :class="$style.groupDot" :style="{ backgroundColor: group.color }"></div>
          <span :class="$style.groupName">{{ group.name }}</span>
        </div>
        <div :class="$style.groupActions">
          <button :class="[$style.actionBtn, $style.deleteBtn]" @click="deleteGroup(group.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Удалить
          </button>
          <div :class="$style.groupButtons">
            <button :class="$style.actionBtn" @click="addToGroup(group.id)">
              Добавить
            </button>
            <button :class="$style.actionBtn" @click="removeFromGroup(group.id)">
              Убрать
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Кнопки создания групп -->
    <div :class="$style.createButtons">
      <!-- Кнопка для переходящего рисунка -->
      <div v-if="uniformState!.getUniformModeData.uniformMode" :class="$style.uniformButtons">
        <!-- Индикатор состояния -->
        <div v-if="isInSelectionMode" :class="$style.statusIndicator">
          <div :class="$style.statusDot"></div>
          <span>Выберите элементы для группы</span>
        </div>
        
        <button
          :class="[$style.createGroupBtn, { [$style.disabled]: !canCreateGroup }]"
          @click="preCreateUniformGroup"
          :disabled="!canCreateGroup"
        >
          <svg v-if="!isCreatingGroup" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" :class="$style.spinning">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ isCreatingGroup ? 'Выбор элементов...' : 'Создать группу' }}
        </button>

        <div v-if="canFinalizeGroup" :class="$style.finalizeButtons">
          <button
            :class="[$style.createGroupBtn, $style.finalizeBtn]"
            @click="сreateUniformGroup()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Создать группу ({{ uniformState!.getPreGroup }})
          </button>
          
          <button
            :class="[$style.createGroupBtn, $style.cancelBtn]"
            @click="cancelGroupCreation()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Отмена
          </button>
        </div>
      </div>
    
    </div>
  </div>
</template>

<style module lang="scss">
.groupsManager {
  
  .uniformContainer {
    position: absolute;
    top: 30%;
    right: 0;
    transform: translate(0, 0);
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background-color: white;
    margin-bottom: 20px;
  }

  .uniformItem {
    display: flex;
    gap: 1rem;
    margin-bottom: 10px;
  }

  .uniformName {
    padding: 8px 12px;
    border-radius: 4px;
    color: white;
    font-weight: 600;
    margin: 0;
  }

  .uniformBtn {
    width: fit-content;
    padding: 0.5rem;
    background-color: rgb(99, 133, 255);
    border-radius: 10px;
    outline: none;
    border: none;
    color: white;
    font-weight: 600;
    font-size: clamp(0.75rem, 10vw - 1rem, 1rem);
    cursor: pointer;
    transition: all 0.25s ease-in-out;

    &:hover {
      background-color: rgba(99, 133, 255, 0.581);
    }
  }

  .createButtons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .uniformButtons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .finalizeButtons {
    display: flex;
    gap: 0.5rem;
    
    .createGroupBtn {
      flex: 1;
    }
  }

  .btn {
    width: fit-content;
    padding: 0.5rem;
    background-color: rgb(99, 133, 255);
    border-radius: 10px;
    outline: none;
    border: none;
    color: white;
    font-weight: 600;
    font-size: clamp(0.75rem, 10vw - 1rem, 1rem);
    cursor: pointer;
    transition: all 0.25s ease-in-out;

    &:hover {
      background-color: rgba(99, 133, 255, 0.581);
    }

    &.btn_red {
      background-color: rgb(255, 111, 111);
      pointer-events: none;
      cursor: none;

      &:hover {
        background-color: rgba(255, 111, 111, 0.581);
      }
    }

    &.btn_green {
      background-color: rgb(111, 255, 152);

      &:hover {
        background-color: rgba(111, 255, 152, 0.581);
      }
    }
  }

  .btnGreen {
    background-color: rgb(111, 255, 152);

    &:hover {
      background-color: rgba(111, 255, 152, 0.581);
    }
  }
  
  .groupsList {
    margin-bottom: 20px;
  }
  
  .groupItem {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    background: transparent;
  }
  
  .groupHeader { 
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .groupDot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  
  .groupName {
    font-size: 16px;
    font-weight: 500;
    color: $black;
  }
  
  .groupActions {
    display: flex;
    gap: 10px;
  }
  
  .actionBtn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 12px 15px;
    border: none;
    background: $bg;
    color: $strong-grey;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    
    &:hover {
      background: $light-grey;
    }
    
    svg {
      width: 14px;
      height: 14px;
    }
  }
  
  .createGroupBtn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    gap: 10px;
    width: 100%;
    padding: 15px;
    border-radius: 15px;
    background: $bg;
    color: $strong-grey;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover:not(.disabled) {
      background: $light-grey;
    }
    
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    &.finalizeBtn {
      background: #4CAF50;
      color: white;
      
      &:hover {
        background: #45a049;
      }
    }
    
    &.cancelBtn {
      background: #f44336;
      color: white;
      
      &:hover {
        background: #d32f2f;
      }
    }
    
    svg {
      width: 16px;
      height: 16px;
      
      &.spinning {
        animation: spin 1s linear infinite;
      }
    }
  }
  
  .statusIndicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 15px;
    background: #e3f2fd;
    border-radius: 10px;
    margin-bottom: 10px;
    font-size: 14px;
    color: #1976d2;
    
    .statusDot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #1976d2;
      animation: pulse 1.5s ease-in-out infinite;
    }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
}
.groupButtons {
    display: flex;
    .actionBtn {
        border-radius: 0;
        &:first-child {
            border-top-left-radius: 15px;
            border-bottom-left-radius: 15px;
        }
        &:last-child {
            border-top-right-radius: 15px;
            border-bottom-right-radius: 15px;
        }
    }
}
.actionBtn.deleteBtn {
    background: transparent;
    color: $dark-stroke;
    border-radius: 15px;
}
</style> 