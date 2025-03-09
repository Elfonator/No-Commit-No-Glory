import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosInstance from '@/config/axiosConfig'
import type { ActiveCategory } from '@/types/conference.ts'

export const useCategoryStore = defineStore('categories', () => {
  // Reactive state
  const categories = ref<
    Array<{ _id: string; name: string; isActive: boolean }>
  >([])
  const participantCategories = ref<
    Array<{ _id: string; name: string; isActive: boolean }>
  >([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  const fetchAllCategories = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await axiosInstance.get('/auth/admin/categories')
      console.log(response.data) // Debugging response structure
      categories.value = response.data.categories || []
    } catch (err) {
      error.value = 'Failed to fetch categories.'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const fetchCategoryById = async (id: string) => {
    try {
      const response = await axiosInstance.get(`/auth/admin/categories/${id}`)
      return response.data
    } catch (err) {
      console.error('Failed to fetch category by ID:', err)
      throw err
    }
  }

  const addCategory = async (category: any) => {
    try {
      const response = await axiosInstance.post(
        '/auth/admin/categories',
        category,
      )
      await fetchAllCategories()

    } catch (err) {
      console.error('Failed to add category:', err)
      throw err
    }
  }

  const updateCategory = async (id: string, updates: any) => {
    try {
      const response = await axiosInstance.patch(
        `/auth/admin/categories/${id}`,
        updates,
      )
      await fetchAllCategories()
    } catch (err) {
      console.error('Failed to update category:', err)
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      await axiosInstance.delete(`/auth/admin/categories/${id}`)
      categories.value = categories.value.filter(cat => cat._id !== id)
    } catch (err) {
      console.error('Failed to delete category:', err)
      throw err
    }
  }

  const fetchParticipantCategories = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await axiosInstance.get('/auth/participant/categories')
      participantCategories.value = response.data as ActiveCategory[]
    } catch (err) {
      error.value = 'Failed to fetch participant categories.'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  return {
    //State
    categories,
    participantCategories,
    loading,
    error,

    //Actions
    fetchAllCategories,
    fetchCategoryById,
    addCategory,
    updateCategory,
    deleteCategory,
    fetchParticipantCategories,
  }
})
