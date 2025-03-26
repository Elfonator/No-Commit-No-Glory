<template>
  <v-navigation-drawer app permanent class="sidebar">
    <!-- Logo Section -->
    <div class="logo-container">
      <router-link to="/" class="logo-link">
        <img
          src="@/assets/images/logo.png"
          alt="SciSubmit Logo"
          class="sidebar-logo"
        />
      </router-link>
    </div>

    <!-- Role-Based Links -->
    <template v-if="roleSpecificLinks.length">
      <v-list-subheader  style="justify-self: center" v-if="authStore.isParticipant()">
        ÚČASTNÍK
      </v-list-subheader>
      <v-list-subheader style="justify-self: center" v-if="authStore.isReviewer()">
        RECENZENT
      </v-list-subheader>
      <v-list-subheader style="justify-self: center" v-if="authStore.isAdmin()">
        ADMINISTRÁTOR
      </v-list-subheader
      >
      <v-list>
        <v-list-item
          v-for="(link, index) in roleSpecificLinks"
          :key="authStore.role + '-' + index"
          :to="link.path"
          exact-active-class="active-link"
          @click="navigateTo(link.path)"
        >
          <div class="link-container">
            <v-list-item-title>{{ link.name }}</v-list-item-title>

            <!-- Badge for admin notifications -->
            <v-badge
              v-if="authStore.isAdmin() && link.name === 'Používatelia'"
              :content="newUserCount"
              color="#bc4639"
              overlap
              v-show="newUserCount > 0"
              class="badge-position"
            ></v-badge>
            <v-badge
              v-if="authStore.isAdmin() && link.name === 'Práce'"
              :content="newPaperCount"
              color="#bc4639"
              overlap
              v-show="newPaperCount > 0"
              class="badge-position"
            ></v-badge>
          </div>
        </v-list-item>

      </v-list>
    </template>
    <template v-if="authStore.isAdmin()">
      <v-divider class="my-4"></v-divider>
      <v-list-subheader>Úprava Homepage</v-list-subheader>
      <v-list>
        <v-list-item
          :to="'/auth/admin/tabs'"
          exact-active-class="active-link"
          @click="navigateTo('/auth/admin/tabs')"
        >
          <v-list-item-title>Program</v-list-item-title>
        </v-list-item>
        <v-list-item
          :to="'/auth/admin/cards'"
          exact-active-class="active-link"
          @click="navigateTo('/auth/admin/cards')"
        >
          <v-list-item-title>Výbory</v-list-item-title>
        </v-list-item>
        <v-list-item
          :to="'/auth/admin/documents'"
          exact-active-class="active-link"
          @click="navigateTo('/auth/admin/documents')"
        >
          <v-list-item-title>Súbory</v-list-item-title>
        </v-list-item>
      </v-list>
    </template>



    <!-- General Links Bottom -->
    <v-divider class="my-4"></v-divider>
    <v-list>
      <v-list-item
        v-for="(link, index) in generalLinksBottom"
        :key="'general-bottom-' + index"
        :to="link.path"
        exact-active-class="active-link"
        @click="navigateTo(link.path)"
      >
        <v-list-item-title>{{ link.name }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notificationStore'

interface Link {
  name: string
  path: string
}

//Access the router and stores
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

//Link definitions
const generalLinksBottom: Link[] = [
  { name: 'Profil', path: '/auth/profile' },
  { name: 'Odhlásiť sa', path: '/auth/logout' },
]
const participantLinks: Link[] = [
  { name: 'Moje práce', path: '/auth/participant/works' },
]
const reviewerLinks: Link[] = [
  { name: 'Pridelené práce', path: '/auth/reviewer/papers' },
  { name: 'Recenzie', path: '/auth/reviewer/reviews' },
]
const adminLinks: Link[] = [
  { name: 'Konferencie', path: '/auth/admin/conferences' },
  { name: 'Používatelia', path: '/auth/admin/users' },
  { name: 'Práce', path: '/auth/admin/papers' },
  { name: 'Kategórie', path: '/auth/admin/categories' },
  { name: 'Otázky', path: '/auth/admin/questions' },
]

//Filter links dynamically based on role using authStore getters
const roleSpecificLinks = computed(() => {
  if (authStore.isParticipant()) return participantLinks
  if (authStore.isReviewer()) return reviewerLinks
  if (authStore.isAdmin()) return adminLinks
  return []
})

//Navigation handler
function navigateTo(path: string): void {
  if (path === '/auth/logout') {
    authStore.logout()
    router.push('/')
  } else {
    router.push(path)
  }
}

//Fetch notifications
onMounted(async () => {
  await notificationStore.fetchNotifications()

  // Optional: auto-refresh every 60 seconds
  setInterval(() => {
    notificationStore.fetchNotifications()
  }, 60000)
})

//Getters for new user and paper counts
const newUserCount = computed(() => notificationStore.newUserCount)
const newPaperCount = computed(() => notificationStore.newPaperCount)

</script>

<style lang="scss">
.sidebar {
  width: 350px;
  top: 0;
  background-color: #f8f9fa;
  border-radius: 0 10px 10px 0;
  box-shadow: 5px 0 5px rgba(0, 0, 0, 0.1);
  font-size: 1.5rem;

  .logo-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 150px;
    margin-bottom: 16px;
  }

  .sidebar-logo {
    width: 80%;
    height: auto;
    margin-left: 30px;
    object-fit: contain;
  }

  .v-list-item-title {
    font-size: 1.2rem;
    font-family: 'Lato', sans-serif;
    color: #2c3531;
  }

  .v-list-item.active-link {
    background-color: #dfe6e9; /* Light gray background */
    font-weight: bold;
    color: #bc4639 !important; /* SciSubmit main accent color */
    border-radius: 5px;
  }
}

.link-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 90%;

  .badge-position {
    margin-left: auto;
    vertical-align: center;
  }
}
</style>
