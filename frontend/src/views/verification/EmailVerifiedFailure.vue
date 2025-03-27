<template>
  <div class="email-verification-container">
    <!-- Logo -->
    <img src="../../assets/logo.png" alt="SciSubmit Logo" class="logo" />

    <!-- Failure Message -->
    <h2>Overenie e-mailu zlyhalo</h2>
    <p>
      Nepodarilo sa nám overiť vašu e-mailovú adresu. Overovací odkaz pravdepodobne vypršal alebo je neplatný.
      Môžete si nechať odoslať nový overovací e-mail nižšie.
    </p>

    <!-- Resend verification -->
    <div class="resend-container">
      <input
        v-model="email"
        type="email"
        placeholder="Zadajte váš e-mail"
        class="input"
      />
      <button @click="resendVerification" :disabled="loading" class="button small">
        {{ loading ? 'Odosielam...' : 'Znova odoslať overovací e-mail' }}
      </button>
      <p v-if="message" class="message">{{ message }}</p>
    </div>

    <!-- Back Home Button -->
    <button @click="navigateToHome" class="button">
      Späť na hlavnú stránku
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.ts'

export default defineComponent({
  name: 'EmailVerificationFailure',
  setup() {
    const router = useRouter();
    const route = useRoute();

    const email = ref('');
    const loading = ref(false);
    const message = ref('');

    onMounted(() => {
      // Autofill email if passed as query param (?email=...)
      const queryEmail = route.query.email as string;
      if (queryEmail) email.value = queryEmail;
    });

    const authStore = useAuthStore();

    const resendVerification = async () => {
      if (!email.value) {
        message.value = 'Zadajte e-mailovú adresu.'
        return
      }

      loading.value = true
      message.value = ''

      try {
        message.value = await authStore.resendVerificationEmail(email.value)
      } catch (error: any) {
        message.value = error.message || 'Nastala chyba pri odosielaní.'
      } finally {
        loading.value = false
      }
    }

    const navigateToHome = () => {
      router.push('/');
    };

    return {
      email,
      loading,
      message,
      resendVerification,
      navigateToHome,
    };
  },
});
</script>

<style scoped>
.email-verification-container {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #2c3531;
  background-color: #f7f7f7;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  max-width: 600px;
  margin: 50px auto;
  text-align: center;
}

.logo {
  max-width: 150px;
  margin-bottom: 20px;
}

h2 {
  color: #116466;
  margin-bottom: 20px;
}

p {
  color: #2c3531;
  margin-bottom: 20px;
}

.input {
  padding: 10px;
  font-size: 14px;
  width: 80%;
  margin: 10px auto;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.button {
  background-color: #bc4639;
  color: white;
  padding: 10px 20px;
  margin-top: 10px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.button:hover {
  background-color: #a03931;
}

.button.small {
  font-size: 14px;
  padding: 8px 16px;
}

.resend-container {
  margin-bottom: 20px;
}

.message {
  margin-top: 10px;
  font-size: 14px;
  color: #444;
}
</style>
