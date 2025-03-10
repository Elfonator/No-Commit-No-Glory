import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axiosInstance from "@/config/axiosConfig";
import type { ActiveCategory } from '@/types/conference.ts'

export const useHomepageStore = defineStore("homepage", () => {
  const program = ref<{ _id: string; schedule: string; description: string; fileLink: string }[]>([]);
  const activeCategories = ref<ActiveCategory[]>([]);
  const ongoingConference = ref<any>(null);
  const programDocumentUrl = ref<string | null>(null);
  const committees = ref<{ _id: string; fullName: string; university: string }[]>([]);
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
      committees.value = response.data.homepage.committees || response.data.committees || [];
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
    } catch (err) {
      console.error("Error fetching conference program:", err);
      error.value = "Nepodarilo sa načítať program konferencie.";
    } finally {
      loading.value = false;
    }
  };

// Add or update a program item
  const addProgramItem = async (schedule: string, description: string) => {
    try {
      const response = await axiosInstance.post("/auth/admin/program", { schedule, description });
      program.value = response.data.program;
      await fetchProgram();
    } catch (err) {
      console.error("Error adding program item:", err);
      throw err;
    }
  };

  const updateProgramItem = async (itemId: string, updates: { schedule: string; description: string }) => {
    try {
      const response = await axiosInstance.patch(`/auth/admin/program/${itemId}`, updates);
      program.value = response.data.program;
      await fetchProgram();
    } catch (err) {
      console.error("Error updating program item:", err);
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

// Upload program file
  const uploadProgramFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axiosInstance.post("/auth/admin/program/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchProgram(); // Refresh after upload
      return response.data;
    } catch (err) {
      console.error("Error uploading program file:", err);
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
    updateProgram,
    fetchCommittees,
    addCommittee,
    updateCommittee,
    deleteCommittee,
    fetchProgram,
    addProgramItem,
    updateProgramItem,
    deleteProgramItem,
    uploadProgramFile,

    deadlines,
  };
});

