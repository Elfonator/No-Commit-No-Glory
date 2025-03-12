import { defineStore } from 'pinia'
import type { User } from '@/types/user.ts'
import type { AdminPaper } from '@/types/paper.ts'
import { UserStatus } from '@/types/user.ts'
import { PaperStatus } from '@/types/paper.ts'
import axiosInstance from '@/config/axiosConfig.ts'
import { useAuthStore } from '@/stores/auth.ts'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    users: [] as User[],
    papers: [] as AdminPaper[],
    //reviews: [] as Review[], // Replace with your review type
  }),
  getters: {
    newUserCount: state =>
      state.users.filter(user => user.status === UserStatus.Pending).length,
    newPaperCount: state =>
      state.papers.filter(
        paper => paper.status === PaperStatus.Submitted && !paper.reviewer,
      ).length,
  },
  actions: {
    setUsers(users: User[]) {
      this.users = users
    },
    setPapers(papers: AdminPaper[]) {
      this.papers = papers
    },
    async fetchNotifications(): Promise<void> {
      try {
      // Get the user role from auth store
        const authStore = useAuthStore();

        // Only fetch admin notifications if the user is an admin
        if (authStore.role === 'admin') {
          const [usersResponse, papersResponse] = await Promise.all([
            axiosInstance.get('/auth/admin/users'),
            axiosInstance.get('/auth/admin/papers'),
          ]);

          this.setUsers(usersResponse.data);
          this.setPapers(papersResponse.data);
        } else {
          // For non-admin users, clear any existing data
          this.setUsers([]);
          this.setPapers([]);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }
  }
})
