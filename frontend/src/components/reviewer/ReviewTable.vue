<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useReviewStore } from '@/stores/reviewStore';
import { format } from 'date-fns'
import { usePaperStore } from '@/stores/paperStore.ts'
import type { Review } from '@/types/review.ts'

export default defineComponent({
  name: 'ReviewTable',
  setup() {
    const reviewStore = useReviewStore();
    const paperStore = usePaperStore();
    const viewReviewDialog = ref(false);
    const selectedReview = ref<any>(null);
    const submittedReviews = computed(() => reviewStore.reviewerReviews);

    const headers = [
      { title: 'Odporúčanie', key: 'recommendation', width: '50px' },
      { title: 'ŠVK', key: 'conference', width: '180px'},
      { title: 'Dátum', key: 'created_at', width: '130px' },
      { title: 'Názov práce', key: 'title', sortable: false },
      { title: '', key: 'actions', sortable: false },
    ];

    const papers = computed(() =>
      paperStore.reviewerPapers.filter(
        (paper) =>
          !reviewStore.reviewerReviews.some(
            (review) => review.paper === paper._id
          )
      )
    );

    const filters = ref({
      title: '',
      conferenceYear: '',
      recommendation: '',
    });

    const recommendations = [
      { text: 'Publikovať', value: 'Publikovať' },
      { text: 'Publikovať so zmenami', value: 'Publikovať_so_zmenami' },
      { text: 'Odmietnuť', value: 'Odmietnuť' },
    ];

    // Filtered reviews
    const filteredReviews = computed(() => {
      return reviewStore.reviewerReviews.filter((review) => {
        const matchesTitle =
          !filters.value.title ||
          review.paper.title
            .toLowerCase()
            .includes(filters.value.title.toLowerCase());
        const matchesConferenceYear =
          !filters.value.conferenceYear ||
          review.paper.conference?.year === filters.value.conferenceYear;
        const matchesRecommendation =
          !filters.value.recommendation ||
          review.recommendation === filters.value.recommendation;

        return matchesTitle && matchesConferenceYear && matchesRecommendation;
      });
    });

    const resetFilters = () => {
      filters.value = {
        title: '',
        conferenceYear: '',
        recommendation: '',
      };
    };

    const viewReview = (review: Review) => {
      selectedReview.value = review;
      viewReviewDialog.value = true;
    };

    const editReview = (review: Review) => {
      if (!review.isDraft) return;
      selectedReview.value = { ...review };
      viewReviewDialog.value = true;
    };

    const sendReview = async (review: Review) => {
      if (!review.isDraft) return;

      try {
        await reviewStore.updateReviewStatus(review._id, "submitted");
        showSnackbar?.({ message: "Recenzia bola odoslaná.", color: "success" });
        await reviewStore.fetchAllReviews(); // Refresh the list
      } catch (error) {
        console.error("Error sending review:", error);
        showSnackbar?.({ message: "Chyba pri odosielaní recenzie.", color: "error" });
      }
    };

    const confirmDelete = async (review: Review) => {
      if (!review.isDraft) return;

      const confirmed = confirm("Naozaj chcete vymazať túto recenziu?");
      if (!confirmed) return;

      try {
        await reviewStore.deleteReview(review._id);
        showSnackbar?.({ message: "Recenzia bola vymazaná.", color: "success" });
        await reviewStore.fetchAllReviews(); // Refresh list
      } catch (error) {
        console.error("Error deleting review:", error);
        showSnackbar?.({ message: "Chyba pri mazaní recenzie.", color: "error" });
      }
    };

    const formatDate = (date: Date | string) =>
      format(new Date(date), 'dd.MM.yyyy')

    onMounted(() => {
      reviewStore.fetchAllReviews();
    });

    return {
      papers,
      headers,
      submittedReviews,
      viewReviewDialog,
      selectedReview,
      filters,
      recommendations,
      filteredReviews,
      editReview,
      sendReview,
      confirmDelete,
      resetFilters,
      formatDate,
      viewReview,
    };
  },
});
</script>

<template>
    <v-card>
      <v-card-title>
        <h2>Odovzdané recenzie</h2>
      </v-card-title>
      <v-card-subtitle>
        <v-row>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.recommendation"
              :items="recommendations"
              label="Odporúčanie"
              item-value="value"
              item-title="text"
              outlined
              dense
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.title"
              label="Názov práce"
              outlined
              dense
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="filters.conferenceYear"
              label="Rok konferencie"
              outlined
              dense
            />
          </v-col>
          <v-col cols="8" md="2">
            <v-btn color="primary" small @click="resetFilters"
            >Zrušiť filter</v-btn
            >
          </v-col>
        </v-row>
      </v-card-subtitle>
      <!-- Data Table -->
        <v-data-table
          :headers="headers"
          :items="filteredReviews"
          :items-per-page="10"
          :pageText="'{0}-{1} z {2}'"
          items-per-page-text="Recenzie na stránku"
          dense
          class="custom-table"
        >
          <template v-slot:body="{ items }">
            <tr v-for="review in items" :key="review._id">
              <td>
                <v-chip
                  :color="
                  review.recommendation === 'Publikovať'? 'green'
                  : review.recommendation === 'Publikovať_so_zmenami'? 'E7B500'
                  : review.recommendation === 'Odmietnuť'? 'red': 'grey'"
                  outlined
                  small
                  class="d-flex justify-center custom-chip rounded"
                >
                  {{ review.recommendation }}
                </v-chip>
              </td>
              <td>{{ review.paper.conference?.year }} - {{ formatDate(review.paper.conference?.date) }}</td>
              <td>{{ formatDate(review.created_at )}}</td>
              <td>{{ review.paper.title }}</td>
              <td class="d-flex justify-end align-center w-100">
                <v-btn
                  :disabled="!review.isDraft"
                  color="#FFCD16"
                  @click="">
                  <v-icon size="25">mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  :disabled="!review.isDraft"
                  color="primary"
                  @click="">
                  <v-icon size="25" color="white">mdi-send</v-icon>
                </v-btn>
                <v-btn
                  :disabled="!review.isDraft"
                  color="#BC463A"
                  @click=""
                  title="Zmazať recenziu"
                >
                  <v-icon size="25">mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
    </v-card>

    <!-- View Review Dialog -->
    <v-dialog v-model="viewReviewDialog" max-width="1200px">
      <v-card>
        <v-card-title>Podrobnosti recenzie</v-card-title>
        <v-card-text>
          <p><strong>Odporúčanie:</strong> {{ selectedReview?.recommendation }}</p>
          <p><strong>Názov práce:</strong> {{ selectedReview?.paper?.title }}</p>
          <p><strong>Komentáre:</strong> {{ selectedReview?.comments || 'N/A' }}</p>
        </v-card-text>
        <v-card-actions>
          <v-btn color="secondary" @click="viewReviewDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<style lang="scss">

</style>
