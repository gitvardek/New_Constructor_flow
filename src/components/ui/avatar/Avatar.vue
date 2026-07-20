<template>
  <div class="avatar-container">
    <!-- Тултип с именем пользователя -->
    <!-- <transition name="tooltip-fade">
      <div 
        v-if="showTooltip" 
        class="avatar-tooltip"
        :class="{ 'tooltip-visible': showTooltip }"
      >
        {{ authStore.userData.name }}
      </div>
    </transition> -->

    <div 
      class="avatar-helper" 
      @click="toggleDropdown" 
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
      :alt="authStore.userData.name"
    >

      <div v-if="authStore.userData.avatar" class="avatar-image" :style="imageStyle">
        <div v-if="badgeCount" class="avatar-badge count">
          {{ badgeCount }}
        </div>
      </div>
      
      <div v-else class="avatar-initials" :style="initialsStyle">
        {{ authStore.userInitials }}
      </div>
      
      <div class="avatar-status" :class="authStore.userData.status"></div>
      
      <transition name="fade">
        <div v-if="showDropdown" class="avatar-dropdown">
          <div class="dropdown-item" >
            <div class="dropdown-item__label">Имя:</div>
            <div class="dropdown-item__value">{{ authStore?.userData?.name }}</div>
          </div>
          <div class="dropdown-item" >
            <div class="dropdown-item__label">Город: </div>
            <div class="dropdown-item__value">{{ appData?.SETTINGS?.region_by_user_name }}</div>
          </div>
          <div class="dropdown-item" >
            <div class="dropdown-item__label">Почта:</div>
            <div class="dropdown-item__value">{{ authStore?.userData?.email }}</div>
          </div>
          <div class="dropdown-item" >
            <div class="dropdown-item__label"> Дата регистрации:</div>
            <div class="dropdown-item__value">{{ authStore?.userData?.date }}</div>
          </div>
          <div class="dropdown-item" @click.stop="handleLogout">
            <LogoutSVG class="dropdown-icon" />
            <span>Выйти</span> 
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
//@ts-nocheck
import { ref, computed, onMounted, onBeforeUnmount, CSSProperties } from 'vue'
import LogoutSVG from '@/components/ui/svg/auth/LogoutSVG.vue'
import { useAuthStore } from '@/store/appStore/authStore'
import { useAppData } from "@/store/appliction/useAppData"

const authStore = useAuthStore()
const appDataStore = useAppData();

const appData = computed(() => appDataStore.getAppData);

// Состояние компонента
const showDropdown = ref(false)
const showTooltip = ref(false)
const badgeCount = ref(0)

// Генерируем случайный цвет для инициалов на основе имени пользователя
const generateColorFromName = (name: string): string => {
  if (!name) return '#4a6cf7'; // fallback цвет
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#4a6cf7', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

// Вычисляемые свойства
const imageStyle = computed(() => ({
  backgroundImage: `url(${authStore.userData.avatar})`,
  width: '48px',
  height: '48px'
}))

const initialsStyle = computed(() => ({
  backgroundColor: generateColorFromName(authStore.userData.name),
  color: '#ffffff',
  width: '35px',
  height: '35px',
  fontSize: authStore.userInitials.length > 2 ? '14px' : '18px',
  fontWeight: '600',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  textTransform: 'uppercase'
} as CSSProperties ))

// Методы компонента
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  showTooltip.value = false // Скрываем тултип при открытии dropdown
}

const closeDropdown = () => {
  showDropdown.value = false
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    closeDropdown()
  } catch (error) {
    console.error('Ошибка при выходе:', error)
  }
}

// Обработчик клика вне компонента
const clickOutsideHandler = (event: MouseEvent) => {
  const target = event.target as Element | null
  if (!target?.closest('.avatar-helper')) {
    closeDropdown()
  }
}

// Хуки жизненного цикла
onMounted(() => {
  // Загружаем данные пользователя, если они еще не загружены
  // if (!authStore.userData.name && authStore.isAuthenticated) {
  //   authStore.fetchUserData()
  // }
  document.addEventListener('click', clickOutsideHandler)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', clickOutsideHandler)
})
</script>

<style scoped lang="scss">
.avatar-container {
  position: relative;
  display: inline-block;
}

.avatar-tooltip {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 1.2rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1001;
  opacity: 0;
  transition: all 0.2s ease;
}

.avatar-tooltip::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 4px 4px 0 4px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
}

.tooltip-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.avatar-helper {
  position: relative;
  display: inline-block;
  /* cursor: pointer; */
  user-select: none;
  margin-left: 16px;
}

.avatar-image, .avatar-initials {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.avatar-image:hover, .avatar-initials:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.avatar-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  border-radius: 50%;
  font-size: 1rem;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  background-color: #ff4757;
  padding: 0 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.avatar-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.avatar-status.online {
  background-color: #2ed573;
}

.avatar-status.offline {
  background-color: #a4b0be;
}

.avatar-status.busy {
  background-color: #ff4757;
}

.avatar-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 350px;
  z-index: 1000;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  font-size: 1.4rem;
}

.dropdown-item {
  padding: 4px;
  padding-left: 16px;
  transition: background 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0;
  color: #334155;
  font-weight: 500;
  &__label {
    font-weight: bold;
  }
  &__value {

  }
  
}

/* .dropdown-item:hover {
  background: #f8f9fa;
  color: #1e293b;
} */
.dropdown-item:last-child {
  flex-direction: row;
  align-items: center;
  span {
    margin-left: 4px;
  }
}

.dropdown-item:first-child,
.dropdown-item:last-child {
  padding-top: 16px;
  padding-bottom: 16px;
}

.dropdown-item:last-child:hover {
  cursor: pointer;
  background: #f8f9fa;
  color: #1e293b;
  flex-direction: row;

}

.dropdown-icon {
  width: 16px;
  height: 16px;
  color: #64748b;
  transition: color 0.2s;
}

.dropdown-item:hover .dropdown-icon {
  color: #ef4444;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Анимация появления инициалов */
.avatar-initials {
  animation: fadeIn 0.3s ease;
  cursor: pointer;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Адаптивность */
@media (max-width: 768px) {
  .avatar-tooltip {
    display: none; /* Скрываем тултип на мобильных */
  }
  
  .avatar-image, .avatar-initials {
    width: 40px;
    height: 40px;
    font-size: 1.4rem;
  }
  
  .avatar-status {
    width: 10px;
    height: 10px;
  }
  
  .avatar-dropdown {
    min-width: 180px;
  }
}
</style>