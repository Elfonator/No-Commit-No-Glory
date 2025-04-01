<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import defaultAvatar from '@/assets/images/unknown_person.jpg'

export default defineComponent({
  name: 'ProfileView',
  setup() {

    const userStore = useUserStore()
    const editMode = ref(false)
    const profileData = reactive({
      first_name: '',
      last_name: '',
      university: '',
      faculty: '',
      about: '',
      avatar: null as File | null,
      currentPassword: '',
      newPassword: '',
    })

    const userProfile = computed(() => userStore.userProfile)
    const isLoading = ref(false)

    const toggleEditMode = () => {
      editMode.value = !editMode.value
      if (editMode.value) {
        Object.assign(profileData, { ...userProfile.value })
        profileData.avatar = null
      } else {
        profileData.avatar = userProfile.value.avatar
      }
    }

    const saveProfile = async () => {
      isLoading.value = true
      try {
        await userStore.updateUserProfile(
          profileData,
          profileData.avatar instanceof File ? profileData.avatar : undefined,
        )

        await userStore.fetchUserProfile()
        toggleEditMode()
      } catch (error) {
        console.error('Failed to save profile:', error)
      } finally {
        isLoading.value = false
      }
    }

    watch(
      () => profileData.avatar,
      newAvatar => {
        if (newAvatar instanceof File) {
          console.log('Avatar updated to file:', newAvatar)
        } else {
          console.log('No file selected. Avatar reset to null.')
        }
      },
    )

    watch(userProfile, newProfile => {
      console.log('User Profile Updated:', newProfile)
    })

    const avatarUrl = computed(() =>
      profileData.avatar instanceof File
        ? URL.createObjectURL(profileData.avatar)
        : userProfile.value?.avatar
          ? `${import.meta.env.VITE_API_URL}${userProfile.value.avatar}`
          : defaultAvatar,
    )

    onMounted(async () => {
      await userStore.fetchUserProfile()
      console.log('Fetched User Profile:', userStore.userProfile)
    })

    return {
      userProfile,
      profileData,
      editMode,
      isLoading,
      avatarUrl,
      toggleEditMode,
      saveProfile,
    }
  },
})
</script>

<template>
  <v-container class="profile">
    <!-- Profile Card -->
    <v-card class="profile-card" outlined>
      <v-row align="center">
        <!-- Avatar -->
        <v-col cols="12" md="2" class="d-flex justify-center">
          <v-avatar size="120">
            <v-img :src="avatarUrl" alt="Avatar" contain style="object-fit: cover;"></v-img>
          </v-avatar>
        </v-col>

        <!-- Profile Info -->
        <v-col cols="12" md="3">
          <h3>{{ userProfile?.first_name }} {{ userProfile?.last_name }}</h3>
          <p>{{ userProfile?.faculty }}</p>
          <p class="uni">{{ userProfile?.university }}</p>
        </v-col>
        <v-col cols="12" md="4">
          <p class="about">{{ userProfile?.about }}</p>
        </v-col>

        <!-- Edit Button -->
        <v-col class="d-flex justify-end">
          <v-btn
            class="flex-grow-0"
            color="primary"
            size="large"
            @click="toggleEditMode"
            v-if="!editMode"
            variant="flat"
            rounded
            >Upraviť</v-btn
          >
        </v-col>
      </v-row>

      <!-- Edit Profile Form -->
      <v-form v-if="editMode">
        <v-row dense>
          <v-col cols="6">
            <v-text-field
              v-model="profileData.first_name"
              label="Meno"
              outlined
              :rules="[v => !!v || 'Meno je povinné']"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="profileData.last_name"
              label="Priezvisko"
              outlined
              :rules="[v => !!v || 'Priezvisko je povinné']"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="profileData.university"
              label="Univerzita"
              outlined
              :rules="[v => !!v || 'Univerzita je povinná']"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="profileData.faculty"
              label="Fakulta"
              outlined
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="profileData.about"
              label="O mne"
              outlined
            ></v-textarea>
          </v-col>
          <v-divider color="primary-shadow"></v-divider>
          <v-col cols="6">
            <v-text-field
              v-model="profileData.currentPassword"
              label="Aktuálne heslo"
              type="password"
              outlined
              :rules="[
                v =>
                  (!v && !profileData.newPassword) ||
                  !!v ||
                  'Aktuálne heslo je povinné pri zmene hesla',
              ]"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="profileData.newPassword"
              label="Nové heslo"
              type="password"
              outlined
              :rules="[
                v =>
                  (!v && !profileData.currentPassword) ||
                  !!v ||
                  'Nové heslo je povinné pri zmene hesla',
              ]"
            ></v-text-field>
          </v-col>
          <v-divider></v-divider>
          <v-col cols="12">
            <v-file-input
              label="Upload Avatar"
              accept="image/*"
              outlined
              clearable
              v-model="profileData.avatar"
            />
          </v-col>
        </v-row>

        <!-- Form Actions -->
        <v-row>
          <v-col cols="12" class="d-flex justify-end">
            <v-btn color="#BC463A" @click="toggleEditMode" variant="tonal">Zrušiť</v-btn>
            <v-btn color="primary" @click="saveProfile" variant="tonal">Uložiť</v-btn>
          </v-col>
        </v-row>
      </v-form>
    </v-card>
  </v-container>
</template>

<style lang="scss">
.profile {
  display: flex;
  justify-content: center;
  align-items: start;
  height: 100%;

  h3 {
    color: #116466;
  }

  .uni {
    font-weight: bold;
  }

  .about {
    color: #2c3531;
    font-style: oblique;
    font-size: 1rem;
  }
}

.profile-card {
  padding: 20px;
  border-radius: 10px;
  min-width: 100%;
}

.v-avatar img {
  border-radius: 10%;
  object-fit: cover !important;
  padding-bottom: 5px;
}
</style>
