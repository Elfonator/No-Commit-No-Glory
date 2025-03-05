<template>
  <v-container class="tabs-container">
    <!-- Tabs -->
    <v-tabs v-model="activeTab" grow>
      <v-tab value="benefits">VÝHODY</v-tab>
      <v-tab value="deadlines">TERMÍNY</v-tab>
      <v-tab value="categories">SEKCIE</v-tab>
      <v-tab value="program">PROGRAM</v-tab>
    </v-tabs>

    <!-- Tab Content -->
    <v-tabs-window v-model="activeTab" class="tabs-window">
      <!-- VÝHODY -->
      <v-tabs-window-item value="benefits">
        <div class="tab-content">
          <ul>
            <li>
              Je zadarmo: účasť na konferencii je bez konferenčného poplatku
            </li>
            <li>
              Výstupom je publikácia: prezentovaný príspevok bude publikovaný v
              zborníku recenzovaných prác
            </li>
            <li>
              Možnosť získať ocenenie: najlepšie práce budú ocenené diplomom a
              mimoriadnym štipendiom či vecnou cenou
            </li>
            <li>
              Výhody pre ďalšiu kariéru: skúsenosti s vystúpením na
              konferenciách a publikácie zvyšujú napríklad šancu prijatia na
              doktorandské štúdium
            </li>
            <li>
              Šanca pre nové kontakty: na konferencii je možnosť spoznať nových
              ľudí v odbore a nadviazať nové spolupráce
            </li>
          </ul>
        </div>
      </v-tabs-window-item>

      <!-- TERMÍNY -->
      <v-tabs-window-item value="deadlines">
        <div class="tab-content">
          <ul>
            <li>
              Odovzdanie práce:&nbsp;<strong>{{
                deadlines.submissionDeadline
              }}</strong>
            </li>
            <li>
              Potvrdenie prijatia práce a sprístupnenie recenzného
              posudku:&nbsp;
              <strong>{{ deadlines.reviewAvailable }}</strong>
            </li>
            <li>
              Nahratie upravenej verzie príspevku na základe recenzie:&nbsp;
              <strong>{{ deadlines.revisedSubmission }}</strong>
            </li>
            <li>
              Konferencia:&nbsp;<strong>{{ deadlines.conferenceDate }}</strong>
            </li>
            <li>
              Oprava práce po konferencii:&nbsp;<strong>{{
                deadlines.finalRevision
              }}</strong>
            </li>
          </ul>
        </div>
      </v-tabs-window-item>

      <!-- SEKCIE -->
      <v-tabs-window-item value="categories">
        <div class="tab-content">
          <ul>
            <li v-for="category in categories" :key="category._id">
              {{ category.name }}
            </li>
          </ul>
        </div>
        <p class="note">
          Počet a zameranie jednotlivých sekcií budú upresnené po odovzdaní
          všetkých príspevkov.
        </p>
      </v-tabs-window-item>

      <!-- PROGRAM -->
      <v-tabs-window-item value="program">
        <div class="tab-content">
          <ul>
            <li><strong>8:15 – 9:00</strong>&nbsp; Registrácia</li>
            <li><strong>9:00 – 9:20</strong>&nbsp; Otvorenie konferencie</li>
            <li>
              <strong>9:20 – 13:00</strong>&nbsp; Prezentácie príspevkov v
              sekciách
            </li>
            <li><strong>13:00 – 14:00</strong>&nbsp; Prestávka na obed</li>
            <li>
              <strong>14:00 – 14:30</strong>&nbsp; Vyhodnotenie konferencie,
              vyhlásenie najlepších prác
            </li>
          </ul>
        </div>
        <p class="note">
          Detailný program je možné pozrieť
          <a href="/docs/program.pdf" target="_blank" rel="noopener noreferrer">
            TU</a
          >
        </p>
      </v-tabs-window-item>
    </v-tabs-window>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import axios from 'axios'
