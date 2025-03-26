<script lang="ts">
import { defineComponent, ref, computed, onMounted, inject, reactive, nextTick, watch } from 'vue'
import { useReviewStore } from '@/stores/reviewStore';
import { format } from 'date-fns'
import { usePaperStore } from '@/stores/paperStore.ts'
import type { Review, ReviewResponse } from '@/types/review.ts'
import { useQuestionStore } from '@/stores/questionStore.ts'
import type { Question } from '@/types/question.ts'

export default defineComponent({
  name: 'ReviewTable',
  setup() {
    //Access the global showSnackbar function
    const showSnackbar = inject('showSnackbar') as ({
                                                      message,
                                                      color,
                                                    }: {
      message: string
      color?: string
    }) => void

    if (!showSnackbar) {
      console.error('showSnackbar is not provided')
    }

    const isReviewDeadlinePassed = (review: Review): boolean => {
      if (!review.paper?.conference?.deadline_review) {
        return false; // If no deadline is set, allow editing
      }
      const deadline = new Date(review.paper.conference.deadline_review);
      return new Date() > deadline;
    };

    const canEditReview = (review: Review): boolean => {
      // Can only edit if it's a draft AND review deadline hasn't passed
      return review.isDraft && !isReviewDeadlinePassed(review);
    };

    const reviewStore = useReviewStore();
    const paperStore = usePaperStore();
    const questionStore = useQuestionStore();

    const viewReviewDialog = ref(false);
    const reviewDialog = ref(false);
    const confirmationDialog = ref(false);

    const selectedReview = reactive<Review>({
      _id: '',
      paper: '',
      reviewer: '',
      responses: [],
      recommendation: 'Publikovať',
      comments: '',
      isDraft: true,
      created_at: new Date(),
    });

    const reviewResponses = ref<Record<string, string | number | null>>({});

    const submittedReviews = computed(() => reviewStore.reviewerReviews);
    const questions = computed(() => questionStore.reviewerQuestions);

    const headers = [
      { title: '', key: 'view', sortable: false },
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

    const filters = ref({ title: '', conferenceYear: '', recommendation: ''});

    const recommendations = [
      { text: 'Publikovať', value: 'Publikovať' },
      { text: 'Publikovať so zmenami', value: 'Publikovať so zmenami' },
      { text: 'Odmietnuť', value: 'Odmietnuť' },
    ];

    // Filtered Reviews
    const filteredReviews = computed(() => {
      return reviewStore.reviewerReviews.filter((review) => {
        const matchesTitle = !filters.value.title || review.paper.title.toLowerCase().includes(filters.value.title.toLowerCase());
        const matchesConferenceYear =
          !filters.value.conferenceYear ||
          (review.paper?.conference?.year && review.paper.conference.year === filters.value.conferenceYear);
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

    // Categorize questions
    const ratingQuestions = computed(() => questionStore.reviewerQuestions.filter(q => q.type === 'rating'));
    const yesNoQuestions = computed(() => questionStore.reviewerQuestions.filter(q => q.type === 'yes_no'));
    const textQuestions = computed(() => questionStore.reviewerQuestions.filter(q => q.type === 'text'));

    const reviewMode = ref<'view' | 'edit'>('view');

    watch(reviewDialog, (val) => {
      if (!val) reviewMode.value = 'view';
    });

    const isViewMode = computed(() => reviewMode.value === 'view');

    // View review details
    const viewReview = async (review: Review) => {
      reviewMode.value = 'view';
      if (!review) return;

      Object.assign(selectedReview, review);

      // Populate reviewResponses for displaying answers
      reviewResponses.value = {};

      if (review.responses?.length) {
        review.responses.forEach(response => {
          try {
            // Use helper function to determine question ID
            let questionId = getQuestionId(response.question);
            reviewResponses.value[questionId] = response.answer;
            console.log(`Setting response for question ${questionId} to:`, response.answer);
          } catch (error) {
            console.error("Error processing response:", error, response);
          }
        });
      }
      await nextTick();
      reviewDialog.value = true;
    };

    // Helper function to get question ID
    const getQuestionId = (question: Question | string): string =>
      typeof question === 'object' ? question._id : question;

    // Edit an existing review
    const editReview = (review: Review) => {
      reviewMode.value = 'edit';

      if (isReviewDeadlinePassed(review)) {
        showSnackbar?.({ message: "Recenziu už nie je možné upraviť po termíne.", color: "error" });
        return;
      }

      Object.assign(selectedReview, review);

      reviewResponses.value = {};

      if (review.responses?.length) {
        review.responses.forEach(response => {
          try {
            // Use helper function to determine question ID
            let questionId = getQuestionId(response.question);

            reviewResponses.value[questionId] = response.answer;

            console.log(`Setting response for question ${questionId} to:`, response.answer);
          } catch (error) {
            console.error("Error processing response:", error, response);
          }
        });
      }

      console.log("Populated reviewResponses:", reviewResponses.value);

      nextTick(() => {
        reviewDialog.value = true;
      });
    };

    // Format responses for submission
    const formatResponses = (): ReviewResponse[] => {
      return questionStore.reviewerQuestions.map((question) => ({
        _id: question._id,  // Ensure _id is included
        question: question._id,
        answer: reviewResponses.value[question._id] ?? null,
      }));
    };

    const saveDraft = async () => {
      if (!selectedReview._id) return;

      // Check if deadline has passed
      if (isReviewDeadlinePassed(selectedReview)) {
        showSnackbar?.({ message: "Termín na úpravu recenzie už vypršal!", color: "error" });
        return;
      }

      await reviewStore.updateReview(selectedReview._id, {
        paper: selectedReview.paper,
        reviewer: selectedReview.reviewer,
        responses: formatResponses(),
        recommendation: selectedReview.recommendation,
        comments: selectedReview.comments,
        isDraft: true,
      });

      showSnackbar?.({ message: "Návrh recenzie bol uložený.", color: "success" });
      reviewDialog.value = false;
    };

    const sendReview = async (review: Review) => {
      //console.log("Sending review:", review);

      if (!review._id) {
        showSnackbar?.({ message: "Chyba: Recenzia nemá ID!", color: "error" });
        return;
      }

      if (isReviewDeadlinePassed(review)) {
        showSnackbar?.({ message: "Termín na odoslanie recenzie už vypršal!", color: "error" });
        return;
      }

      try {
        // If sending from edit dialog, update the review first
        if (reviewDialog.value) {
          // Format responses for submission
          const formattedResponses = formatResponses();

          // Update the review with current values
          await reviewStore.updateReview(review._id, {
            paper: review.paper,
            reviewer: review.reviewer,
            responses: formattedResponses,
            recommendation: review.recommendation,
            comments: review.comments,
            isDraft: true, // Still a draft until sent
          });
        }

        // Now send the review
        await reviewStore.sendReview(review._id);
        showSnackbar?.({ message: "Recenzia bola odoslaná.", color: "success" });

        // Close dialog if open
        if (reviewDialog.value) {
          reviewDialog.value = false;
        }

        // Refresh reviews
        await reviewStore.fetchAllReviews();
      } catch (error) {
        console.error("Error sending review:", error);
        showSnackbar?.({ message: "Nepodarilo sa odoslať recenziu", color: "error" });
      }
    };

    //Delete review
    const isDeleteDialogOpen = ref(false);
    const reviewToDelete = ref<Review | null>(null);

    const confirmDeleteReview = (review: Review) => {
      reviewToDelete.value = review;
      isDeleteDialogOpen.value = true;
    };

    const closeDeleteDialog = () => {
      isDeleteDialogOpen.value = false;
      reviewToDelete.value = null;
    };

    const deleteReview = async () => {
      if (!reviewToDelete.value || !reviewToDelete.value._id) {
        console.error("Review ID is missing!");
        return;
      }

      try {
        await reviewStore.deleteReview(reviewToDelete.value._id);
        showSnackbar?.({
          message: "Recenzia bola úspešne odstránená.",
          color: "success",
        });

        await reviewStore.fetchAllReviews(); // Refresh the list
      } catch (error) {
        console.error("Error deleting review:", error);
        showSnackbar?.({
          message: "Nepodarilo sa odstrániť recenziu.",
          color: "error",
        });
      } finally {
        closeDeleteDialog();
      }
    };

    const formatDate = (date: Date | string) =>
      format(new Date(date), 'dd.MM.yyyy')

    onMounted(async () => {
      await reviewStore.fetchAllReviews();
      await questionStore.fetchReviewerQuestions();
    });

    return {
      papers,
      recommendations,
      questions,
      headers,
      submittedReviews,
      viewReviewDialog,
      selectedReview,
      filters,
      filteredReviews,
      reviewDialog,
      confirmationDialog,
      reviewResponses,
      ratingQuestions,
      yesNoQuestions,
      textQuestions,
      isDeleteDialogOpen,
      reviewToDelete,
      isViewMode,
      isReviewDeadlinePassed,
      canEditReview,
      closeDeleteDialog,
      deleteReview,
      editReview,
      saveDraft,
      sendReview,
      confirmDeleteReview,
      resetFilters,
      formatDate,
      formatResponses,
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
        :items="submittedReviews"
        :items-per-page="10"
        :pageText="'{0}-{1} z {2}'"
        items-per-page-text="Recenzie na stránku"
        dense
        class="custom-table">
        <template v-slot:body="{ items }">
          <tr v-for="review in items" :key="review._id">
            <td>
              <v-icon
                size="30"
                color="primary"
                @click="viewReview(review)"
                style="cursor: pointer"
                title="Zobraziť podrobnosti"
              >
                mdi-eye
              </v-icon>
            </td>
            <td>
              <v-chip
                :color="
                  review.recommendation === 'Publikovať'? 'green'
                  : review.recommendation === 'Publikovať so zmenami'? 'E7B500'
                  : review.recommendation === 'Odmietnuť'? 'red': 'grey'"
                outlined
                small
                class="d-flex justify-center custom-chip rounded"
              >
                {{ review.recommendation }}
              </v-chip>
            </td>
            <td>
              {{ review.paper.conference?.year ?? '—' }} -
              {{ review.paper.conference?.date ? formatDate(review.paper.conference.date) : '—' }}
            </td>
            <td>{{ formatDate(review.created_at) }}</td>
            <td>{{ review.paper.title }}</td>
            <td class="d-flex justify-end align-center">
              <!-- :disabled="!review.isDraft" -->
              <v-btn
                color="#FFCD16"
                @click="editReview(review)"
                :disabled="!canEditReview(review)">
                <v-icon size="24">mdi-pencil</v-icon>
              </v-btn>
              <!-- :disabled="!review.isDraft" -->
              <v-btn
                color="primary"
                @click="sendReview(review)"
                :disabled="!canEditReview(review)">
                <v-icon size="24">mdi-send</v-icon>
              </v-btn>
              <!-- :disabled="!review.isDraft" -->
              <v-btn
                color="#BC463A"
                @click="confirmDeleteReview(review)"
                :disabled="!canEditReview(review)">
                <v-icon size="24" color="white">mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

  <!-- View/Edit Review Dialog -->
  <v-dialog v-model="reviewDialog" max-width="1200px">
    <v-card>
      <v-card-title>{{ isViewMode ? 'Zobraziť recenziu' : 'Upraviť recenziu' }}</v-card-title>
      <v-card-text>
        <!-- Rating Questions -->
        <v-row v-for="question in ratingQuestions" :key="question._id" align="center">
          <v-col cols="8"><p>{{ question.text }}</p></v-col>
          <v-col cols="4">
            <v-select
              v-model="reviewResponses[question._id]"
              :items="[
                { text: 'A', value: 6 },
                { text: 'B', value: 5 },
                { text: 'C', value: 4 },
                { text: 'D', value: 3 },
                { text: 'E', value: 2 },
                { text: 'Fx', value: 1 }
              ]"
              item-title="text"
              item-value="value"
              dense
              outlined
              placeholder="Vyberte hodnotenie"
              :disabled="isViewMode"
            />
          </v-col>
        </v-row>

        <!-- Yes/No Questions -->
        <v-row v-for="question in yesNoQuestions" :key="question._id" align="center">
          <v-col cols="8"><p>{{ question.text }}</p></v-col>
          <v-col cols="4">
            <v-radio-group v-model="reviewResponses[question._id]" row
                           :disabled="isViewMode">
              <v-radio label="Áno" value="yes"></v-radio>
              <v-radio label="Nie" value="no"></v-radio>
            </v-radio-group>
          </v-col>
        </v-row>

        <!-- Text Questions -->
        <v-row v-for="question in textQuestions" :key="question._id" align="center">
          <v-col cols="5"><p>{{ question.text }}</p></v-col>
          <v-col cols="7">
            <v-textarea
              v-model="reviewResponses[question._id]"
              placeholder="Vložte odpoveď"
              dense
              outlined
              :disabled="isViewMode"
            />
          </v-col>
        </v-row>

        <v-select
          v-model="selectedReview.recommendation"
          :items="['Publikovať', 'Publikovať so zmenami', 'Odmietnuť']"
          label="Odporúčanie"
          :disabled="isViewMode"/>
        <v-textarea
          v-model="selectedReview.comments"
          label="Komentáre"
          outlined
          dense
          :disabled="isViewMode"/>
      </v-card-text>
      <v-card-actions>
        <v-btn
          variant="outlined"
          color="#BC463A"
          @click="reviewDialog = false"
        >{{ isViewMode ? 'Zavrieť' : 'Zrušiť' }}</v-btn>
        <v-btn
          variant="outlined"
          v-if="!isViewMode"
          color="tertiary"
          @click="saveDraft">Uložiť</v-btn>
        <v-btn
          variant="outlined"
          v-if="!isViewMode"
          color="primary"
          @click="sendReview(selectedReview)">Odoslať</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="isDeleteDialogOpen" max-width="700px">
    <v-card>
      <v-card-title>Potvrdenie odstránenia</v-card-title>
      <v-card-text>
        <p>
          Ste si istí, že chcete odstrániť recenziu na prácu
          <strong>{{ reviewToDelete?.paper?.title }}</strong>?
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="outlined" color="primary" @click="closeDeleteDialog">Zrušiť</v-btn>
        <v-btn variant="outlined" color="#BC463A" @click="deleteReview">Odstrániť</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="scss">

</style>
