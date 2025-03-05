<template>
  <v-app>
    <router-view :key="$route.fullPath"/>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

export default defineComponent({
  name: 'App',
  setup() {
    const authStore = useAuthStore() // Use the store inside `setup`

    onMounted(async () => {
      await authStore.loadAuthState() // Call the store function on mount
    })
  },
})
</script>

<style lang="scss"></style>
