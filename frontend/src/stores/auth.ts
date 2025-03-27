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

      // Store tokens
      localStorage.setItem('authToken', token.value || '')
      localStorage.setItem('userRole', role.value || '')
      localStorage.setItem('refreshToken', response.data.refreshToken)

      // Set auth header
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token.value}`

      // Redirect based on role
      if (role.value === 'admin') {
        await router.push('/auth/admin/conferences')
      } else if (role.value === 'participant') {
        await router.push('/auth/participant/works')
      } else if (role.value === 'reviewer') {
        await router.push('/auth/reviewer/papers')
      } else {
        await router.push('/auth/profile')
      }

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

      if (!response.data.token) {
        console.error('Invalid refresh token, clearing stored tokens...')
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userRole')
        isAuthenticated.value = false
        return
      }

      token.value = response.data.token
      localStorage.setItem('authToken', token.value || '')
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      isTokenExpired.value = false

      console.log('Token refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh token:', error)
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('userRole')
      isAuthenticated.value = false
      isTokenExpired.value = true
    }
  }

  const logout = async () => {
    if (!isAuthenticated.value) {
      console.log("User already logged out, skipping logout request.");
      return;
    }

    try {
      // Notify backend to invalidate refresh token
      await axiosInstance.post('/auth/logout').catch(() => {});

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

  const resendVerificationEmail = async (emailToResend: string): Promise<string> => {
    try {
      const res = await axiosInstance.post('/resend-verification', { email: emailToResend });
      return res.data.message || 'Overovací e-mail bol odoslaný.';
    } catch (error: any) {
      const errMessage =
        error.response?.data?.message || 'Nastala chyba pri odosielaní.';
      throw new Error(errMessage);
    }
  };

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
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userRole')
        isAuthenticated.value = false
      }
    } else {
      console.log("No valid authentication found, but not triggering logout.");
      isAuthenticated.value = false;
    }
  }

  //Getters
  const isParticipant = () => role.value === 'participant'
  const isAdmin = () => role.value === 'admin'
  const isReviewer = () => role.value === 'reviewer'

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
    resendVerificationEmail,
    loadAuthState,
    isParticipant,
    isAdmin,
    isReviewer,
  }
})
