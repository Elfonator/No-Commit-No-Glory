<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import axiosInstance from '@/config/axiosConfig.ts'
import router from '@/router'

export default defineComponent({
  name: 'Navbar',
  methods: {
    router() {
      return router
    }
  },
  setup() {
    const loginDialog = ref(false)
    const activeTab = ref('login')
    const password = ref('')
    const confirmPassword = ref('')
    const showPassword = ref(false)
    const showConfirmPassword = ref(false)
    const loginEmail = ref('')
    const loginPassword = ref('')
    const forgotPasswordEmail = ref('')
    const registerFirstName = ref('')
    const registerLastName = ref('')
    const registerEmail = ref('')
    const registerPassword = ref('')
    const registerUniversity = ref('')
    const registerRole = ref('')
    const universities = ref([
      'Univerzita Konštantína Filozofa',
      'Univerzita Mateja Bela',
      'Univerzita sv. Cyrila a Metoda',
      'Iné',
    ])
    const registerCustomUniversity = ref('')
    const roles = ref(['Účastník', 'Recenzent'])

    const router = useRouter()
    const authStore = useAuthStore()

    //Password mismatch check
    const passwordMismatch = computed(() => registerPassword.value !== confirmPassword.value);
    const passwordError = computed(() => (passwordMismatch.value ? 'Heslá sa nezhodujú.' : null));

    //Error pop-ups for better UX
    const errors = ref<Record<string, string[]>>({})
    const snackbar = ref({
      show: false,
      message: '',
      color: 'error',
      timeout: 5000,
    })

    const openLoginModal = () => {
      loginDialog.value = true // Open the login modal
    }

    const showSnackbar = ({
      message,
      color = 'error',
    }: {
      message: string
      color?: string
    }) => {
      snackbar.value = { show: true, message, color, timeout: 5000 }
    }

    watch(registerUniversity, (newVal) => {
      if (newVal !== 'Iné') {
        registerCustomUniversity.value = ''; // Reset custom input if other university is selected
      }
    });

    watch(loginDialog, (isOpen) => {
      if (!isOpen) {
        loginEmail.value = ''
        loginPassword.value = ''
        forgotPasswordEmail.value = ''
        resetForm()
        activeTab.value = 'login'
      }
    })

    //Login modal
    const handleLogin = async () => {
      try {
        // Call the login action from the auth store
        await authStore.login(loginEmail.value, loginPassword.value)

        // Show success message
        showSnackbar({ message: 'Prihlásenie bolo úspešné.', color: 'success' })
        console.log('Login successful:', authStore.user)

        // Close the login dialog
        loginDialog.value = false

        // Redirect to the /auth route (role-based redirection handled by the router)
        await router.push('/auth')
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const backendMessage =
            error.response?.data?.message || 'An unexpected error occurred.'
          console.error('Login failed:', backendMessage)
          showSnackbar({ message: backendMessage, color: 'error' })
        } else {
          console.error('Unexpected error:', error)
          showSnackbar({
            message: 'An unexpected error occurred.',
            color: 'error',
          })
        }
      }
    }

    const togglePasswordVisibility = () => {
      showPassword.value = !showPassword.value
    }

    const toggleConfirmPasswordVisibility = () => {
      showConfirmPassword.value = !showConfirmPassword.value
    }

    const handleForgotPassword = async () => {
      try {
        const response = await axiosInstance.post('/forgot-password', {
          email: forgotPasswordEmail.value,
        });
        showSnackbar({
          message: 'Inštrukcie na obnovenie hesla boli odoslané na váš email',
          color: 'success'
        });
        activeTab.value = 'login';
      } catch (error: any) {
        showSnackbar({
          message: error.response?.data?.message || 'Nepodarilo sa odoslať email na obnovenie hesla',
          color: 'error'
        });
      }
    };

    //Registration modal
    const handleRegister = async () => {
      try {
        const translatedRole =
          registerRole.value === 'Účastník'
            ? 'participant'
            : registerRole.value === 'Recenzent'
              ? 'reviewer'
              : ''

        const payload = {
          first_name: registerFirstName.value,
          last_name: registerLastName.value,
          email: registerEmail.value,
          password: registerPassword.value,
          confirmPassword: confirmPassword.value,
          university: registerUniversity.value === 'Iné' ? registerCustomUniversity.value : registerUniversity.value,
          role: translatedRole,
        }
        const response = await authStore.register(payload)

        showSnackbar({
          message: response.message || 'Registrácia úspešná!',
          color: 'success',
        })
        console.log('Registration successful:', response.data)

        loginDialog.value = false
        resetForm()
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const backendMessage =
            error.response?.data?.message ||
            'Nastala neočakávaná chyba pri registrácii.'
          console.error('Registration failed:', backendMessage)
          showSnackbar({ message: backendMessage, color: 'error' })
        } else {
          console.error('Unexpected error:', error)
          showSnackbar({
            message: 'Nastala neočakávaná chyba.',
            color: 'error',
          })
        }
        loginEmail.value = ''
        loginPassword.value = ''
      }
    }

    const isLoggedIn = computed(() => authStore.isAuthenticated);

    const loginButtonLabel = computed(() => (isLoggedIn.value ? "Profil" : "Prihlásenie"));

    const loginButtonAction = () => {
      if (isLoggedIn.value) {
        router.push("/auth/profile"); // Navigate to profile if logged in
      } else {
        loginDialog.value = true;
      }
    };

    //Reset form fields after successful registration
    const resetForm = () => {
      registerFirstName.value = ''
      registerLastName.value = ''
      registerEmail.value = ''
      registerPassword.value = ''
      confirmPassword.value = ''
      registerUniversity.value = ''
      registerRole.value = ''
    }

    const getError = (field: string) => {
      return errors.value[field] || []
    }

    return {
      loginDialog,
      activeTab,
      password,
      confirmPassword,
      showPassword,
      showConfirmPassword,
      passwordError,
      passwordMismatch,
      loginEmail,
      loginPassword,
      forgotPasswordEmail,
      registerFirstName,
      registerLastName,
      registerEmail,
      registerPassword,
      registerUniversity,
      registerCustomUniversity,
      registerRole,
      universities,
      roles,
      snackbar,
      loginButtonLabel,
      isLoggedIn,
      loginButtonAction,
      openLoginModal,
      showSnackbar,
      togglePasswordVisibility,
      toggleConfirmPasswordVisibility,
      handleLogin,
      handleForgotPassword,
      handleRegister,
      getError,
      resetForm,
    }
  },
})
</script>

