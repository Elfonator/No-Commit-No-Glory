<script lang="ts">
import { defineComponent, onMounted, provide, ref, watch } from 'vue'
import SideBar from '@/components/common/SideBar.vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useNotificationStore } from '@/stores/notificationStore.ts'

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
    const logout = () => {
      authStore.logout()
      showModal.value = false
      window.location.href = '/'
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

/* Main content styling */
.v-main {
  margin: 0 auto;
  width: 100%;
  max-width: 1500px;
  overflow: visible;
  padding-top: 0;
  position: relative;
  z-index: 2;
}

.main-container {
  position: relative;
  top: -150px;

  /* Profile card container styling */
  .profile {
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3;
    position: relative;
    margin-top: 20px;
  }

  .profile-card {
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    background-color: #fff;
    width: 90%;
    max-width: 900px;
  }
}

.v-card {
  padding: 25px;

  .v-card-title {
    margin: 10px;
    font-size: 1.5rem;
    color: #116466;
    text-transform: uppercase;
  }

  .v-card-subtitle {
    padding-inline: 30px;
  }

  .v-btn {
    margin-top: 10px;
    margin-bottom: 10px;
    margin-right: 5px;
    font-size: 1.2rem;
  }

  .add_new {
    margin-bottom: 20px !important;
    margin-left: 30px;
  }

  .custom-table {
    padding-inline: 30px;
  }

  .custom-table thead th {
    font-size: 1.2rem;
    font-weight: bold !important;
    background-color: rgba(16, 100, 102, 0.1);
    color: #2c3531;
    padding-left: 20px !important;

  }
  .custom-table td {
    font-size: 1.1rem;
    font-weight: normal;

    .custom-chip {
      font-size: 1.1rem;
      padding: 10px 8px;
    }
  }
}

div .v-btn {
  font-size: 1rem !important;
}

</style>
