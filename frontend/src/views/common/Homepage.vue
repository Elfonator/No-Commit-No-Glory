<template>
  <v-app>
    <div class="homepage">
      <!-- Navbar -->
      <Navbar />

      <!-- Banner -->
      <div class="banner-container">
        <div class="banner-overlay"></div>
        <img
          src="@/assets/images/banner.jpg"
          alt="Banner"
          class="banner-image"
        />
        <div class="banner-text">
          <span>{{ displayedText }}</span>
        </div>
        <!-- Logos Section -->
        <div class="logos-section">
          <v-container>
            <v-row justify="space-around" align="center">
              <div class="logos-wrapper">
                <v-col cols="12" sm="4" md="3" class="logo-item">
                  <a href="https://www.fpv.umb.sk/"
                    ><img src="@/assets/images/umb.png" alt="Logo 1"
                  /></a>
                </v-col>
                <v-col cols="12" sm="4" md="3" class="logo-item">
                  <a href="https://www.fpvai.ukf.sk/sk/"
                    ><img src="@/assets/images/ukf.png" alt="Logo 2"
                  /></a>
                </v-col>
                <v-col cols="12" sm="4" md="3" class="logo-item">
                  <a href="https://fpv.ucm.sk/"
                    ><img src="@/assets/images/ucm.png" alt="Logo 3"
                  /></a>
                </v-col>
              </div>
            </v-row>
          </v-container>
        </div>
      </div>

      <div class="event-info-section">
        <v-container>
          <v-row justify="center" align="center">
            <v-col cols="6" class="event-info-item">
              <v-icon class="icon-accent" left>mdi-calendar</v-icon>
              <span>{{ eventData.date }}</span>
            </v-col>
            <v-col cols="6" class="event-info-item">
              <v-icon class="icon-accent" left>mdi-map-marker</v-icon>
              <span>{{ eventData.location }}</span>
            </v-col>
          </v-row>
        </v-container>
      </div>
      <TabsSection />

      <div class="call-to-action-section">
        <v-container>
          <h3 class="cta-title">TAK NEVÁHAJTE!</h3>
          <p class="cta-description">
            Zúčastnite sa študentskej vedeckej konferencie, ktorá je súťažnou
            prehliadkou vedeckých prác študentov.
          </p>
        </v-container>
      </div>

      <CardsSection />
      <Footer />
    </div>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from 'vue'
import Navbar from '@/components/homepage/Navbar.vue'
import axios from 'axios'
import TabsSection from '@/components/homepage/TabsSection.vue'
import CardsSection from '@/components/homepage/CardSection.vue'
import Footer from '@/components/homepage/Footer.vue'
import axiosInstance from '@/config/axiosConfig.ts'

export default defineComponent({
  name: 'Homepage',
  components: {
    Footer,
    CardsSection,
    TabsSection,
    Navbar,
  },
  setup() {
    const eventData = ref({
      date: '',
      location: '',
    })

    const message = 'ŠTUDENTSKÁ VEDECKÁ KONFERENCIA'
    const displayedText = ref('')
    let index = 0

    const typeText = () => {
      if (index < message.length) {
        displayedText.value += message[index]
        index++
        setTimeout(typeText, 100) // Typing speed
      }
    }

    const showLogos = ref(true) // Toggle state
    let interval: number | null = null

    const startToggle = () => {
      interval = setInterval(() => {
        showLogos.value = !showLogos.value
      }, 3000)
    }

    const stopToggle = () => {
      if (interval) clearInterval(interval)
    }

    const getHomepageData = async () => {
      try {
        const response = await axiosInstance.get('/homepage')
        const ongoingConference = response.data.ongoingConference

        if (ongoingConference) {
          const rawDate = new Date(ongoingConference.date)

          // Format date as dd.mm.yyyy
          const formattedDate = rawDate.toLocaleDateString('sk-SK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })

          eventData.value = {
            date: formattedDate,
            location: ongoingConference.location,
          }
        } else {
          eventData.value = {
            date: 'No conference date available',
            location: 'No location available',
          }
        }
      } catch (error) {
        console.error('Error fetching homepage data:', error)
        eventData.value = {
          date: 'Unavailable',
          location: 'Unavailable',
        }
      }
    }

    onMounted(() => {
      getHomepageData()
      startToggle()
      typeText()
    })

    onUnmounted(() => {
      stopToggle()
    })

    return { eventData, showLogos, displayedText }
  },
})
</script>

<style lang="scss" scoped>
.banner-container {
  position: relative;
  width: 100%;
  height: min(70vh, 300px);
  overflow: hidden;

  @media (min-width: 768px) {
    height: 300px;
  }

  @media (min-width: 1200px) {
    height: 400px;
  }

  .banner-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
  }

  .banner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.3),
      rgba(0, 0, 0, 0.7)
    );
  }

  .banner-text {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 2rem;

    span {
      color: rgba(255, 255, 255, 0.85);
      font-family: 'Lato', sans-serif;
      font-size: 2rem;
      font-weight: bold;
      line-height: 1.2;
      text-shadow: 2px 2px 10px rgba(0, 0, 0, 0.7);
      max-width: 100%;
      word-break: keep-all;
      white-space: normal;

      @media (min-width: 880px) {
        font-size: 2.5rem;
      }

      @media (min-width: 1300px) {
        font-size: 3.5rem;
        max-width: 75%;
      }
    }
  }

  .logos-section {
    position: absolute;
    bottom: 0;
    width: 100%;
    max-height: 7em;
    background-color: rgba(210, 233, 227, 0.8);
    text-align: center;
    z-index: 3;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 20px 0;

    .logos-wrapper,
    .text-wrapper {
      display: flex;
      justify-content: space-evenly;
      align-items: center;
      width: 100%;
      transition: opacity 0.5s ease-in-out;
    }

    .logo-item {
      text-align: center;
      margin: 0 10px 0 10px;

      img {
        max-width: 100%;
        max-height: 80px;
        height: auto;
        transition: transform 0.3s;
      }

      img:hover {
        transform: scale(1.1);
      }
    }

    .dynamic-text {
      font-size: 2.5rem;
      font-weight: bold;
      color: #2c3531;
      transition: opacity 0.7s ease-in-out;
    }
  }
}

.event-info-section {
  background-color: rgba(44, 53, 49, 0.9);
  color: white;
  text-align: center;

  .event-info-item {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    padding: 2px;

    v-icon {
      margin-right: 8px;
      font-size: 36px;
    }
    .icon-accent {
      font-size: 36px;
      margin-right: 10px;
      color: #bc463a;
      transition:
        transform 0.3s ease,
        color 0.3s ease;
    }
  }
}

.call-to-action-section {
  background-color: rgba(44, 53, 49, 0.9);
  text-align: center;
  width: 100%;
  max-height: 80px;
  margin-bottom: 30px;

  .cta-title {
    margin-top: -5px;
    font-size: 1rem;
    font-weight: bold;
    color: white;
  }

  .cta-description {
    font-size: 1rem;
    color: #d1e8e2;
    line-height: 1.2;
  }
}
</style>