<template>
  <v-app-bar app color="rgba(210, 233, 227, 0.8)" elevate-on-scroll flat>
    <!-- Logo -->
    <v-app-bar-title>
      <img src="@/assets/images/logo_h.png" alt="Logo" />
    </v-app-bar-title>

    <v-spacer></v-spacer>

    <!-- Login/Profile Button -->
    <v-btn outlined class="login-button" @click="loginButtonAction">
      {{ loginButtonLabel }}
      <v-icon left>{{ isLoggedIn ? 'mdi-account' : 'mdi-login' }}</v-icon>
    </v-btn>

    <!-- GitHub Icon -->
    <v-btn
      href="https://www.fpvai.ukf.sk/sk/"
      target="_blank"
      variant="text"
      class="faculty_logo"
    >
      <img src="@/assets/images/FPVaI_logo.png" alt="FPVaI Logo" class="faculty-logo-img"/>
    </v-btn>

    <!-- Login/Registration Modal -->
    <v-dialog v-model="loginDialog" max-width="600px">
      <v-card>
        <v-card-text>
          <v-tabs v-model="activeTab" grow>
            <v-tab value="login">Prihlásenie</v-tab>
            <v-tab value="register">Registrácia</v-tab>
          </v-tabs>
          <div v-if="activeTab === 'login'">
            <!-- Login Form -->
            <v-form ref="loginForm" @submit.prevent="handleLogin">
              <v-text-field
                v-model="loginEmail"
                label="Email"
                type="email"
                :error-messages="getError('email')"
                required
                class="large-text-field"
              ></v-text-field>
              <v-text-field
                v-model="loginPassword"
                :type="showPassword ? 'text' : 'password'"
                label="Heslo"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="togglePasswordVisibility"
                :error-messages="getError('password')"
                required
                class="large-text-field"
              ></v-text-field>
              <v-btn color="primary" type="submit" block>Prihlásiť sa</v-btn>
            </v-form>
            <div class="forgot-password">
              <v-btn
                small
                @click="activeTab = 'forgotPassword'"
                class="margin-top-btn"
                >Zabudnuté heslo?</v-btn
              >
            </div>
          </div>
          <div v-if="activeTab === 'register'">
            <v-form ref="registerForm" @submit.prevent="handleRegister">
              <v-text-field
                v-model="registerFirstName"
                label="Meno"
                :error-messages="getError('first_name')"
                required
                class="large-text-field"
              ></v-text-field>
              <v-text-field
                v-model="registerLastName"
                label="Priezvisko"
                :error-messages="getError('last_name')"
                required
                class="large-text-field"
              ></v-text-field>
              <v-text-field
                v-model="registerEmail"
                label="Email"
                type="email"
                required
                class="large-text-field"
              ></v-text-field>
              <v-text-field
                v-model="registerPassword"
                :type="showPassword ? 'text' : 'password'"
                label="Heslo"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="togglePasswordVisibility"
                :error-messages="passwordError"
                required
                class="large-text-field"
              ></v-text-field>
              <!-- Confirm Password Field -->
              <v-text-field
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                label="Zopakujte heslo"
                :error-messages="passwordError"
                required
                class="large-text-field"
              ></v-text-field>
              <v-select
                v-model="registerUniversity"
                :items="universities"
                label="Univerzita"
                :error-messages="getError('university')"
                required
                class="large-text-field"
              ></v-select>
              <!-- Custom university input field -->
              <v-text-field
                v-if="registerUniversity === 'Iné'"
                v-model="registerCustomUniversity"
                label="Zadajte názov univerzity"
                required
                class="large-text-field"
              ></v-text-field>
              <v-select
                v-model="registerRole"
                :items="roles"
                label="Role"
                :error-messages="getError('role')"
                required
                class="large-text-field"
              ></v-select>
              <v-btn
                color="primary"
                type="submit"
                block
                :disabled="passwordMismatch"
                >Registrovať sa</v-btn
              >
            </v-form>
          </div>
          <div v-if="activeTab === 'forgotPassword'">
            <!-- Forgot Password Form -->
            <v-form
              ref="forgotPasswordForm"
              @submit.prevent="handleForgotPassword"
            >
              <v-text-field
                v-model="forgotPasswordEmail"
                label="Email"
                type="email"
                required
              ></v-text-field>
              <v-btn color="primary" type="submit" block>Obnoviť heslo</v-btn>
              <v-btn small @click="activeTab = 'login'"
                >Späť na prihlásenie</v-btn
              >
            </v-form>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="loginDialog = false">Zatvoriť</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app-bar>
  <v-snackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    :timeout="snackbar.timeout"
    top
  >
    {{ snackbar.message }}
    <template v-slot:actions>
      <v-btn @click="snackbar.show = false"> Close </v-btn>
    </template>
  </v-snackbar>
