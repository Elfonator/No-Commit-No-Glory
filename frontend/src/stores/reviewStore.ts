import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import axiosInstance from '@/config/axiosConfig'
import type { Review } from '@/types/review.ts'

export const useReviewStore = defineStore('reviews', () => {
  //Reactive state
  const reviewerReviews = ref<Review[]>([]); // Reviews submitted by the reviewer
  const selectedReview = ref<any>(null);
  const participantReviews = ref<Array<any>>([]) // Reviews visible to participants
  const loading = ref(false)
  const error = ref<string | null>(null)

  //Actions
  //Save and submit a new review
  const submitReview = async (review: Review) => {
    try {
      const response = await axiosInstance.post('/auth/reviewer/reviews', review);
      const updatedReview: Review = response.data.review;

      //Update the local state
      const existingIndex = reviewerReviews.value.findIndex(
        (r) => r._id === updatedReview._id
      );

      if (existingIndex !== -1) {
        //Replace the existing review
        reviewerReviews.value.splice(existingIndex, 1, updatedReview);
      } else {
        //Add the new review
        reviewerReviews.value.push(updatedReview);
      }

      await fetchAllReviews();

      return updatedReview;
    } catch (err) {
      console.error('Failed to submit review:', err);
      throw err;
    }
  };

  const appendReviewToPaper = async (paperId: string, reviewId: string) => {
    try {
      const response = await axiosInstance.patch(`auth/reviewer/papers/${paperId}`, {
        reviewId,
      });
      return response.data;
    } catch (err) {
      console.error('Failed to append review to paper:', err);
      throw err;
    }
  };

  const fetchAllReviews = async () => {
    try {
      const response = await axiosInstance.get('/auth/reviewer/reviews');
      reviewerReviews.value = response.data;
      return response.data;
    } catch (err) {
      console.error('Failed to fetch all reviews by reviewer:', err);
      throw err;
    }
  };

  //Fetch a specific review by ID
  const fetchReview = async (reviewId: string) => {
    try {
      const response = await axiosInstance.get(`/auth/reviewer/reviews/${reviewId}`);
      selectedReview.value = response.data;
      return response.data;
    } catch (err) {
      console.error(`Failed to fetch review with ID: ${reviewId}`, err);
      throw err;
    }
  };

  const draftReviews = computed(() =>
    reviewerReviews.value.filter((review) => review.isDraft)
  );

  const submittedReviews = computed(() =>
    reviewerReviews.value.filter((review) => !review.isDraft)
  );

  // Participant: Fetch reviews for participant papers
  const getParticipantReviews = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await axiosInstance.get('/auth/participant/papers')
      participantReviews.value = response.data // Papers with populated reviews
    } catch (err) {
      error.value = 'Failed to fetch reviews for participant papers.'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  return {
    //State
    reviewerReviews,
    participantReviews,
    selectedReview,
    loading,
    error,

    //Actions
    submitReview,
    fetchReview,
    appendReviewToPaper,
    fetchAllReviews,
    getParticipantReviews,

    //Computed
    draftReviews,
    submittedReviews,
  }
})
