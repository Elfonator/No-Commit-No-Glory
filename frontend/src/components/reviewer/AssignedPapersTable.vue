<script lang="ts">
import { defineComponent, ref, computed, onMounted, inject } from 'vue'
import { usePaperStore } from '@/stores/paperStore';
import { useReviewStore } from '@/stores/reviewStore';
import { useQuestionStore } from '@/stores/questionStore';
import { useUserStore } from '@/stores/userStore';
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

    const paperStore = usePaperStore();
    const reviewStore = useReviewStore();
    const questionStore = useQuestionStore();
    const userStore = useUserStore();

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
      const draftReviewPapers = new Set(reviewStore.draftReviews.map(draft => draft.paper));
      return paperStore.reviewerPapers.filter(paper =>
        !submittedReviewPapers.has(paper._id) && !draftReviewPapers.has(paper._id)
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
    const recommendation = ref<'Publikovať' | 'Publikovať_so_zmenami' | 'Odmietnuť'>('Publikovať');
    const comments = ref<string>('');

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
      reviewDialog.value = true;
    };

    const openPaperDetailsDialog = (paper: any) => {
      selectedPaper.value = paper;
      paperDetailsDialog.value = true;
    };

    const saveDraft = async () => {
      if (!selectedPaper.value) return;

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
        if (selectedReview.value) {
          await reviewStore.updateReview(selectedReview.value._id, reviewData);
          showSnackbar?.({ message: "Návrh recenzie bol aktualizovaný.", color: "success" });
        } else {
          await reviewStore.createReview(reviewData);
          showSnackbar?.({ message: "Návrh recenzie bol uložený.", color: "success" });
        }

        await reviewStore.fetchAllReviews();
        await paperStore.getAssignedPapers();
      } catch (error) {
        console.error("Error saving review:", error);
        showSnackbar?.({ message: "Chyba pri ukladaní recenzie.", color: "error" });
      }

      reviewDialog.value = false;
    };

    const submitReviewConfirmation = () => {
      confirmationDialog.value = true;
    };

    const confirmSubmission = async () => {
      if (!selectedPaper.value) return;

      try {
        // Create the review data
        const reviewData: Review = {
          created_at: new Date(),
          paper: selectedPaper.value._id,
          reviewer: userStore.userProfile._id,
          responses: formatResponses(),
          recommendation: recommendation.value,
          comments: comments.value,
          isDraft: true,
        };

        // Create the review
        const newReview = await reviewStore.createReview(reviewData);

        // Now send the review using the same method as ReviewTable
        if (newReview && newReview._id) {
          await reviewStore.sendReview(newReview._id);
        }

        showSnackbar?.({ message: "Recenzia bola odoslaná.", color: "success" });
        reviewDialog.value = false;
        confirmationDialog.value = false;

        // Refresh the data
        await reviewStore.fetchAllReviews();
        await paperStore.getAssignedPapers();
      } catch (error) {
        console.error("Error submitting review:", error);
        showSnackbar?.({ message: "Chyba pri odosielaní recenzie.", color: "error" });
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
          dense
          class="custom-table"
        >
          <template v-slot:body="{ items }">
            <tr v-for="paper in items" :key="paper._id" class="custom-row">
              <td>
                <v-icon
                  size="30"
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
                  <v-icon size="25">mdi-download</v-icon>
                </v-btn>
                <v-btn
                  :disabled="paper.hasSubmittedReview"
                  color="primary"
                  @click="openReviewDialog(paper)"
                  title="Recenzovať prácu"
                >
                  <v-icon size="25">mdi-message-draw</v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
    </v-card>

    <!-- Review Dialog -->
    <v-dialog v-model="reviewDialog" max-width="1200px">
      <v-card>
        <v-card-title class="wrap-title">Nová recenzia: {{ selectedPaper.title }}</v-card-title>
        <v-card-text>
          <v-form ref="reviewForm">
            <v-container>
              <!-- Rating Questions -->
              <v-row v-for="question in ratingQuestions" :key="question._id" align="center">
                <v-col cols="8" class="questions">
                  <p>{{ question.text }}</p>
                </v-col>
                <v-col cols="4">
                  <v-select
                    v-model="reviewResponses[question._id]"
                    :items="grades"
                    item-title="text"
                    dense
                    outlined
                    required
                    placeholder="Vyberte hodnotenie"
                    class="large-text-field"
                  />
                </v-col>
                <v-divider v-if="question !== ratingQuestions[ratingQuestions.length - 1]"></v-divider>
              </v-row>

              <div class="double-divider" v-if="ratingQuestions.length"></div>

              <!-- Yes/No Questions -->
              <v-row v-for="question in yesNoQuestions" :key="question._id" align="center">
                <v-col cols="8">
                  <p>{{ question.text }}</p>
                </v-col>
                <v-col cols="4">
                  <v-radio-group
                    v-model="reviewResponses[question._id]"
                    row
                    dense
                    outlined
                    required
                  >
                    <v-radio label="Áno" value="yes"></v-radio>
                    <v-radio color="#116466" label="Nie" value="no"></v-radio>
                  </v-radio-group>
                </v-col>
                <v-divider v-if="question !== yesNoQuestions[yesNoQuestions.length - 1]"></v-divider>
              </v-row>

              <div class="double-divider" v-if="ratingQuestions.length"></div>

              <!-- Text Questions -->
              <v-row v-for="question in textQuestions" :key="question._id" align="center">
                <v-col cols="5">
                  <p>{{ question.text }}</p>
                </v-col>
                <v-col cols="7">
                  <v-textarea
                    v-model="reviewResponses[question._id]"
                    placeholder="Vložte odpoveď"
                    dense
                    outlined
                    required
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
                    :items="['Publikovať', 'Publikovať_so_zmenami', 'Odmietnuť']"
                    label="Odporúčanie"
                    dense
                    outlined
                    required
                    class="large-text-field"
                  />
                </v-col>
              </v-row>

              <!-- Conditional Comments -->
              <v-row v-if="['Publikovať_so_zmenami', 'Odmietnuť'].includes(recommendation)">
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
          <v-btn color="secondary" @click="reviewDialog = false">Zrušiť</v-btn>
          <v-btn color="primary" @click="saveDraft">Uložiť</v-btn>
          <v-btn color="error" @click="submitReviewConfirmation">Odoslať</v-btn>
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
          Naozaj chcete odoslať túto recenziu? Po odoslaní ho nie je možné upravovať.
        </v-card-text>
        <v-card-actions>
          <v-btn color="red" @click="confirmationDialog = false">Zrušiť</v-btn>
          <v-btn color="green" @click="confirmSubmission">Odoslať</v-btn>
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
  font-size: 1.1rem;
  color: #2c3531;
}

.wrap-title {
  white-space: normal; /* Allow the text to wrap */
  word-wrap: break-word; /* Break words if necessary */
  overflow-wrap: break-word; /* For consistent behavior across browsers */
}

</style>
