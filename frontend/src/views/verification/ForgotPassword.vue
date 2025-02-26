<script lang="ts">
import { defineComponent, ref } from 'vue';
import axiosInstance from '@/config/axiosConfig';

export default defineComponent({
  setup() {
    const email = ref('');
    const snackbar = ref({ show: false, message: '', color: '' });

    const handleForgotPassword = async () => {
      try {
        const response = await axiosInstance.post('/forgot-password', { email: email.value });
        snackbar.value = { show: true, message: response.data.message, color: 'success' };
      } catch (error) {
        console.error('Password recovery failed:', error);
        snackbar.value = { show: true, message: 'Nepodarilo sa odoslať požiadavku.', color: 'error' };
      }
    };

    return { email, handleForgotPassword, snackbar };
  }
});
</script>

<template>
  <v-container class="password-reset-container">
    <v-card class="text-center">
      <v-card-title class="text-h3">Obnova hesla</v-card-title>
      <v-card-text>
        <v-form ref="forgotPasswordForm" @submit.prevent="handleForgotPassword">
          <v-text-field
            v-model="email"
            label="Váš email"
            type="email"
            required
            class="large-text-field"
          ></v-text-field>
          <v-btn color="primary" type="submit" block>Odoslať obnovu hesla</v-btn>
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