</template>

<style lang="scss">
.v-app-bar {
  box-shadow: none;
  height: 100px;
  padding-top: 15px;
  align-content: center;
  border: none;

  .v-app-bar-title {
    padding-left: 10px;
    img {
      height: 80px;
      max-width: 100%;
      object-fit: contain;
      display: block;
    }

    img:hover {
      transform: scale(1.1);
    }
  }

  .login-button {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: bold;
    font-size: 1.2rem;
    color: #fff !important;
    border: none;
    border-radius: 8px;
    background-color: #bc463a;
    padding: 30px 20px;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);

    &:hover {
      background-color: rgba(188, 70, 58, 0.7) !important;
      color: #fff !important;
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 4px rgba(188, 70, 58, 0.5);
    }

    .v-icon {
      font-size: 30px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.faculty-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  height: 100px;
}

.faculty-logo-img {
  height: 50px;
  max-width: 150px;
  object-fit: contain;
  margin-top: -5px;
  &:hover {
    transform: scale(1.1);
  }
}

.v-tabs {
  margin-bottom: 20px;
  font-size: 1.5rem;
}
.v-tab {
  font-size: 18px;
  font-weight: bold;
  color: #116466;
  text-transform: uppercase;
  padding: 12px 16px;
}

.text-h5 {
  text-align: center;
}

.v-snackbar {
  font-size: 1.5rem;
  background: transparent;
  color: white;
}

.large-text-field input {
  font-size: 20px;
}

.large-text-field label {
  font-size: 20px;
}

.large-text-field .v-input__control {
  font-size: 1.5rem;
}

.margin-top-btn {
  margin-top: 20px;
}
</style>
