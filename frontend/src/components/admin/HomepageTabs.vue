<script lang="ts">
import { computed, defineComponent, inject, onMounted, ref } from 'vue'
import {useHomepageStore} from "@/stores/homepageStore.ts";
import type { ProgramItem } from '@/types/homepage.ts'
import axiosInstance from '@/config/axiosConfig.ts'

export default defineComponent({
  name: 'ConferenceProgram',
  setup() {
    const showSnackbar = inject('showSnackbar') as ({
                                                      message,
                                                      color,
                                                    }: {
      message: string
      color?: string
    }) => void

    if (!showSnackbar) {
      console.error('showSnackbar is not provided')
    }

    const homepageStore = useHomepageStore();
    const programItems = computed(() => homepageStore.program?.items || []);

    const localProgramItems = ref<ProgramItem[]>([]);

    const programFile = ref<File | null>(null);

    onMounted(async () => {
      try {
        await homepageStore.fetchProgram();
        localProgramItems.value = [...(homepageStore.program?.items || [])];
      } catch (error) {
        console.error("Failed to fetch program:", error);
      }
    });

    const addEvent = () => {
      try {
        localProgramItems.value.push({
          schedule: "",
          description: "",
        });

        showSnackbar?.({
          message: "Nový bod programu bol pridaný.",
          color: "success",
        });
      } catch (error) {
        showSnackbar?.({
          message: "Nepodarilo sa pridať bod programu.",
          color: "error",
        });
        console.error("Add event failed:", error);
      }
    };

    const removeEvent = (itemId: string) => {
      try {
        const index = localProgramItems.value.findIndex(event => event._id === itemId || !event._id);
        if (index !== -1) {
          localProgramItems.value.splice(index, 1);
          showSnackbar?.({ message: "Bod programu bol odstránený.", color: "success" });
        } else {
          showSnackbar?.({ message: "Bod programu nebol nájdený.", color: "warning" });
        }
      } catch (error) {
        console.error("Remove event failed:", error);
        showSnackbar?.({ message: "Chyba pri odstraňovaní bodu programu.", color: "error" });
      }
    };

    const saveProgram = async () => {
      try {
        let fileLink = homepageStore.program?.fileLink || "";

        if (programFile.value) {
          // Create FormData and append the file
          const formData = new FormData();
          formData.append("file", programFile.value);

          const response = await axiosInstance.post("/auth/admin/program/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          fileLink = response.data.program.fileLink;
        }

        await homepageStore.updateProgram({
          programItems: localProgramItems.value,
          fileLink,
        });
        //console.log("Program uložený vrátane súboru");
        showSnackbar?.({
          message: "Program bol úspešne uložený.",
          color: "success",
        });
      } catch (err) {
        //console.error("Nepodarilo sa uložiť program so súborom", err);
        showSnackbar?.({
          message: "Nepodarilo sa uložiť program so súborom.",
          color: "error",
        });
      }
    };

    return {
      programItems,
      localProgramItems,
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
      <v-list-item v-for="event in localProgramItems" :key="event._id">
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
            <v-btn color="#BC463A" @click="removeEvent(event._id || '')">
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
