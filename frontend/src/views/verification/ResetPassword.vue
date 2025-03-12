<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/config/axiosConfig';

export default defineComponent({
  setup() {
    const router = useRouter();
    const newPassword = ref('');
    const confirmPassword = ref('');
    const token = ref<string | null>(null);
    const snackbar = ref({ show: false, message: '', color: '' });
    const loading = ref(false);

    onMounted(() => {
      const query = new URLSearchParams(window.location.search);
      token.value = query.get('token');

      if (!token.value) {
        snackbar.value = {
          show: true,
          message: 'Neplatný alebo chýbajúci resetovací token',
          color: 'error'
        };
        setTimeout(() => router.push('/login'), 3000);
      }
    });

    const validatePassword = () => {
      if (newPassword.value.length < 6) {
        snackbar.value = {
          show: true,
          message: 'Heslo musí mať aspoň 6 znakov',
          color: 'error'
        };
        return false;
      }
      if (newPassword.value !== confirmPassword.value) {
        snackbar.value = {
          show: true,
          message: 'Heslá sa nezhodujú',
          color: 'error'
        };
        return false;
      }
      return true;
    };

    const handleResetPassword = async () => {
      if (!validatePassword()) return;

      loading.value = true;
      try {
        const response = await axiosInstance.post('/reset-password', {
          token: token.value,
          newPassword: newPassword.value,
        });

        snackbar.value = {
          show: true,
          message: response.data.message,
          color: 'success'
        };

        setTimeout(() => router.push('/'), 3000);
      } catch (error: any) {
        snackbar.value = {
          show: true,
          message: error.response?.data?.message || 'Obnovenie hesla zlyhalo',
          color: 'error'
        };
      } finally {
        loading.value = false;
      }
    };

    return {
      newPassword,
      confirmPassword,
      handleResetPassword,
      snackbar,
      loading
    };
  }
});
</script>

<template>
  <v-container class="password-reset-container">
    <v-card class="text-center pa-6">
      <v-card-title class="text-h5 mb-4">Reset Password</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="handleResetPassword">
          <v-text-field
            v-model="newPassword"
            label="Nové heslo"
            type="password"
            required
            :rules="[v => !!v || 'Zadajte heslo']"
          ></v-text-field>

          <v-text-field
            v-model="confirmPassword"
            label="Zopakujte heslo"
            type="password"
            required
            :rules="[v => !!v || 'Zadajte heslo']"
          ></v-text-field>

          <v-btn
            color="primary"
            type="submit"
            block
            :loading="loading"
            :disabled="loading"
          >
            Reset Password
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>
