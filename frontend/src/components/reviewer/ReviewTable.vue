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
        return false;
      }
      const deadline = new Date(review.paper.conference.deadline_review);
      return new Date() > deadline;
    };

    const canEditReview = (review: Review): boolean => {
      //return review.isDraft && !isReviewDeadlinePassed(review);
      return !isReviewDeadlinePassed(review);
    };

    const reviewStore = useReviewStore();
    const paperStore = usePaperStore();
    const questionStore = useQuestionStore();

    const viewReviewDialog = ref(false);
    const reviewDialog = ref(false);
    const confirmationDialog = ref(false);
    const attemptedSubmission = ref(false);
    const recommendation = ref<'Publikovať' | 'Publikovať so zmenami' | 'Odmietnuť'>('Publikovať');
    const isLoading = ref(false);
    const comments = ref<string>('');

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
      { title: 'Odporúčanie', key: 'recommendation', width: '30px' },
      { title: 'ŠVK', key: 'conference'},
      { title: 'Dátum', key: 'created_at' },
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

    const grades = [
      { text: 'A', value: 6 },
      { text: 'B', value: 5 },
      { text: 'C', value: 4 },
      { text: 'D', value: 3 },
      { text: 'E', value: 2 },
      { text: 'Fx', value: 1 },
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

    const paperDetailsDialog = ref(false);
    const selectedPaper = ref<any>(null);

    const openPaperDetailsDialog = (paper: any) => {
      selectedPaper.value = paper;
      paperDetailsDialog.value = true;
    };

    // Helper function to get question ID
    const getQuestionId = (question: Question | string): string =>
      typeof question === 'object' ? question._id : question;

    // Edit an existing review
    const editReview = (review: Review) => {
        if (isLoading.value) return; // prevent double-clicks

        isLoading.value = true;
        try {
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
        }catch (err) {
          console.error(err);
        } finally {
          isLoading.value = false;
        }
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
      if (isLoading.value) return; // prevent double-clicks

      isLoading.value = true;
      try {
      attemptedSubmission.value = true;
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
    }catch (err) {
      console.error(err);
    } finally {
      isLoading.value = false;
    }
    };

    const sendReview = async (review: Review) => {
        if (isLoading.value) return;

        isLoading.value = true;
        try {
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
        }catch (err) {
          console.error(err);
        } finally {
          isLoading.value = false;
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
      recommendation,
      grades,
      questions,
      headers,
      comments,
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
      attemptedSubmission,
      isLoading,
      selectedPaper,
      paperDetailsDialog,
      paperStore,
      openPaperDetailsDialog,
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
      <v-card-subtitle class="filters-section">
        <v-row no-gutters>
          <v-col cols="4" md="3">
            <v-select
              v-model="filters.recommendation"
              :items="recommendations"
              label="Odporúčanie"
              item-value="value"
              item-title="text"
              outlined
              density="compact"
              clearable
            />
          </v-col>
          <v-col cols="4" md="4">
            <v-text-field
              v-model="filters.title"
              label="Názov práce"
              outlined
              density="compact"
              clearable
            />
          </v-col>
          <v-col cols="3" md="2">
            <v-text-field
              v-model="filters.conferenceYear"
              label="Rok"
              outlined
              density="compact"
              clearable
            />
          </v-col>
          <v-col cols="3" md="2">
            <v-btn
              class="filter-btn"
              color="primary"
              @click="resetFilters"
              title="Zrušiť filter"
              variant="outlined">
              <v-icon>mdi-filter-remove</v-icon>
            </v-btn>
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
        density="comfortable"
        class="custom-table">
        <template v-slot:body="{ items }">
          <tr v-for="review in items" :key="review._id">
            <td>
              <v-icon
                size="22"
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
            <td class="truncate-cell">{{ review.paper.title }}</td>
            <td class="d-flex justify-end align-center">
              <v-btn
                color="#FFCD16"
                @click="editReview(review)"
                :disabled="!canEditReview(review)">
                <v-icon size="20">mdi-pencil</v-icon>
              </v-btn>
              <v-btn
                color="primary"
                @click="sendReview(review)"
                :disabled="!canEditReview(review)">
                <v-icon size="20">mdi-send</v-icon>
              </v-btn>
              <v-btn
                color="#BC463A"
                @click="confirmDeleteReview(review)"
                :disabled="!review.isDraft">
                <v-icon size="20" color="white">mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

  <!-- View/Edit Review Dialog -->
  <v-dialog v-model="reviewDialog" max-width="900px">
    <v-card>
      <v-card-title>{{ isViewMode ? 'Zobraziť recenziu' : 'Upraviť recenziu' }}</v-card-title>
      <v-card-text>
        <v-btn
          v-if="isViewMode"
          color="primary"
          @click="openPaperDetailsDialog(selectedReview.paper)"
          variant="elevated"
        >
          <v-icon size="20">mdi-file-eye</v-icon>
          Detaily práce
        </v-btn>
        <!-- Rating Questions -->
        <v-row
          v-for="question in ratingQuestions"
          :key="question._id"
          class="align-center py-1"
          no-gutters
          :class="{ 'missing-answer': attemptedSubmission && !reviewResponses[question._id] }"
        >
          <v-col cols="9">
            <p class="mb-0">{{ question.text }}</p></v-col>
          <v-col cols="3">
            <v-select
              v-model="reviewResponses[question._id]"
              :items="grades"
              item-title="text"
              item-value="value"
              outlined
              placeholder="Hodnotenie"
              :disabled="isViewMode"
              class="mt-0 pt-2 pb-0 mb-0"
              hide-details
              clearable
            />
          </v-col>
          <v-divider
            v-if="question !== ratingQuestions[ratingQuestions.length - 1]"
            class="mt-1"
          />
        </v-row>

        <div class="double-divider" v-if="ratingQuestions.length"></div>

        <!-- Yes/No Questions -->
        <v-row
          :class="{ 'missing-answer': attemptedSubmission && !reviewResponses[question._id] }"
          v-for="question in yesNoQuestions"
          :key="question._id"
          align="center"
          no-gutters>
          <v-col cols="9"><p>{{ question.text }}</p></v-col>
          <v-col cols="3">
            <v-radio-group v-model="reviewResponses[question._id]"
                           row
                           outlined
                           inline
                           :disabled="isViewMode">
              <v-radio label="Áno" value="yes" class="pt-4"></v-radio>
              <v-radio label="Nie" value="no" class="pt-4"></v-radio>
            </v-radio-group>
          </v-col>
          <v-divider v-if="question !== yesNoQuestions[yesNoQuestions.length - 1]"></v-divider>
        </v-row>

        <div class="double-divider" v-if="ratingQuestions.length"></div>

        <!-- Text Questions -->
        <v-row :class="{ 'missing-answer': attemptedSubmission && !reviewResponses[question._id] }"
               v-for="question in textQuestions"
               :key="question._id"
               class="pt-4"
               align="start">
          <v-col cols="5" class="pt-4"><p>{{ question.text }}</p></v-col>
          <v-col cols="7">
            <v-textarea
              v-model="reviewResponses[question._id]"
              placeholder="Vložte odpoveď"
              outlined
              class="resizable-textarea mt-2"
              :rows="5"
            />
          </v-col>
          <v-divider v-if="question !== yesNoQuestions[yesNoQuestions.length - 1]"></v-divider>
        </v-row>

        <div class="double-divider" v-if="ratingQuestions.length"></div>

        <v-row>
          <v-col cols="12">
        <v-select
          v-model="selectedReview.recommendation"
          :items="['Publikovať', 'Publikovať so zmenami', 'Odmietnuť']"
          label="Odporúčanie"
          dense
          outlined
          class="large-text-field"
          :disabled="isViewMode"/>
        </v-col>
        </v-row>
        <!-- Conditional Comments -->
        <v-row v-if="['Publikovať so zmenami', 'Odmietnuť'].includes(selectedReview.recommendation)">
          <v-col cols="12">
            <v-textarea
              v-model="selectedReview.comments"
              placeholder="Pridajte komentáre, aby ste odôvodnili svoje odporúčanie"
              outlined
              class="resizable-textarea mt-2"
              :disabled="isViewMode"
            />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-btn
          variant="tonal"
          color="#BC463A"
          :loading="isLoading"
          @click="reviewDialog = false"
        >{{ isViewMode ? 'Zavrieť' : 'Zrušiť' }}</v-btn>
        <v-btn
          variant="tonal"
          v-if="!isViewMode"
          color="primary-shadow"
          @click="saveDraft">Uložiť</v-btn>
        <v-btn
          variant="tonal"
          v-if="!isViewMode"
          color="primary"
          :loading="isLoading"
          @click="sendReview(selectedReview)">Odoslať</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Show paper details-->
  <v-dialog v-model="paperDetailsDialog" max-width="800px">
    <v-card>
      <v-card-title>Detaily práce</v-card-title>
      <v-card-text>
        <v-table>
          <tbody>
          <tr>
            <td><strong>Názov:</strong></td>
            <td>{{ selectedPaper?.title }}</td>
          </tr>
          <tr>
            <td><strong>Konferencia:</strong></td>
            <td>
              {{ selectedPaper?.conference?.year }} -
              {{ formatDate(selectedPaper?.conference?.date) }}
            </td>
          </tr>
          <tr>
            <td><strong>Sekcia:</strong></td>
            <td>{{ selectedPaper?.category?.name }}</td>
          </tr>
          <tr>
            <td><strong>Kľúčové slová:</strong></td>
            <td>{{ selectedPaper?.keywords?.join(', ') }}</td>
          </tr>
          <tr>
            <td><strong>Abstrakt:</strong></td>
            <td><em>{{ selectedPaper?.abstract }}</em></td>
          </tr>
          </tbody>
        </v-table>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="outlined" color="#BC463A" @click="paperDetailsDialog = false">
          Zavrieť
        </v-btn>
        <v-btn
          variant="outlined"
          color="primary"
          @click="paperStore.downloadPaperReviewer(selectedPaper?.conference?._id, selectedPaper?._id)"
        >
          <v-icon size="22">mdi-download-box</v-icon>
          Stiahnuť
        </v-btn>
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

<style lang="scss" scoped>
.truncate-cell {
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.v-divider {
  color: #116466;
}
.double-divider {
  border-top: 2px solid #116466;
  margin: 16px 0;
}

.questions {
  font-size: 0.8rem;
  color: #2c3531;
}

.wrap-title {
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.missing-answer {
  background-color: #ffe6e6;
  border-left: 4px solid #bc4639;
}

:deep(.resizable-textarea) {
  .v-field__field {
    height: auto !important;
  }

  textarea {
    min-height: 100px;
    max-height: 400px;
  }
}

</style>
