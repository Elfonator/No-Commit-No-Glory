import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosInstance from '@/config/axiosConfig'
import type { User } from '@/types/user.ts'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  //Reactive state
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const role = ref<string | null>(null)
  const isAuthenticated = ref(false)
  const isTokenExpired = ref(false)

  //Actions
  const register = async (payload: {
    first_name: string
    last_name: string
    email: string
    password: string
    confirmPassword: string
    university: string
    role: string
  }) => {
    try {
      const response = await axiosInstance.post('/register', payload)
      return response.data
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/login', { email, password })
      user.value = response.data.user
      role.value = response.data.role || ''
      token.value = response.data.token
      isAuthenticated.value = true

      //Store tokens in localStorage for persistence
      localStorage.setItem('authToken', token.value || '')
      localStorage.setItem('userRole', role.value || '')
      localStorage.setItem('refreshToken', response.data.refreshToken)
      console.log('Received refresh token:', response.data.refreshToken)
      //Set Authorization header for future requests
      axiosInstance.defaults.headers.common['Authorization'] =
        `Bearer ${token.value}`
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken')

    if (!refreshToken) {
      console.warn('No refresh token found, user needs to reauthenticate')
      isTokenExpired.value = true
      return
    }

    try {
      console.log('Attempting to refresh token...')
      const response = await axiosInstance.post('/refresh-token', { refreshToken })

      // Check if refresh token is still valid
      if (!response.data.token) {
        console.error('Invalid refresh token, logging out...')
        await logout()
        return
      }

      token.value = response.data.token
      localStorage.setItem('authToken', token.value || '')

      // Set new token for future requests
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      isTokenExpired.value = false

      console.log('Token refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh token:', error)
      isTokenExpired.value = true
      await logout() // Ensure full logout if refresh fails
    }
  }

  const logout = async () => {
    try {
      // Notify backend to invalidate refresh token
      await axiosInstance.post('/auth/logout').catch(() => {})

      // Clear authentication state
      user.value = null
      token.value = null
      role.value = null
      isAuthenticated.value = false
      isTokenExpired.value = false

      // Remove authentication data from localStorage
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('userRole')

      // Remove the token from Axios headers
      delete axiosInstance.defaults.headers.common['Authorization']

      // Redirect to homepage
      await router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const verifyEmail = async (token: string) => {
    try {
      const response = await axiosInstance.get(`/verify-email?token=${token}`)
      console.log('Email verification response:', response.data)
      return response.data
    } catch (error) {
      console.error('Email verification failed:', error)
      throw error
    }
  }

  const loadAuthState = async () => {
    const authToken = localStorage.getItem('authToken')
    const userRole = localStorage.getItem('userRole')
    const refreshToken = localStorage.getItem('refreshToken')

    if (authToken) {
      //Initialize the access token and headers
      token.value = authToken
      role.value = userRole
      isAuthenticated.value = true
      axiosInstance.defaults.headers.common['Authorization'] =
        `Bearer ${authToken}`
    } else if (refreshToken) {
      //If no access token, try to refresh using the refresh token
      try {
        await refreshAccessToken()
        isAuthenticated.value = true
      } catch (error) {
        console.error('Failed to refresh token:', error)
        await logout() // Clear invalid tokens
      }
    } else {
      await logout() // No valid tokens, log out
    }
  }

  //Getters
  const isParticipant = computed(() => role.value === 'participant')
  const isAdmin = computed(() => role.value === 'admin')
  const isReviewer = computed(() => role.value === 'reviewer')

  return {
    user,
    token,
    role,
    isAuthenticated,
    isTokenExpired,
    register,
    login,
    refreshAccessToken,
    logout,
    verifyEmail,
    loadAuthState,
    isParticipant,
    isAdmin,
    isReviewer,
  }
})
