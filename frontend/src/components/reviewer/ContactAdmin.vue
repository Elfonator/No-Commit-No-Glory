<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useContactStore } from '@/stores/contactStore';

export default defineComponent({
  setup() {
    const contactStore = useContactStore();
    const subject = ref('');
    const message = ref('');
    const selectedAdmin = ref(null);
    const snackbar = ref({ show: false, message: '', color: '' });

    // Fetch admins when component is mounted
    onMounted(async () => {
      await contactStore.fetchAdmins();
    });

    const sendMessage = async () => {
      if (!subject.value || !message.value) {
        snackbar.value = { show: true, message: 'Vyplňte všetky polia!', color: 'error' };
        return;
      }

      const response = await contactStore.contactAdmin(subject.value, message.value);
      snackbar.value = { show: true, message: response.message, color: response.success ? 'success' : 'error' };

      if (response.success) {
        resetForm();
      }
    };

    const resetForm = () => {
      subject.value = '';
      message.value = '';
      selectedAdmin.value = null;
    };

    return {
      subject,
      message,
      selectedAdmin,
      sendMessage,
      resetForm,
      snackbar,
      admins: contactStore.admins,
    };
  },
});
</script>

<template>
    <v-card>
      <v-card-title>
        <div class="d-flex justify-space-between align-center w-100">
          <h3>Kontaktovať administrátora</h3>
        </div>
      </v-card-title>
      <v-card-text>
        <v-form ref="contactForm" @submit.prevent="sendMessage">
          <!-- Subject -->
          <v-text-field
            v-model="subject"
            label="Predmet"
            placeholder="Zadajte predmet správy"
            required
          ></v-text-field>

          <!-- Message -->
          <v-textarea
            v-model="message"
            label="Správa"
            placeholder="Zadajte svoju správu"
            rows="7"
            required
          ></v-textarea>

          <!-- Dropdown with Admins -->
          <v-select
            v-model="selectedAdmin"
            :items="admins"
            item-title="email"
            item-value="_id"
            label="Vyberte administrátora"
            placeholder="Vyberte admina, ktorému chcete napísať"
            required
          ></v-select>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" @click="sendMessage">Odoslať</v-btn>
        <v-btn color="secondary" @click="resetForm">Zrušiť</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Snackbar Notification -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
</template>

<style scoped lang="scss">

</style>
