import { defineStore } from 'pinia';
import { ref } from 'vue';
import axiosInstance from '@/config/axiosConfig';

export const useContactStore = defineStore('contact', () => {
  const admins = ref([]);

  const fetchAdmins = async () => {
    try {
      const response = await axiosInstance.get('/auth/admins');
      admins.value = response.data;
    } catch (err) {
      console.error('Failed to fetch admins:', err);
      throw err;
    }
  };

  const contactAdmin = async (subject: string, message: string, adminId?: string) => {
    try {
      await axiosInstance.post('/auth/contact-admin', { subject, message, adminId });
      return { success: true, message: 'Správa bola úspešne odoslaná.' };
    } catch (err: any) {
      console.error('Error contacting admin:', err);
      return { success: false, message: err.response?.data?.message || 'Nepodarilo sa odoslať správu.' };
    }
  };

  return { admins, fetchAdmins, contactAdmin };
});
