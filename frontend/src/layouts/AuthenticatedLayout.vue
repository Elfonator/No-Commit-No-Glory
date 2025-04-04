<script lang="ts">
import { defineComponent, onMounted, provide, ref, watch } from 'vue'
import SideBar from '@/components/common/SideBar.vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useNotificationStore } from '@/stores/notificationStore.ts'
import router from '@/router'

export default defineComponent({
  name: 'AuthenticatedLayout',
  components: { SideBar },
  setup() {
    const showModal = ref(false)
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()

    //Fetch notifications on layout load
    const fetchNotifications = async () => {
      try {
        await notificationStore.fetchNotifications()
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    //Watch for token expiration
    watch(
      () => authStore.isTokenExpired,
      (expired) => {
        if (expired) {
          console.log('Token expired, showing modal')
          showModal.value = true
        }
      }
    )

    //Handle token refresh
    const refreshToken = async () => {
      try {
        await authStore.refreshAccessToken()
        showModal.value = false
        window.location.reload()
      } catch (error) {
        showSnackbar({
          message: 'Obnovenie tokenu zlyhalo. Prihláste sa znova.',
          color: 'error',
        })
        logout()
      }
    }

    // Snackbar logic
    const snackbar = ref({
      show: false,
      message: '',
      color: 'error',
      timeout: 5000,
    })

    const showSnackbar = ({
      message,
      color = 'error',
    }: {
      message: string
      color?: string
    }) => {
      snackbar.value = { show: true, message, color, timeout: 5000 }
    }

    //Provide showSnackbar to child components
    provide('showSnackbar', showSnackbar)

    watch(snackbar, newVal => {
      console.log('Snackbar state:', newVal)
    })

    //Handle logout
    const logout = async () => {
      await authStore.logout();
      showModal.value = false;
      await router.push('/');
    }

    onMounted(fetchNotifications)

    return {
      showModal,
      notificationStore,
      snackbar,
      showSnackbar,
      refreshToken,
      logout,
    }
  },
})
</script>

<template>
  <div class="banner-container">
    <div class="banner-overlay"></div>
    <img
      src="@/assets/images/bannerAuth.jpg"
      class="banner-image"
      alt="Banner"
    />
  </div>
  <SideBar />
  <!-- Main Content -->
  <v-main>
    <v-container class="main-container" fluid>
      <!-- Snackbar Component -->
      <router-view :key="$route.fullPath" />
      <v-snackbar
        v-model="snackbar.show"
        :color="snackbar.color"
        :timeout="snackbar.timeout"
        top
      >
        {{ snackbar.message }}
        <template #actions>
          <v-btn @click="snackbar.show = false">Zrušiť</v-btn>
        </template>
      </v-snackbar>
    </v-container>
  </v-main>

  <!-- Modal for Token Expiration -->
  <v-dialog v-model="showModal" max-width="600">
    <v-card>
      <v-card-title class="headline">Session Expired</v-card-title>
      <v-card-text>
        Your session has expired. Would you like to stay logged in?
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="refreshToken">Stay Logged In</v-btn>
        <v-btn color="error" @click="logout">Log Out</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<style lang="scss">
.sidebar {
  z-index: 10;
}

.main-container {
  position: relative;
  top: -50px;

  .profile {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 16px;
  }

  .profile-card {
    padding: 16px;
    border-radius: 10px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
    background-color: #fff;
    width: 100%;
    max-width: 900px;
  }
}

</style>
