<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useHomepageStore } from "@/stores/homepageStore";
import { storeToRefs } from 'pinia'
import type { ActiveCategory } from '@/types/conference.ts'

export default defineComponent({
  name: "TabSection",
  setup() {
    const activeTab = ref("benefits");
    const store = useHomepageStore();
    const {
      deadlines,
      activeCategories,
      program,
      programDocumentUrl
    } = storeToRefs(store); // <- first get references from store

    const plainCategories = ref<ActiveCategory[]>([]);

    const categories = computed(() => activeCategories.value || []);

    const backendBaseUrl = import.meta.env.VITE_API_URL;

    // Load data on component mount
    onMounted(async () => {
      await Promise.all([
        store.fetchHomepageData(),
      ]);
      plainCategories.value = activeCategories.value;
    });

    return {
      activeTab,
      categories,
      deadlines,
      programItems: computed(() => program.value?.items || []),
      programDocumentUrl,
      backendBaseUrl,
    };
  },
});
</script>

<template>
  <v-container class="tabs-container">
    <v-tabs v-model="activeTab" grow>
      <v-tab value="benefits">VÝHODY</v-tab>
      <v-tab value="deadlines">TERMÍNY</v-tab>
      <v-tab value="categories">SEKCIE</v-tab>
      <v-tab value="program">PROGRAM</v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab" class="tabs-window">
      <!-- VÝHODY -->
      <v-tabs-window-item value="benefits">
        <div class="tab-content">
          <ul>
            <li><strong>Je zadarmo</strong>: účasť na konferencii je bez konferenčného poplatku</li>
            <li><strong>Výstupom je publikácia</strong>: prezentovaný príspevok bude publikovaný v zborníku recenzovaných prác</li>
            <li><strong>Možnosť získať ocenenie</strong>: najlepšie práce budú ocenené diplomom a mimoriadnym štipendiom či vecnou cenou</li>
            <li><strong>Výhody pre ďalšiu kariéru</strong>: skúsenosti s vystúpením na konferenciách a publikácie zvyšujú napríklad šancu prijatia na doktorandské štúdium</li>
            <li><strong>Šanca pre nové kontakty</strong>: na konferencii je možnosť spoznať nových ľudí v odbore a nadviazať nové spolupráce</li>
          </ul>
        </div>
      </v-tabs-window-item>

      <!-- TERMÍNY -->
      <v-tabs-window-item value="deadlines">
        <div class="tab-content">
          <ul>
            <li>Odovzdanie práce: <strong>&nbsp;&nbsp;{{ deadlines.submissionDeadline }}</strong></li>
            <li>Potvrdenie prijatia práce: <strong>&nbsp;&nbsp;{{ deadlines.submissionConfirmation }}</strong></li>
            <li>Termín recenzovania: <strong>&nbsp;&nbsp;{{ deadlines.reviewDeadline }}</strong></li>
            <li>Oprava práce: <strong>&nbsp;&nbsp;{{ deadlines.correctionDeadline }}</strong></li>
            <li>Konferencia: <strong>&nbsp;&nbsp;{{ deadlines.conferenceDate }}</strong></li>
          </ul>
        </div>
      </v-tabs-window-item>

      <!-- SEKCIE -->
      <v-tabs-window-item value="categories">
        <div class="tab-content">
          <ul v-if="categories.length > 0">
            <li v-for="category in categories" :key="category._id">
              {{ category.name }}
            </li>
          </ul>
          <p v-else class="note">Žiadne sekcie neboli načítané.</p>
        </div>
        <p class="note">
          Počet a zameranie jednotlivých sekcií budú upresnené po odovzdaní všetkých príspevkov.
        </p>
      </v-tabs-window-item>

      <!-- PROGRAM -->
      <v-tabs-window-item value="program">
        <div class="tab-content">
          <ul v-if="programItems.length > 0">
            <li v-for="(event, index) in programItems" :key="index">
              <strong>{{ event.schedule }}</strong>&nbsp;  {{ event.description }}
            </li>
          </ul>
          <p v-else class="note">Žiadne programové údaje nie sú k dispozícii.</p>

          <p v-if="programDocumentUrl" class="note">
            Detailný program je možné pozrieť
            <a :href="backendBaseUrl + programDocumentUrl" target="_blank">TU</a>
          </p>
        </div>
      </v-tabs-window-item>
    </v-tabs-window>
  </v-container>
</template>

<style lang="scss">
.tabs-container {
  margin-top: 30px;
  margin-bottom: 30px;
  background-color: #f7f7f7;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  max-width: 75%;

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
        font-size: 1rem;
        color: #444;
        text-align: justify;
        line-height: 1.6;
        position: relative;
        padding-left: 2rem;

        &::before {
          content: "⫸";
          position: absolute;
          left: 0;
          top: 0;
          font-size: 1.5rem;
          color: #116466;
          line-height: 1;
        }

        strong {
          font-weight: bold;
          white-space: nowrap;
          margin-right: 0.3rem;
        }
      }
    }
  }

  p {
    font-size: 1rem;
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
    font-size: 1rem;
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

.text-item {
  display: block;
  line-height: 1.6;
  text-align: justify;

  strong {
    font-weight: bold;
    white-space: normal;
  }
}

</style>
