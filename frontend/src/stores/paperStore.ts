import { defineStore } from 'pinia'
import { ref } from 'vue'
import axiosInstance from '@/config/axiosConfig'
import type { Paper } from '@/types/paper.ts'

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
      const formData = new FormData()

      Object.keys(updates).forEach(key => {
        const value = updates[key as keyof Paper]
        if (value !== undefined && value !== null) {
          if (key === 'authors' && Array.isArray(value)) {
            formData.append(key, JSON.stringify(value))
          } else if (key === 'file_link' && value instanceof File) {
            formData.append(key, value)
          } else {
            formData.append(key, value as string)
          }
        }
      })

      const response = await axiosInstance.patch(
        `/auth/participant/papers/${id}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      )

      await getMyPapers()

      return response.data
    } catch (err) {
      console.error('Failed to update paper:', err)
      throw err
    }
  }

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
    loading.value = true
    error.value = null
    try {
      const response = await axiosInstance.get('/auth/reviewer/papers')
      reviewerPapers.value = response.data
    } catch (err) {
      error.value = 'Failed to fetch assigned papers.'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const downloadPaperForReview = async (paperId: string) => {
    try {
      const response = await axiosInstance.get(
        `/auth/reviewer/papers/${paperId}/download`,
        {
          responseType: 'blob',
        },
      );

      //Extract filename from headers if available
      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'novaPraca.pdf';

      //Create a temporary download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download paper for review:', err);
      throw err;
    }
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
      const index = adminPapers.value.findIndex(paper => paper._id === paperId);
      if (index !== -1) {
        adminPapers.value[index] = {
          ...adminPapers.value[index],
          ...response.data.paper,
        };
      }
      console.log('Reviewer assigned:', response.data)
      return response.data.paper;
    } catch (err) {
      console.error('Failed to assign reviewer:', err)
      throw err
    }
  }

  const downloadPaper = async (fileLink: string) => {
    try {
      const response = await axiosInstance.get(fileLink, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'paper.pdf') // Change as needed
      document.body.appendChild(link)
      link.click()
    } catch (error) {
      console.error('Error downloading paper:', error)
      throw error
    }
  }

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
    downloadPaperForReview,

    //Admin Actions
    getAllPapers,
    getPaperById,
    updateDeadline,
    assignReviewerToPaper,
    downloadPaper,
    downloadAllPapersInConference,
  }
})
