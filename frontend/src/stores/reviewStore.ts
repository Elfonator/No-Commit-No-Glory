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
  const createReview = async (review: Review) => {
    try {
      const response = await axiosInstance.post('/auth/reviewer/reviews', review);
      const newReview: Review = response.data.review;
      reviewerReviews.value.push(newReview);
      return newReview;
    } catch (err) {
      console.error('Failed to create review:', err);
      throw err;
    }
  };

  //Update an existing review
  const updateReview = async (reviewId: string, updatedData: Partial<Review>) => {
    try {
      const response = await axiosInstance.patch(`/auth/reviewer/reviews/${reviewId}`, updatedData)
      const updatedReview: Review = response.data.review

      const index = reviewerReviews.value.findIndex(r => r._id === reviewId)
      if (index !== -1) {
        reviewerReviews.value[index] = updatedReview
      }

      return updatedReview
    } catch (err) {
      console.error('Failed to update review:', err);
      throw err;
    }
  };

  //Submit a review
  const sendReview = async (reviewId: string) => {
    try {
      const response = await axiosInstance.patch(`/auth/reviewer/reviews/${reviewId}/send`, { isDraft: false });
      const updatedReview: Review = response.data.review;

      // Update local state
      const index = reviewerReviews.value.findIndex(r => r._id === reviewId);
      if (index !== -1) reviewerReviews.value.splice(index, 1, updatedReview);

      return updatedReview;
    } catch (err) {
      console.error('Failed to submit review:', err);
      throw err;
    }
  };

  // Delete a review
  const deleteReview = async (reviewId: string) => {
    try {
      await axiosInstance.delete(`/auth/reviewer/reviews/${reviewId}`);
      reviewerReviews.value = reviewerReviews.value.filter(r => r._id !== reviewId);
    } catch (err) {
      console.error('Failed to delete review:', err);
      throw err;
    }
  };

  // Fetch all reviews by reviewer
  const fetchAllReviews = async () => {
    try {
      const response = await axiosInstance.get('/auth/reviewer/reviews');
      console.log("Fetched reviewer reviews:", response.data);
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
  const fetchParticipantReviewById = async (paperId: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await axiosInstance.get(`/auth/participant/papers/${paperId}/review`);
      participantReviews.value = response.data
      return response.data
    } catch (err) {
      error.value = 'Failed to fetch reviews for participant papers.'
      console.error(err)
      throw err
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
    createReview,
    updateReview,
    sendReview,
    deleteReview,
    fetchReview,
    fetchAllReviews,
    fetchParticipantReviewById,

    //Computed
    draftReviews,
    submittedReviews,
  }
})
