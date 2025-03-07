<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import { usePaperStore } from '@/stores/paperStore';
import { useReviewStore } from '@/stores/reviewStore';
import { useQuestionStore } from '@/stores/questionStore';
import { useUserStore } from '@/stores/userStore';
import { format } from 'date-fns'
import type { ReviewerPaper } from '@/types/paper.ts'

export default defineComponent({
  name: 'AssignedPapersTable',
  setup() {
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

    const papers = computed(() => paperStore.reviewerPapers);
    const questions = computed(() => questionStore.reviewerQuestions);
    const reviews = computed(() => reviewStore.reviewerReviews);

    const reviewDialog = ref(false);
    const paperDetailsDialog = ref(false);
    const confirmationDialog = ref(false);

    const selectedPaper = ref<any>(null);
    const reviewResponses = ref<Record<string, string | number | null>>({});
    const recommendation = ref<'Publikovať' | 'Publikovať_so_zmenami' | 'Odmietnuť'>('Publikovať');
    const comments = ref<string>('');

    const headers = [
      { title: '', value: 'actions' },
      { title: 'Konferencia', value: 'conference' },
      { title: 'Názov', value: 'title' },
      { title: 'Sekcia', value: 'category' },
      { title: '', value: 'download' },
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
      // Set selected paper
      selectedPaper.value = paper;

      //Check if draft review exists for this paper
      const draftReview = reviewStore.draftReviews.find(
        (review) => review.paper === paper._id
      );
      console.log('draft -> ',draftReview);

      if (draftReview) {
        reviewResponses.value = draftReview.responses.reduce((acc: any, response: any) => {
          acc[response.question] = response.answer;
          return acc;
        }, {});

        recommendation.value = draftReview.recommendation || 'Publikovať';
        comments.value = draftReview.comments;
      } else {
        // No draft exists, initialize an empty form
        reviewResponses.value = {};
        recommendation.value = 'Publikovať';
        comments.value = '';
      }

      reviewDialog.value = true;
    };

    const openPaperDetailsDialog = (paper: any) => {
      selectedPaper.value = paper;
      paperDetailsDialog.value = true;
    };

    const saveDraft = async () => {
      if (!selectedPaper.value) return;

      await reviewStore.submitReview({
        created_at: new Date(),
        paper: selectedPaper.value._id,
        reviewer: userStore.userProfile._id,
        responses: formatResponses(),
        recommendation: recommendation.value,
        comments: comments.value,
        isDraft: true
      });

      reviewDialog.value = false;
    };

    const submitReviewConfirmation = () => {
      confirmationDialog.value = true;
    };

    const confirmSubmission = async () => {
      confirmationDialog.value = false;

      await reviewStore.submitReview({
        created_at: new Date(),
        paper: selectedPaper.value._id,
        reviewer: userStore.userProfile._id,
        responses: formatResponses(),
        recommendation: recommendation.value,
        comments: comments.value,
        isDraft: false
      });

      reviewDialog.value = false;
    };

    const downloadPaper = async (paperId: string) => {
      await paperStore.downloadPaperForReview(paperId);
    };

    const formatResponses = () => {
      return questions.value.map((question: any) => ({
        question: question._id,
        answer: reviewResponses.value[question._id],
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
      <v-card-text>
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
                  size="24"
                  color="primary"
                  @click="openPaperDetailsDialog(paper)"
                  style="cursor: pointer"
                  title="View details"
                >
                  mdi-eye
                </v-icon>
              </td>
              <td>{{ paper.conference?.year }} - {{ formatDate(paper.conference?.date) }}</td>
              <td>{{ paper.title }}</td>
              <td>{{ paper.category?.name }}</td>
              <td class="d-flex justify-end align-center">
                <v-btn
                  color="tertiary"
                  @click="downloadPaper(paper._id)"
                  title="Sťahnuť prácu"
                >
                  <v-icon size="26">mdi-download</v-icon>
                </v-btn>
                <v-btn
                  :disabled="paper.hasSubmittedReview"
                  color="primary"
                  @click="openReviewDialog(paper)"
                  title="Recenzovať prácu"
                >
                  <v-icon size="30">mdi-message-draw</v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Review Dialog -->
    <v-dialog v-model="reviewDialog" max-width="1200px">
      <v-card>
        <v-card-title class="wrap-title">Nová recenzia: {{ selectedPaper.title }}</v-card-title>
        <v-card-text>
          <v-form ref="reviewForm" @submit.prevent="submitReviewConfirmation">
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
              <td><strong>Autory:</strong></td>
              <td>
                <span v-for="(author, index) in selectedPaper?.authors" :key="index">
                  {{ author.firstName }} {{ author.lastName }}<span v-if="index < selectedPaper.authors.length - 1">, </span>
                </span>
              </td>
            </tr>
            <tr>
              <td><strong>Abstrakt:</strong></td>
              <td><em>{{ selectedPaper?.abstract }}</em></td>
            </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="downloadPaper(selectedPaper?._id)">
            Stiahnuť
          </v-btn>
          <v-btn color="secondary" @click="paperDetailsDialog = false">Zrušiť</v-btn>
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
