import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axiosInstance from "@/config/axiosConfig";
import type { ActiveCategory } from '@/types/conference.ts'

export const useHomepageStore = defineStore("homepage", () => {
  const program = ref<{ schedule: string; description: string; fileLink: string }[]>([]);
  const activeCategories = ref<ActiveCategory[]>([]);
  const ongoingConference = ref<any>(null);
  const programDocumentUrl = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed Property: Deadlines extracted from ongoingConference
  const deadlines = computed(() => {
    if (!ongoingConference.value) return {};
    return {
      submissionDeadline: new Date(ongoingConference.value.deadline_submission).toLocaleDateString("sk-SK"),
      submissionConfirmation: new Date(ongoingConference.value.submission_confirmation).toLocaleDateString("sk-SK"),
      reviewDeadline: new Date(ongoingConference.value.deadline_review).toLocaleDateString("sk-SK"),
      correctionDeadline: new Date(ongoingConference.value.deadline_correction).toLocaleDateString("sk-SK"),
      conferenceDate: new Date(ongoingConference.value.date).toLocaleDateString("sk-SK"),
    };
  });

  // Actions
  const fetchHomepageData = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axiosInstance.get("/homepage");

      console.log("Full API Response:", response.data);
      // Check if homepage exists in the response
      if (!response.data.homepage) {
        console.error("Homepage data is missing from API response!");
        return;
      }

      program.value = [...(response.data.homepage?.program?.items || [])];
      activeCategories.value = [...(response.data.activeCategories || [])];
      programDocumentUrl.value = response.data.homepage?.program?.fileLink || "";
      ongoingConference.value = response.data.ongoingConference ? { ...response.data.ongoingConference } : null;

      return response.data;

    } catch (err) {
      error.value = "Nepodarilo sa načítať údaje domovskej stránky.";
      console.error("Error fetching homepage data:", err);
    } finally {
      loading.value = false;
    }
  };



  const updateProgram = async (newProgram: any) => {
    try {
      await axiosInstance.patch("/auth/admin/homepage/program", { program: newProgram });
      program.value = newProgram;
    } catch (err) {
      console.error("Error updating program:", err);
      throw err;
    }
  };

  return {
    program,
    activeCategories,
    ongoingConference,
    programDocumentUrl,
    loading,
    error,

    fetchHomepageData,
    updateProgram,

    deadlines,
  };
});

