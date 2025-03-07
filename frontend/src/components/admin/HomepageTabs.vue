<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'ConferenceProgram',
  setup() {

    const program = ref([
      { text: '8:15 – 9:00 Registrácia' },
      { text: '9:00 – 9:20 Otvorenie konferencie' },
      { text: '9:20 – 13:00 Prezentácie príspevkov v sekciách' },
      { text: '13:00 – 14:00 Prestávka na obed' },
      { text: '14:00 – 14:30 Vyhodnotenie konferencie, vyhlásenie najlepších prác' }
    ]);

    const addEvent = () => {
      program.value.push({ text: '' });
    };

    const removeEvent = (index: number) => {
      program.value.splice(index, 1);
    };

    const saveProgram = () => {
      console.log('Program saved:', program.value);
    };

    return {
      program,
      addEvent,
      removeEvent,
      saveProgram,
    };
  },
});
</script>

<template>
  <v-card>
    <v-card-title>
      <div class="d-flex justify-space-between align-center w-100">
        <h3>Program Konferencie</h3>
        <v-btn color="primary" @click="addEvent">
          <v-icon left>mdi-plus-circle-outline</v-icon>Pridať bod programu
        </v-btn>
      </div>
    </v-card-title>

    <!-- List of program events -->
    <v-list>
      <v-list-item v-for="(event, index) in program" :key="index">
        <v-row class="w-100">
          <!-- Text field column -->
          <v-col cols="11">
            <v-text-field
              v-model="event.text"
              label="Bod programu"
              outlined
              class="mr-2"
            />
          </v-col>

          <!-- Delete button column -->
          <v-col cols="1" class="d-flex justify-end">
            <v-btn color="red" @click="removeEvent(index)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-list-item>
    </v-list>

    <!-- Save Button -->
    <v-card-actions>
      <v-btn color="primary" @click="saveProgram">Uložiť program</v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped lang="scss">
/* Add custom styles here if needed */
</style>
