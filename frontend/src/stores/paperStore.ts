import { defineStore } from 'pinia'
import { ref } from 'vue'
import axiosInstance from '@/config/axiosConfig'
import type { Paper, ReviewerPaper } from '@/types/paper.ts'
import type { AxiosResponse } from 'axios'
import { useReviewStore } from '@/stores/reviewStore.ts'

export const usePaperStore = defineStore('papers', () => {
  //Reactive state
  const participantPapers = ref<Array<any>>([])
  const selectedPaper = ref<any>(null)
  const reviewerPapers = ref<Array<any>>([])
  const adminPapers = ref<Array<any>>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  //Actions
  /** Participant Actions **/
  const createPaper = async (paper: any, file: File) => {
    try {
      const formData = new FormData()

      formData.append('authors', JSON.stringify(paper.authors))

      Object.keys(paper).forEach(key => {
        const value = paper[key]
        if (
          key !== 'authors' &&
          value !== undefined &&
          value !== null &&
          key !== 'file_link'
        ) {
          if (typeof value === 'object' && value._id) {
            formData.append(key, value._id)
          } else {
            formData.append(key, value)
          }
        }
      })

      if (file && file instanceof File) {
        formData.append('file_link', file)
      }

      const response = await axiosInstance.post(
        '/auth/participant/papers',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      )
      await getMyPapers()

      return response.data
    } catch (err) {
      console.error('Failed to create paper:', err)
      throw err
    }
  }

  const getMyPapers = async (filters?: {
    conference?: string
    status?: string
  }) => {
    loading.value = true
    error.value = null

    try {
      const params: any = {}
      if (filters?.conference) params.conference = filters.conference
      if (filters?.status) params.status = filters.status

      const response = await axiosInstance.get('/auth/participant/papers', {
        params,
      })

      participantPapers.value = response.data
      return response.data
    } catch (err) {
      error.value = 'Failed to fetch participant papers.'
      console.error(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchPaperById = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await axiosInstance.get(`/auth/participant/papers/${id}`)
      selectedPaper.value = response.data // Set the selected paper details
      return response.data
    } catch (err) {
      error.value = 'Failed to fetch paper details.'
      console.error(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePaper = async (id: string, updates: any, file?: File) => {
    try {
      const formData = new FormData();

      // Add updated values to form data
      Object.keys(updates).forEach(key => {
        const value = updates[key as keyof Paper];
        if (value !== undefined && value !== null) {
          if (key === 'authors' && Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else if (key === 'file_link' && file instanceof File) {
            // Append new file if it's uploaded
            formData.append('file_link', file);
          } else if (key !== 'file_link') {
            formData.append(key, value as string);
          }
        }
      });

      if (file) {
        formData.append('file_link', file);
      } else {
        formData.append('file_link', updates.file_link || '');
      }

      const response = await axiosInstance.patch(
        `/auth/participant/papers/${id}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      await getMyPapers();

      return response.data;
    } catch (err) {
      console.error('Failed to update paper:', err);
      throw err;
    }
  };

  const deletePaper = async (paperId: string) => {
    try {
      await axiosInstance.delete(`/auth/participant/papers/${paperId}`)
      participantPapers.value = participantPapers.value.filter(
        p => p._id !== paperId,
      ) //Remove from local state
      console.log('Paper deleted successfully')
    } catch (error) {
      console.error('Failed to delete paper:', error)
      throw error
    }
  }

  /** Reviewer Actions **/
  const getAssignedPapers = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axiosInstance.get('/auth/reviewer/papers');
      const allAssignedPapers = response.data;

      // Initialize reviewStore (must be inside a function, not globally)
      const reviewStore = useReviewStore();

      // Get reviewed paper IDs (both drafts & submitted)
      const reviewedPaperIds: Set<any> = new Set([
        ...reviewStore.draftReviews.map((review) => review.paper),
        ...reviewStore.submittedReviews.map((review) => review.paper),
      ]);

      // Remove reviewed papers from the assigned papers list
      reviewerPapers.value = allAssignedPapers.filter(
        (paper: ReviewerPaper) => !reviewedPaperIds.has(paper._id)
      );

    } catch (err) {
      error.value = 'Failed to fetch assigned papers.';
      console.error(err);
    } finally {
      loading.value = false;
    }
  };


  // Create a shared utility function
  const extractFilenameFromResponse = (response: AxiosResponse): string => {
    console.log("Raw Headers:", response.headers);

    // Extract filename from headers
    const contentDisposition = response.headers["content-disposition"] || response.headers["Content-Disposition"];
    console.log("Final C-D:", contentDisposition);

    let filename = "paper.pdf"; // Default fallback

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+?)"/);
      if (match) {
        filename = decodeURIComponent(match[1]);
      }
    }

    console.log("Final Downloaded filename:", filename);
    return filename;
  }

  // Create a common download function that accepts role-specific parameters
  const downloadPaper = async (endpoint: string, paperId: string, conferenceId: string): Promise<void> => {
    try {
      const response = await axiosInstance.get(endpoint, {
        responseType: "blob",
        headers: { "Accept": "application/pdf" },
      });

      const filename = extractFilenameFromResponse(response);

      // Create a download link
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading paper:", error);
      throw error;
    }
  };

  // Role-specific wrapper functions
  const downloadPaperAdmin = async (conferenceId: string, paperId: string) => {
    return downloadPaper(`/auth/admin/papers/download/${conferenceId}/${paperId}`, conferenceId, paperId);
  };

  const downloadPaperReviewer = async (conferenceId: string, paperId: string) => {
    return downloadPaper(`/auth/reviewer/papers/download/${conferenceId}/${paperId}`, conferenceId, paperId);
  };

  /** Admin Actions **/
  const getAllPapers = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await axiosInstance.get('/auth/admin/papers')
      console.log('Raw API Response:', response.data) // Log raw response
      adminPapers.value = response.data
    } catch (err) {
      error.value = 'Failed to fetch papers.'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const getPaperById = async (paperId: string) => {
    try {
      const response = await axiosInstance.get(`/auth/admin/papers/${paperId}`)
      return response.data
    } catch (error) {
      console.error(`Failed to fetch paper with ID ${paperId}:`, error)
      throw error
    }
  }

  const updateDeadline = async (paperId: string, newDeadline: Date) => {
    try {
      await axiosInstance.patch(`/auth/admin/papers/${paperId}/deadline`, {
        newDeadline,
      })
      console.log('Deadline updated successfully!')
    } catch (error) {
      console.error('Failed to update submission deadline:', error)
      throw error
    }
  }

  const assignReviewerToPaper = async (paperId: string, reviewerId: string) => {
    try {
      const response = await axiosInstance.patch(
        `/auth/admin/papers/${paperId}/reviewer`,
        {
          reviewerId,
        },
      )

      await getAllPapers();

      console.log('Reviewer assigned:', response.data)
      return response.data.paper;
    } catch (err) {
      console.error('Failed to assign reviewer:', err)
      throw err
    }
  }

  /*
  const downloadSinglePaper = async (conferenceId: string, paperId: string) => {
    try {
      const response = await axiosInstance.get(`/auth/admin/papers/download/${conferenceId}/${paperId}`, {
        responseType: "blob",
        headers: { "Accept": "application/pdf" },
      });

      console.log("Raw Headers:", response.headers);
      console.log("C-D:", response.headers["content-disposition"]);

      // Extract filename from headers
      const contentDisposition = response.headers["content-disposition"] || response.headers["Content-Disposition"];
      console.log("Final C-D:", contentDisposition);

      let filename = "paper.pdf"; // Default fallback

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match) {
          filename = decodeURIComponent(match[1]); // Correctly decode special characters
        }
      }

      console.log("Final Downloaded filename:", filename); // Debugging

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading paper:", error);
      throw error;
    }
  };
   */
  const downloadAllPapersInConference = async (
    conferenceId: string | undefined,
  ) => {
    if (!conferenceId) {
      console.error('Conference ID is undefined')
      return
    }

    try {
      const response = await axiosInstance.get(
        `/auth/admin/papers/download/${conferenceId}`,
        {
          responseType: 'blob',
        },
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `conference-${conferenceId}-papers.zip`)
      document.body.appendChild(link)
      link.click()
    } catch (err) {
      console.error('Failed to download papers for conference:', err)
      throw err
    }
  }

  const adminDeletePaper = async (paperId: string) => {
    try {
      await axiosInstance.delete(`/auth/admin/papers/${paperId}`)
      adminPapers.value = adminPapers.value.filter(paper => paper._id !== paperId)
    } catch (error) {
      console.error('Error deleting paper:', error)
      throw error
    }
  }

  return {
    //State
    participantPapers,
    selectedPaper,
    reviewerPapers,
    adminPapers,
    loading,
    error,

    //Participant Actions
    createPaper,
    getMyPapers,
    fetchPaperById,
    updatePaper,
    deletePaper,

    //Reviewer Actions
    getAssignedPapers,
    downloadPaperReviewer,

    //Admin Actions
    getAllPapers,
    getPaperById,
    updateDeadline,
    assignReviewerToPaper,
    downloadPaperAdmin,
    downloadAllPapersInConference,
    adminDeletePaper
  }
})
