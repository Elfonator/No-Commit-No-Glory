<template>
  <v-container class="not-found-container">
    <!-- Image above the card -->
    <img
      src="@/assets/images/404.png"
      alt="404 Not Found"
      class="not-found-image"
    />

    <v-card class="text-center" outlined>
      <v-card-title class="text-h3">Stránka sa nenašla</v-card-title>
      <v-card-text>
        <p>Stránka, ktorú hľadáte, neexistuje.</p>
        <p>
          Budete presmerovaní na domovskú stránku za {{ countdown }} sekund.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="redirectNow">Domovská stránka</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'NotFoundPage',
  setup() {
    const router = useRouter()
    const countdown = ref(5) // Countdown timer (5 seconds)

    const redirectNow = () => {
      router.push('/') // Redirect to homepage
    }

    // Countdown logic
    onMounted(() => {
      const interval = setInterval(() => {
        if (countdown.value > 0) {
          countdown.value--
        } else {
          clearInterval(interval)
          redirectNow(); // Redirect when countdown reaches 0
        }
      }, 1000)
    })

    return {
      countdown,
      redirectNow,
    }
  },
})
</script>

<style scoped lang="scss">
.not-found-container {
  background-color: #9e9e9e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  padding: 20px;
}

.not-found-image {
  max-width: 500px;
  margin-bottom: 16px;
}

v-card {
  max-width: 400px;
  padding: 16px;
}

p {
  font-size: 1.2rem;
}
</style>
