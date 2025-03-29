<script lang="ts">
import { computed, defineComponent, inject, onMounted, ref } from 'vue'
import { usePaperStore } from '@/stores/paperStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useQuestionStore } from '@/stores/questionStore'
import { useUserStore } from '@/stores/userStore'
import { format } from 'date-fns'
import type { ReviewerPaper } from '@/types/paper.ts'
import type { Review, ReviewResponse } from '@/types/review.ts'

export default defineComponent({
  name: 'AssignedPapersTable',
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

    const isReviewDeadlineActive = (paper: ReviewerPaper): boolean => {
      const deadline = new Date(paper.conference?.deadline_review || '');
      return new Date() <= deadline;
    };

    const paperStore = usePaperStore();
    const reviewStore = useReviewStore();
    const questionStore = useQuestionStore();
    const userStore = useUserStore();

    const mode = ref<'add' | 'edit'>('add');
    const isLoading = ref(false);

    const fetchDependencies = async () => {
      await Promise.all([
        questionStore.fetchReviewerQuestions(),
        paperStore.getAssignedPapers(),
        reviewStore.fetchAllReviews(),
        userStore.fetchUserProfile(),
      ]);
    };

    const papers = computed(() => {
      const submittedReviewPapers = new Set(reviewStore.reviewerReviews.map(review => review.paper));
      return paperStore.reviewerPapers.filter(paper =>
        !submittedReviewPapers.has(paper._id)
      );
    });

    const questions = computed(() => questionStore.reviewerQuestions);
    const reviews = computed(() => reviewStore.reviewerReviews);

    const reviewDialog = ref(false);
    const paperDetailsDialog = ref(false);
    const confirmationDialog = ref(false);

    const selectedPaper = ref<any>(null);
    const selectedReview = ref<any>(null);
    const reviewResponses = ref<Record<string, string | number | null>>({});
    const recommendation = ref<'Publikovať' | 'Publikovať so zmenami' | 'Odmietnuť'>('Publikovať');
    const comments = ref<string>('');

    const attemptedSubmission = ref(false);

    const headers = [
      { title: '', value: 'actions' },
      { title: 'Sekcia', key: 'category' },
      { title: 'Konferencia', key: 'conference' },
      { title: 'Názov', value: 'title' },
      { title: '', value: 'actions' },
    ];

    const grades = [
      { text: 'A', value: 6 },
      { text: 'B', value: 5 },
      { text: 'C', value: 4 },
      { text: 'D', value: 3 },
      { text: 'E', value: 2 },
      { text: 'Fx', value: 1 },
    ];

    //Categorize questions by type
    const ratingQuestions = computed(() =>
      questionStore.reviewerQuestions.filter((q) => q.type === 'rating')
    );
    const yesNoQuestions = computed(() =>
      questionStore.reviewerQuestions.filter((q) => q.type === 'yes_no')
    );
    const textQuestions = computed(() =>
      questionStore.reviewerQuestions.filter((q) => q.type === 'text')
    );

    const openReviewDialog = (paper: ReviewerPaper) => {
      selectedPaper.value = paper;
      reviewResponses.value = {};
      recommendation.value = 'Publikovať';
      comments.value = '';
      attemptedSubmission.value = false;

      const existingDraft = reviewStore.draftReviews.find(
        (r) =>
          (typeof r.paper === 'string' ? r.paper : r.paper?._id) === paper._id &&
          r.reviewer === userStore.userProfile._id
      );

      if (existingDraft) {
        mode.value = 'edit';
        selectedReview.value = existingDraft;
        recommendation.value = existingDraft.recommendation;
        comments.value = existingDraft.comments || '';

        for (const response of existingDraft.responses || []) {
          const qId =
            typeof response.question === 'object'
              ? response.question._id
              : response.question;
          reviewResponses.value[qId] = response.answer;
        }
      } else {
        mode.value = 'add';
        selectedReview.value = null;
      }

      reviewDialog.value = true;
    };

    const openPaperDetailsDialog = (paper: any) => {
      selectedPaper.value = paper;
      paperDetailsDialog.value = true;
    };

    const saveDraft = async () => {
      if (isLoading.value) return; // prevent double-clicks

      isLoading.value = true;
      try {
        if (!selectedPaper.value) return;

        if (!isReviewDeadlineActive(selectedPaper.value)) {
          showSnackbar?.({ message: 'Termín na recenzie už vypršal.', color: 'error' });
          return;
        }

        const hasAnswers = Object.values(reviewResponses.value).some(
          (val) => val !== null && val !== ''
        );

        if (!hasAnswers) {
          showSnackbar?.({ message: 'Vyplňte aspoň jednu odpoveď pred uložením.', color: 'error' });
          return;
        }

        const reviewData: Review = {
          created_at: new Date(),
          paper: selectedPaper.value._id,
          reviewer: userStore.userProfile._id,
          responses: formatResponses(),
          recommendation: recommendation.value,
          comments: comments.value,
          isDraft: true,
        };

        try {
          if (selectedReview.value && selectedReview.value._id) {
            await reviewStore.updateReview(selectedReview.value._id, reviewData);
          } else {
            // Always re-check for existing draft before creating
            const existingDraft = reviewStore.reviewerReviews.find(
              (r) => r.paper === selectedPaper.value._id && r.reviewer === userStore.userProfile._id && r.isDraft
            );
            if (existingDraft) {
              await reviewStore.updateReview(existingDraft._id as string, reviewData);
              selectedReview.value = existingDraft; // update local ref
            } else {
              selectedReview.value = await reviewStore.createReview(reviewData);
            }
          }

          showSnackbar?.({ message: "Návrh recenzie bol uložený.", color: "success" });
          await reviewStore.fetchAllReviews();
          await paperStore.getAssignedPapers();
          reviewDialog.value = false;

        } catch (err: any) {
          console.error("Error saving draft:", err);
          const msg = err?.response?.data?.message || 'Chyba pri ukladaní recenzie.';
          showSnackbar?.({ message: msg, color: 'error' });
        }
      }catch (err) {
        console.error(err);
      } finally {
        isLoading.value = false;
      }
    }

    const submitReviewConfirmation = () => {
      confirmationDialog.value = true;
    };

    const confirmSubmission = async () => {
        if (isLoading.value) return; // prevent double-clicks

        isLoading.value = true;
        try {
      attemptedSubmission.value = true;
      if (!selectedPaper.value) return;

      if (!isReviewDeadlineActive(selectedPaper.value)) {
        showSnackbar?.({ message: 'Termín na recenzie už vypršal.', color: 'error' });
        return;
      }

      try {
        let draftToSubmit = selectedReview.value;

        if (!draftToSubmit || !draftToSubmit._id) {
          const newReview = await reviewStore.createReview({
            created_at: new Date(),
            paper: selectedPaper.value._id,
            reviewer: userStore.userProfile._id,
            responses: formatResponses(),
            recommendation: recommendation.value,
            comments: comments.value,
            isDraft: true,
          });
          draftToSubmit = newReview;
          selectedReview.value = newReview;
        } else {
          await reviewStore.updateReview(draftToSubmit._id, {
            ...draftToSubmit,
            responses: formatResponses(),
            recommendation: recommendation.value,
            comments: comments.value,
            isDraft: true,
          });
        }

        await reviewStore.sendReview(draftToSubmit._id);
        showSnackbar?.({ message: "Recenzia bola odoslaná.", color: "success" });

        reviewDialog.value = false;
        confirmationDialog.value = false;
        await reviewStore.fetchAllReviews();
        await paperStore.getAssignedPapers();
      } catch (err: any) {
        console.error("Error submitting review:", err);
        const msg = err?.response?.data?.message || 'Chyba pri odoslaní recenzie.';
        showSnackbar?.({ message: msg, color: 'error' });
      }
        } catch (err) {
          console.error(err);
        } finally {
          isLoading.value = false;
        }
    };


    const downloadPaper = async (paper: ReviewerPaper) => {
      if (!paper.conference?._id) {
        console.error("Conference ID is missing for paper:", paper);
        return;
      }

      await paperStore.downloadPaperReviewer(paper.conference._id, paper._id);
    };

    const formatResponses = (): ReviewResponse[] => {
      return questions.value.map((question) => ({
        _id: question._id,
        question: question._id,
        answer: reviewResponses.value[question._id] ?? null,
      }));
    };

    const formatDate = (date: Date | string) =>
      format(new Date(date), 'dd.MM.yyyy')

    onMounted(() => {
      fetchDependencies();
    });

    return {
      papers,
      headers,
      grades,
      comments,
      questions,
      reviews,
      reviewDialog,
      paperDetailsDialog,
      confirmationDialog,
      selectedPaper,
      selectedReview,
      reviewResponses,
      recommendation,
      ratingQuestions,
      yesNoQuestions,
      textQuestions,
      attemptedSubmission,
      isLoading,
      mode,
      isReviewDeadlineActive,
      formatDate,
      openReviewDialog,
      openPaperDetailsDialog,
      saveDraft,
      submitReviewConfirmation,
      confirmSubmission,
      downloadPaper,
    };
  },
});
</script>

