import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axiosInstance from "@/config/axiosConfig";
import type { ActiveCategory } from '@/types/conference.ts'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'
import type { ProgramItem } from '@/types/homepage.ts'

export const useHomepageStore = defineStore("homepage", () => {
  const program = ref<{ items: ProgramItem[]; fileLink: string } | null>(null);
  const activeCategories = ref<ActiveCategory[]>([]);
  const ongoingConference = ref<any>(null);
  const programDocumentUrl = ref<string | null>(null);
  const committees = ref<{ _id: string; fullName: string; university: string }[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  const fetchHomepageData = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axiosInstance.get("/homepage");
      console.log("Full API Response:", response.data);

      committees.value = response.data.homepage?.committees || response.data.committees || [];
      program.value = response.data.homepage?.program || { items: [], fileLink: "" };
      activeCategories.value = [...(response.data.activeCategories || [])];
      programDocumentUrl.value = response.data.homepage?.program?.fileLink || "";

      if (response.data.ongoingConference) {
        ongoingConference.value = { ...response.data.ongoingConference };
      } else {
        ongoingConference.value = null;
      }

      return response.data;
    } catch (err) {
      error.value = "Nepodarilo sa načítať údaje domovskej stránky.";
      console.error("Error fetching homepage data:", err);
    } finally {
      loading.value = false;
    }
  };

  // Helper function to format dates
  const formatDate = (date: string | Date | null): string => {
    if (!date) return 'Neurčený'
    try {
      const parsedDate = typeof date === 'string' ? new Date(date) : date
      if (isNaN(parsedDate.getTime())) return 'Neurčený'
      return format(parsedDate, 'dd.MM.yyyy', { locale: sk })
    } catch {
      return 'Neurčený'
    }
  }

  const deadlines = computed(() => {
    if (!ongoingConference.value) {
      return {
        submissionDeadline: 'Neurčený',
        submissionConfirmation: 'Neurčený',
        reviewDeadline: 'Neurčený',
        correctionDeadline: 'Neurčený',
        conferenceDate: 'Neurčený',
      }
    }

    return {
      submissionDeadline: formatDate(ongoingConference.value.deadline_submission),
      submissionConfirmation: formatDate(ongoingConference.value.submission_confirmation),
      reviewDeadline: formatDate(ongoingConference.value.deadline_review),
      correctionDeadline: formatDate(ongoingConference.value.deadline_correction),
      conferenceDate: `${formatDate(ongoingConference.value.date)}`,
    }
  })

  // Fetch committees from the backend
  const fetchCommittees = async () => {
    loading.value = true;
    try {
      const response = await axiosInstance.get("/auth/admin/committees");
      committees.value = response.data.committees;
    } catch (err) {
      console.error("Error fetching committees:", err);
      error.value = "Nepodarilo sa načítať organizačný výbor.";
    } finally {
      loading.value = false;
    }
  };

  // Add a committee member
  const addCommittee = async (newMember: { fullName: string; university: string }) => {
    try {
      const response = await axiosInstance.post("/auth/admin/committees", newMember);
      committees.value = response.data.committees;
      await fetchCommittees();

    } catch (err) {
      console.error("Error adding committee member:", err);
      throw err;
    }
  };

  // Update a committee member using _id
  const updateCommittee = async (committeeId: string, updates: { fullName: string; university: string }) => {
    try {
      const response = await axiosInstance.patch(`/auth/admin/committees/${committeeId}`, updates);
      committees.value = response.data.committees;
      await fetchCommittees();
    } catch (err) {
      console.error("Error updating committee member:", err);
      throw err;
    }
  };

  // Delete a committee member using _id
  const deleteCommittee = async (committeeId: string) => {
    try {
      const response = await axiosInstance.delete(`/auth/admin/committees/${committeeId}`);
      committees.value = response.data.committees;
    } catch (err) {
      console.error("Error deleting committee member:", err);
      throw err;
    }
  };

// Fetch conference program
  const fetchProgram = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axiosInstance.get("/auth/admin/program");
      program.value = response.data.program || [];
      programDocumentUrl.value = response.data.program.fileLink || "";
    } catch (err) {
      console.error("Error fetching conference program:", err);
      error.value = "Nepodarilo sa načítať program konferencie.";
    } finally {
      loading.value = false;
    }
  };

  const updateProgram = async (payload: { programItems: ProgramItem[], fileLink: string }) => {
    try {
      await axiosInstance.patch("/auth/admin/program", payload);
      program.value = { items: payload.programItems, fileLink: payload.fileLink };
    } catch (err) {
      console.error("Error updating program:", err);
      throw err;
    }
  };

// Delete a program item using its index
  const deleteProgramItem = async (itemId: string) => {
    try {
      const response = await axiosInstance.delete(`/auth/admin/program/${itemId}`);
      program.value = response.data.program;
    } catch (err) {
      console.error("Error deleting program item:", err);
      throw err;
    }
  };

  return {
    program,
    activeCategories,
    ongoingConference,
    programDocumentUrl,
    committees,
    loading,
    error,

    fetchHomepageData,
    fetchCommittees,
    addCommittee,
    updateCommittee,
    deleteCommittee,
    fetchProgram,
    updateProgram,
    deleteProgramItem,

    deadlines,
  };
});
