import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

let authStore: ReturnType<typeof import('@/stores/auth').useAuthStore>

export const setAuthStore = (store: typeof authStore) => {
  authStore = store
}

// Create an Axios instance
const axiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
  timeout: 5000,
})

// Axios request interceptor to set the Authorization header
axiosInstance.interceptors.request.use(
  config => {
    if (authStore?.token) {
      config.headers['Authorization'] = `Bearer ${authStore.token}`
    }
    return config
  },
  error => Promise.reject(error),
)

// Response interceptor to handle errors and token refresh
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    if (!authStore) return Promise.reject(error)

    if (error.response?.status === 401) {
      const message = error.response?.data?.message
      if (message === 'Token expired') {
        authStore.isTokenExpired = true
        return Promise.reject(error)
      }
      if (message === 'Invalid token') {
        await authStore.logout()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
