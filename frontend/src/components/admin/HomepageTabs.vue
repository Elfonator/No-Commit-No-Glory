<script lang="ts">
import { defineComponent, ref } from 'vue';
import type {Program, ProgramItem} from "@/types/homepage.ts";

export default defineComponent({
  name: 'ConferenceProgram',
  setup() {

    const program = ref<Program>({
      fileLink: null,
      items: [
        { _id: '1', schedule: '8:15 – 9:00', description: 'Registrácia' },
        { _id: '2', schedule: '9:00 – 9:20', description: 'Otvorenie konferencie' },
        { _id: '3', schedule: '9:20 – 13:00', description: 'Prezentácie príspevkov v sekciách' },
        { _id: '4', schedule: '13:00 – 14:00', description: 'Prestávka na obed' },
        { _id: '5', schedule: '14:00 – 14:30', description: 'Vyhodnotenie konferencie, vyhlásenie najlepších prác' }
      ]
    });

    const addEvent = () => {
      const newEvent: ProgramItem = {
        _id: String(program.value.items.length + 1),
        schedule: '',
        description: ''
      };
      program.value.items.push(newEvent);
    };

    const removeEvent = (index: number) => {
      program.value.items.splice(index, 1);
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
      <v-list-item v-for="(event, index) in program.items" :key="event._id">
        <v-row class="w-100">
          <!-- Schedule text field column -->
          <v-col cols="2">
            <v-text-field
              v-model="event.schedule"
              label="Čas"
              outlined
              class="mr-2"
            />
          </v-col>

          <!-- Description text field column -->
          <v-col cols="9">
            <v-text-field
              v-model="event.description"
              label="Bod programu"
              outlined
              class="mr-2"
            />
          </v-col>

          <!-- Delete button column -->
          <v-col cols="1" class="d-flex justify-end">
            <v-btn color="#BC463A" @click="removeEvent(index)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-list-item>
    </v-list>
    <v-divider class="my-4"></v-divider>
    <!-- File input for uploading program PDF -->
    <v-row class="mt-3" justify="center">
      <v-col cols="6" class="d-flex justify-center">
        <v-file-input
          v-model="program.fileLink"
          label="Vyberte programový súbor"
          accept=".pdf,.docx,.txt"
          outlined
        />
      </v-col>
    </v-row>

    <!-- Save Button -->
    <v-card-actions>
      <v-btn color="primary" @click="saveProgram">Uložiť program</v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped lang="scss">

</style>