<template>
    <v-card>
      <v-card-title>
        <h2>Pridelené práce</h2>
      </v-card-title>
        <v-data-table
          :headers="headers"
          :items="papers"
          :items-per-page="10"
          :pageText="'{0}-{1} z {2}'"
          items-per-page-text="Práce na stránku"
          item-value="_id"
          density="comfortable"
          class="custom-table"
        >
          <template v-slot:body="{ items }">
            <tr v-for="paper in items" :key="paper._id" class="custom-row">
              <td>
                <v-icon
                  size="22"
                  color="primary"
                  @click="openPaperDetailsDialog(paper)"
                  style="cursor: pointer"
                  title="Zobraziť podrobnosti"
                >
                  mdi-eye
                </v-icon>
              </td>
              <td>{{ paper.category?.name }}</td>
              <td>{{ paper.conference?.year }} - {{ formatDate(paper.conference?.date) }}</td>
              <td>{{ paper.title }}</td>
              <td class="d-flex justify-end align-center">
                <v-btn
                  color="tertiary"
                  @click="downloadPaper(paper)"
                  title="Sťahnuť prácu"
                >
                  <v-icon size="20">mdi-download</v-icon>
                </v-btn>
                <v-btn
                  :disabled="!isReviewDeadlineActive(paper)"
                  color="primary"
                  @click="openReviewDialog(paper)"
                  title="Recenzovať prácu"
                >
                  <v-icon size="20">mdi-message-draw</v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
    </v-card>

    <!-- Review Dialog -->
    <v-dialog v-model="reviewDialog" width="900px">
      <v-card>
        <v-card-title class="wrap-title">
          {{ mode === 'edit' ? 'Pokračovať v recenzii' : 'Nová recenzia' }}: {{ selectedPaper.title }}
        </v-card-title>
        <v-card-text>
          <v-form ref="reviewForm">
            <v-container>
              <!-- Rating Questions -->
              <v-row
                v-for="question in ratingQuestions"
                :key="question._id"
                class="align-center py-1"
                no-gutters
                :class="{ 'missing-answer': attemptedSubmission && !reviewResponses[question._id] }"
              >
                <v-col cols="9" >
                  <p class="mb-0">{{ question.text }}</p>
                </v-col>

                <v-col cols="3">
                  <v-select
                    v-model="reviewResponses[question._id]"
                    :items="grades"
                    item-title="text"
                    outlined
                    placeholder="Hodnotenie"
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
                <v-col cols="9">
                  <p>{{ question.text }}</p>
                </v-col>
                <v-col cols="3">
                  <v-radio-group
                    v-model="reviewResponses[question._id]"
                    row
                    outlined
                    inline
                  >
                    <v-radio label="Áno" value="yes" class="pt-4"></v-radio>
                    <v-radio color="#116466" label="Nie" value="no" class="pt-4"></v-radio>
                  </v-radio-group>
                </v-col>
                <v-divider v-if="question !== yesNoQuestions[yesNoQuestions.length - 1]"></v-divider>
              </v-row>

              <div class="double-divider" v-if="ratingQuestions.length"></div>

              <!-- Text Questions -->
              <v-row
                :class="{ 'missing-answer': attemptedSubmission && !reviewResponses[question._id] }"
                v-for="question in textQuestions"
                :key="question._id" no-gutters>
                <v-col cols="5" class="pt-4">
                  <p>{{ question.text }}</p>
                </v-col>
                <v-col cols="7">
                  <v-textarea
                    v-model="reviewResponses[question._id]"
                    placeholder="Vložte odpoveď"
                    auto-grow
                    outlined
                    required
                    class="mt-3 pt-2 pb-0 mb-0"
                    :rows="2"
                  />
                </v-col>
                <v-divider v-if="question !== yesNoQuestions[yesNoQuestions.length - 1]"></v-divider>
              </v-row>

              <div class="double-divider" v-if="ratingQuestions.length"></div>

              <!-- Recommendation -->
              <v-row>
                <v-col cols="12">
                  <v-select
                    v-model="recommendation"
                    :items="['Publikovať', 'Publikovať so zmenami', 'Odmietnuť']"
                    label="Odporúčanie"
                    dense
                    outlined
                    required
                    class="large-text-field"
                  />
                </v-col>
              </v-row>

              <!-- Conditional Comments -->
              <v-row v-if="['Publikovať so zmenami', 'Odmietnuť'].includes(recommendation)">
                <v-col cols="12">
                  <label>Komentáre (voliteľné)</label>
                  <v-textarea
                    v-model="comments"
                    placeholder="Pridajte komentáre, aby ste odôvodnili svoje odporúčanie"
                    outlined
                    dense
                  />
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn
            variant="outlined"
            color="#BC463A"
            @click="reviewDialog = false">Zrušiť</v-btn>
          <v-btn
            variant="outlined"
            color="tertiary"
            :loading="isLoading"
            @click="saveDraft"
            :disabled="!isReviewDeadlineActive || selectedReview?.isDraft === false">Uložiť</v-btn>
          <v-btn
            variant="outlined"
            color="primary"
            :loading="isLoading"
            @click="submitReviewConfirmation"
            :disabled="!isReviewDeadlineActive || selectedReview?.isDraft === false">Odoslať</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Paper Details Dialog -->
    <v-dialog v-model="paperDetailsDialog" max-width="800px">
      <v-card>
        <v-card-title>Detaily práce</v-card-title>
        <v-card-text>
          <v-table dense>
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
          <v-btn
            color="primary"
            @click="downloadPaper(selectedPaper)">
            <v-icon size="36">mdi-download-box</v-icon>
            Stiahnuť
          </v-btn>
          <v-btn color="tertiary" @click="paperDetailsDialog = false"
          >Zrušiť</v-btn
          >
        </v-card-actions>

      </v-card>
    </v-dialog>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmationDialog" max-width="500px">
      <v-card>
        <v-card-title>Potvrdiť odoslanie</v-card-title>
        <v-card-text>
          Naozaj chcete odoslať túto recenziu? Po odoslaní ju nie je možné opravovať.
        </v-card-text>
        <v-card-actions>
          <v-btn color="#bc4639" @click="confirmationDialog = false" variant="outlined">Zrušiť</v-btn>
          <v-btn color="primary" @click="confirmSubmission" variant="outlined" :loading="isLoading">Odoslať</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<style lang="scss">

.v-divider {
  color: #116466;
}
.double-divider {
  border-top: 2px solid #116466;
  margin: 16px 0;
}

.questions {
  font-size: 0.9rem;
  color: #2c3531;
}

.wrap-title {
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.missing-answer {
  background-color: #ffe6e6; // light red background
  border-left: 4px solid #bc4639; // red border
}

</style>
