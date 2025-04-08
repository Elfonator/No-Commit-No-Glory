<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useHomepageStore } from "@/stores/homepageStore";
import { storeToRefs } from 'pinia'
import type { ActiveCategory } from '@/types/conference.ts'

export default defineComponent({
  name: "TabSectionPast",
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
        </div>
      </v-tabs-window-item>

      <!-- OCENENÉ PRÁCE -->
      <v-tabs-window-item value="awarded">
        <div class="tab-content">
          <!-- logic to dynamically show awarded papers for the latest confernce -->
        </div>
      </v-tabs-window-item>

      <!-- VŠETKO -->
      <v-tabs-window-item value="past">
        <div class="tab-content">
          <!-- logic to show 3 files for past conferences -->
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