import type { ActiveCategory } from '@/types/conference'
import axiosInstance from '@/config/axiosConfig.ts'

export default defineComponent({
  name: 'TabsSection',
  setup() {
    const activeTab = ref('benefits')
    const categories = ref<ActiveCategory[]>([])
    const deadlines = ref({
      submissionDeadline: '',
      reviewAvailable: '',
      revisedSubmission: '',
      conferenceDate: '',
      finalRevision: '',
    })
    const programDocumentUrl = ref('')

    const getCategories = async () => {
      try {
        const response = await axiosInstance.get('/homepage')
        categories.value = response.data.activeCategories || []
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }

    const getConferenceData = async () => {
      try {
        const response = await axiosInstance.get('/homepage')
        const ongoingConference = response.data.ongoingConference

        if (ongoingConference) {
          const submissionDeadline = new Date(
            ongoingConference.deadline_submission,
          )
          const reviewDeadline = new Date(ongoingConference.date)
          const conferenceDate = new Date(ongoingConference.date)

          // Calculate derived dates
          const reviewAvailable = new Date(reviewDeadline)
          reviewAvailable.setDate(reviewAvailable.getDate() + 1) // +1 day

          const revisedSubmission = new Date(reviewAvailable)
          revisedSubmission.setMonth(reviewAvailable.getMonth() + 1) // End of the month
          revisedSubmission.setDate(0) // Set to last day of the previous month

          deadlines.value = {
            submissionDeadline: submissionDeadline.toLocaleDateString('sk-SK'),
            reviewAvailable: reviewAvailable.toLocaleDateString('sk-SK'),
            revisedSubmission: revisedSubmission.toLocaleDateString('sk-SK'),
            conferenceDate: conferenceDate.toLocaleDateString('sk-SK'),
            finalRevision: revisedSubmission.toLocaleDateString('sk-SK'),
          }
        }
      } catch (error) {
        console.error('Error fetching conference data:', error)
      }
    }

    const getProgramDocument = async () => {
      try {
        const response = await axiosInstance.get('/homepage')
        programDocumentUrl.value = response.data.programDocument || ''
      } catch (error) {
        console.error('Error fetching program document:', error)
      }
    }

    onMounted(() => {
      getCategories()
      getConferenceData()
      getProgramDocument()
    })

    return { activeTab, categories, deadlines, programDocumentUrl }
  },
})
</script>

<style lang="scss">
.tabs-container {
  margin-top: 40px;
  margin-bottom: 40px;
  background-color: #f7f7f7;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  max-width: 73%;

  .tab-content {
    padding: 20px;
    font-size: 16px;

    h3 {
      font-size: 1.5rem;
      font-weight: bold;
      color: #2c3531;
      text-align: center;
      margin-bottom: 20px;
    }

    ul {
      list-style-type: none;
      padding-left: 0;

      li {
        margin-bottom: 10px;
        line-height: 1.3;
        font-size: 1.3rem;
        color: #444;
        display: flex;
        align-items: center;

        &::before {
          content: '≫';
          color: #116466;
          font-size: 2rem;
          margin-right: 10px;
        }
        text-align: justify;
      }
    }
  }

  p {
    font-size: 1.3rem;
    color: #444;
    line-height: 1.5;
  }

  .note {
    color: #5c2018;
    font-style: oblique;
    margin-top: 15px;
    text-align: center;
  }

  .v-tabs {
    margin-bottom: 20px;
    font-size: 2rem;
  }
  .v-tab {
    font-size: 1.5rem;
    font-weight: bold;
    color: #116466;
    background-color: rgb(16, 100, 102, 0.1);
    margin: 0 5px 0 5px;
    text-transform: uppercase;
    padding: 10px 16px;
  }

  .tabs-window {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }

  a {
    color: #28655c;
    font-weight: bold;
    text-decoration: underline;

    &:hover {
      color: #184941;
    }
  }
}
</style>
