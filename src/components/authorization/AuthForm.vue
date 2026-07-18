<template>
  <div class="auth-form">
    <img src="@/assets/img/logo.png" alt="Логотип компании" class="auth-form__logo" />
    <div class="auth-form__box">
      <form class="auth-form__form" @submit.prevent="handleSubmit">
        <h1 class="auth-form__title">Авторизация</h1>

        <div class="auth-form__input-group">
          <label for="login" class="auth-form__input-placeholder" :class="loginLabelTop ? 'active' : ''">
            Логин
          </label>
          <input id="login" v-model="authForm.login" name="login" type="text" class="auth-form__input"
            autocomplete="username" required @focus="handleFocus('login')" @blur="handleBlur('login')" />
          <UserSVG class="auth-form__icon" aria-label="Иконка пользователя" />
        </div>

        <div class="auth-form__input-group">
          <label for="password" class="auth-form__input-placeholder" :class="{ 'active': passwordLabelTop }">
            Пароль
          </label>
          <input id="password" v-model="authForm.password" name="password" :type="showPassword ? 'text' : 'password'"
            class="auth-form__input" autocomplete="current-password" required @focus="handleFocus('password')"
            @blur="handleBlur('password')" />

          <EyeCloseSVG class="auth-form__icon auth-form__eye-icon" aria-label="Иконка глаза"
            @click="togglePasswordVisibility" v-if="!showPassword" />
          <EyeOpenSVG class="auth-form__icon auth-form__eye-icon" aria-label="Иконка глаза"
            @click="togglePasswordVisibility" v-if="showPassword" />
        </div>

        <button type="submit" class="auth-form__button" :disabled="authStore.isSubmitting">
          <span v-if="!authStore.isSubmitting">Войти</span>
          <span v-else>Отправка...</span>
        </button>

        <!-- <div class="auth-form__register">
          <div class="register__stroke"></div>
          <router-link 
            to="/forgot-password" 
            class="auth-form__link"
          >
            Забыли пароль?
          </router-link>
          <div class="register__stroke"></div>
        </div> -->
        <div v-if="authStore.error.isError">
          <p class="auth-form__text-error" v-html="authStore.error.message"></p>
        </div>
      </form>
      <!-- <p class="auth-form__register-text">
        Нет аккаунта? 
        <router-link 
          to="/register" 
          class="auth-form__link"
        >
          Зарегистрироваться
        </router-link>
      </p> -->
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/store/appStore/authStore'

// Иконки
import EyeOpenSVG from '@/components/ui/svg/auth/EyeOpenSVG.vue'
import EyeCloseSVG from '@/components/ui/svg/auth/EyeCloseSVG.vue'
import UserSVG from '@/components/ui/svg/auth/UserSVG.vue'
import { useAppData } from '@/store/appliction/useAppData'

const authStore = useAuthStore();


const authForm = ref({
  login: '',
  password: ''
})

const loginLabelTop = ref(false)
const passwordLabelTop = ref(false)
const showPassword = ref(false)

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
  setTimeout(() => showPassword.value = false, 500)
}

const handleFocus = (field: 'login' | 'password') => {
  if (field === 'login') loginLabelTop.value = true
  if (field === 'password') passwordLabelTop.value = true
}

const handleBlur = (field: 'login' | 'password') => {
  if (field === 'login') loginLabelTop.value = !!authForm.value.login
  if (field === 'password') passwordLabelTop.value = !!authForm.value.password
}

const handleSubmit = async () => {
  try {
    await authStore.login({
      login: authForm.value.login,
      password: authForm.value.password
    })
  } catch {
  }
}

// Watchers
watch(() => authForm.value.login, (newVal) => {
  loginLabelTop.value = !!newVal
})

watch(() => authForm.value.password, (newVal) => {
  passwordLabelTop.value = !!newVal
})

</script>
<style lang="scss" scoped>
.auth-form {
  --input-height: 60px;
  --border-radius: 15px;
  --transition-duration: 0.3s;
  --text-error: #da444c;

  flex: 1;
  // max-width: 500px;
  width: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  padding-left: 44px;

  .auth-form__logo {
    width: 154px;
    margin-bottom: 159px;
  }

  .auth-form__box {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;

    .auth-form__form {
      width: 100%;
      max-width: 441px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 20px;

      .auth-form__title {
        font-size: 44px;
        margin-bottom: 20px;
        color: $black;
      }

      .auth-form__input-group {
        width: 100%;
        position: relative;

        .auth-form__input {
          width: 100%;
          height: var(--input-height);
          padding: 0 40px 0 20px;
          font-size: 1.8rem;
          background: #f6f5fa;
          border: 1px solid $dark-grey;
          border-radius: var(--border-radius);
          box-sizing: border-box;
          transition: border-color var(--transition-duration);

          &:focus {
            outline: none;
            border-color: $red;
          }
        }

        .auth-form__input-placeholder {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.4rem;
          color: $dark-grey;
          pointer-events: none;
          transition: all var(--transition-duration);

          &.active {
            top: 15px;
            transform: translateY(-50%);
            font-size: 1.2rem;
          }
        }

        .auth-form__input:focus+.auth-form__input-placeholder,
        .auth-form__input:not(:placeholder-shown)+.auth-form__input-placeholder {
          top: 0;
          transform: translateY(-50%);
          font-size: 1.2rem;
          background: white;
          padding: 0 5px;
        }

        .auth-form__icon {
          position: absolute;
          width: 20px;
          height: 20px;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: $dark-grey;
        }
      }
    }
  }

  .auth-form__button {
    width: 100%;
    margin: 10px 0 20px 0;
    border: none;
    border-radius: var(--border-radius);
    height: 50px;
    font-size: 1.4rem;
    background-color: var(--text-error);
    ;
    color: white;
    cursor: pointer;
    transition: background-color var(--transition-duration);

    &:hover:not(:disabled) {
      background-color: darken($red, 10%);
    }

    &:active:not(:disabled) {
      transform: scale(0.98);
    }

    &:disabled {
      background-color: lighten($red, 20%);
      cursor: not-allowed;
    }
  }

  .auth-form__register {
    display: flex;
    align-items: center;
    gap: 15px;
    margin: 20px 0;

    .auth-form__link {
      font-size: 1.4rem;
      color: $dark-grey;
      text-decoration: none;
      transition: color var(--transition-duration);

      &:hover {
        color: $red;
      }
    }

    .register__stroke {
      flex: 1;
      height: 1px;
      background: $dark-grey;
    }
  }

  .auth-form__register-text {
    color: $dark-grey;
    text-align: center;

    .auth-form__link {
      position: relative;
      color: $black;
      text-decoration: none;

      &::after {
        content: "";
        width: 100%;
        position: absolute;
        bottom: 0;
        left: 0;
        height: 0;
        border-bottom: 1px solid $black;
        transition: border-color var(--transition-duration);
      }

      &:hover::after {
        border-color: var(--text-error);
      }
    }
  }

  .auth-form__eye-icon {
    cursor: pointer;
    left: auto;
    right: 15px;


    &:hover {
      opacity: 0.8;
    }
  }

  .auth-form__text-error {
    color: var(--text-error);
    text-align: center;
    font-size: 1.4rem;
  }

}
</style>