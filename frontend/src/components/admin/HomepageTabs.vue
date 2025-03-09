<script lang="ts">
import {computed, defineComponent, onMounted, ref} from 'vue';
import {useHomepageStore} from "@/stores/homepageStore.ts";

export default defineComponent({
  name: 'ConferenceProgram',
  setup() {

    const homepageStore = useHomepageStore();
    const program = computed(() => homepageStore.program);

    const programFile = ref<File | null>(null);

    onMounted(async () => {
      try {
        await homepageStore.fetchProgram();
        console.log(homepageStore.program);
      } catch (error) {
        console.error("Failed to fetch program:", error);
      }
    });

    const addEvent = async () => {
      try {
        const newEvent = {
          _id: "",
          schedule: "",
          description: "",
          fileLink: "",
        };

        program.value.push(newEvent);
      } catch (error) {
        console.error("Failed to add event:", error);
      }
    };

    const removeEvent = (itemId: string) => {
      try {
        const index = program.value.findIndex(event => event._id === itemId || itemId === "");

        if (index !== -1) {
          program.value.splice(index, 1);
        }
      } catch (error) {
        console.error("Failed to remove event:", error);
      }
    };


    const saveProgram = async () => {
      try {
        const file = programFile.value;  // The file selected for upload

        if (file) {
          await homepageStore.uploadProgramFile(file);
        }

        await homepageStore.updateProgram(program.value);
        console.log("Program saved successfully!");
      } catch (error) {
        console.error("Failed to save program:", error);
      }
    };


    return {
      program,
      programFile,
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
            <v-btn color="#BC463A" @click="removeEvent(event._id)">
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
          v-model="programFile"
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
