<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useHomepageStore } from "@/stores/homepageStore";
import { storeToRefs } from 'pinia'
import type { ActiveCategory } from '@/types/conference.ts'

export default defineComponent({
  name: "TabsSectionPast",
  setup() {
    const activeTab = ref("benefits");
    const store = useHomepageStore();
    const {
      deadlines,
      activeCategories,
      program,
      programDocumentUrl,
      acceptedPapers,
      awardedPapers,
      pastConferenceFiles,
    } = storeToRefs(store); // <- first get references from store

    const plainCategories = ref<ActiveCategory[]>([]);

    const categories = computed(() => activeCategories.value || []);

    const backendBaseUrl = import.meta.env.VITE_API_URL;

    const sortedAcceptedPapers = computed(() =>
      Object.entries(acceptedPapers.value)
        .sort(([a], [b]) => a.localeCompare(b))
    );

    const sortedAwardedPapers = computed(() =>
      Object.entries(awardedPapers.value).sort(([a], [b]) => a.localeCompare(b))
    );

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
      acceptedPapers,
      backendBaseUrl,
      sortedAcceptedPapers,
      sortedAwardedPapers,
      pastConferenceFiles,
    };
  },
});
</script>

<template>
  <v-container class="tabs-container">
    <v-tabs v-model="activeTab" grow>
      <v-tab value="accepted">PRIJATÉ PRÁCE</v-tab>
      <v-tab value="awarded">OCENENÉ PRÁCE</v-tab>
      <v-tab value="past">PREDCHÁZUJÚCE</v-tab>
      <v-tab value="gallery">GALERIA</v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab" class="tabs-window">
      <!-- PRIJATÉ PRÁCE -->
      <v-tabs-window-item value="accepted">
        <div class="tab-content">
         <!-- logic to dynamically show accepted papers for the latest conference -->
          <v-expansion-panels multiple>
            <v-expansion-panel
              v-for="([category, papers], index) in sortedAcceptedPapers"
              :key="index"
            >
              <v-expansion-panel-title>{{ category }}</v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list>
                  <v-list-item
                    v-for="(paper, index) in papers"
                    :key="index"
                  >
                      <v-list-item-title>{{ paper.title }}</v-list-item-title>
                      <v-list-item-subtitle>{{ paper.authors.join(', ') }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-tabs-window-item>

      <!-- OCENENÉ PRÁCE -->
      <v-tabs-window-item value="awarded">
        <div class="tab-content">
          <!-- logic to dynamically show awarded papers for the latest confernce -->
          <v-expansion-panels multiple>
            <v-expansion-panel
              v-for="([category, papers], index) in sortedAwardedPapers"
              :key="index"
            >
              <v-expansion-panel-title>{{ category }}</v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list>
                  <v-list-item
                    v-for="(paper, index) in papers"
                    :key="index"
                  >
                    <v-list-item-title>{{ paper.title }}</v-list-item-title>
                    <v-list-item-subtitle>{{ paper.authors.join(', ') }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-tabs-window-item>

      <!-- VŠETKO -->
      <v-tabs-window-item value="past">
        <div class="tab-content">
          <!-- logic to show 3 files for past conferences -->
          <v-expansion-panels multiple>
            <v-expansion-panel
              v-for="(file, index) in pastConferenceFiles"
              :key="file.conference + index"
            >
              <v-expansion-panel-title>
                {{ file.conference }}
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <ul>
                  <li v-if="file.awarded">
                    <a :href="backendBaseUrl + file.awarded" target="_blank">Zoznam ocenených prác</a>
                  </li>
                  <li v-if="file.published">
                    <a :href="backendBaseUrl + file.published" target="_blank">Zoznam publikovaných prác</a>
                  </li>
                  <li v-if="file.collection">
                    <span>Zborník recenzovaných príspevkov, ISBN {{ file.isbn }} <a :href="backendBaseUrl + file.collection" target="_blank">(pdf)</a></span>
                  </li>
                </ul>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-tabs-window-item>

      <!-- GALLERY -->
      <v-tabs-window-item value="gallery">
        <div class="tab-content">
          <!-- future logic for conference gallery -->
        </div>
      </v-tabs-window-item>
    </v-tabs-window>
  </v-container>
</template>

<style lang="scss" scoped>
.tabs-container {
  margin-top: 30px;
  margin-bottom: 30px;
  background-color: #f7f7f7;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  max-width: 75%;

  .tab-content {
    padding: 10px;
    font-size: 16px;

    h3 {
      font-size: 1.5rem;
      font-weight: bold;
      color: #2c3531;
      text-align: center;
      margin-bottom: 20px;
    }

  }

  .v-expansion-panels,
  .v-expansion-panel,
  .v-expansion-panel-title,
  .v-expansion-panel-text {
    width: 100% !important;
    min-width: 100%;
  }

  .v-expansion-panel-title {
    font-weight: bold;
    color: #2c3531;
    font-size: 1.1rem;
  }

  .v-list-item-title {
    color: #116466;
    font-weight: 600;
    font-size: 1rem;
  }

  .v-list-item-subtitle {
    color: rgba(0, 0, 0, 0.5);
    font-size: 0.9rem;
  }

  .v-expansion-panel-text li::before {
    content: none !important;
  }

  .v-expansion-panel-text ul {
    list-style: none;        // removes default bullets
    padding-left: 0 !important;
    margin-left: 0 !important;
  }

  .v-expansion-panel-text li {
    padding-left: 0 !important;
    margin-left: 0 !important;
  }

  .v-expansion-panel-text__wrapper {
    padding: 0 !important;
  }

  p {
    font-size: 1rem;
    color: #444;
    line-height: 1.5;
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
    display: block;

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
