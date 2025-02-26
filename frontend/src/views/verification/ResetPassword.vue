<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import axiosInstance from '@/config/axiosConfig';

export default defineComponent({
  setup() {
    const newPassword = ref('');
    const token = ref<string | null>(null);
    const snackbar = ref({ show: false, message: '', color: '' });

    onMounted(() => {
      const query = new URLSearchParams(window.location.search);
      token.value = query.get('token');
    });

    const handleResetPassword = async () => {
      if (!token.value) {
        snackbar.value = { show: true, message: 'Token chýba!', color: 'error' };
        return;
      }

      try {
        const response = await axiosInstance.post('/reset-password', {
          token: token.value,
          newPassword: newPassword.value,
        });
        snackbar.value = { show: true, message: response.data.message, color: 'success' };
      } catch (error) {
        console.error('Password reset failed:', error);
        snackbar.value = { show: true, message: 'Nepodarilo sa resetovať heslo.', color: 'error' };
      }
    };

    return { newPassword, handleResetPassword, snackbar };
  }
});
</script>

<template>
  <v-container class="password-reset-container">
    <v-card class="text-center">
      <v-card-title class="text-h3">Nastavenie nového hesla</v-card-title>
      <v-card-text>
        <v-form ref="resetPasswordForm" @submit.prevent="handleResetPassword">
          <v-text-field
            v-model="newPassword"
            label="Nové heslo"
            type="password"
            required
            class="large-text-field"
          ></v-text-field>
          <v-btn color="primary" type="submit" block>Zmeniť heslo</v-btn>
        </v-form>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<style scoped lang="scss">

</style>
