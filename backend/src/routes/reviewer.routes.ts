import { Router } from "express";
import {
  getReviewById,
  getAssignedPapers,
  contactAdmin,
  getQuestions,
  notifyReviewer,
  appendReview,
  getAllReviews,
  getAdmins,
  downloadPaperForReview, deleteReview, sendReview, updateReview, createReview

} from '../controllers/reviewer.controller'
import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

router.use(authenticateToken);

router.get("/papers", getAssignedPapers);
router.get("/papers/download/:conferenceId/:paperId", downloadPaperForReview);
router.post('/papers/:paperId', appendReview);

router.get('/reviews', getAllReviews)
router.get("/reviews/:reviewId", getReviewById);
router.post("/reviews", createReview);
router.patch("/reviews/:reviewId", sendReview);
router.patch("/reviews/:reviewId", updateReview);
router.delete("/reviews/:reviewId", deleteReview)

router.get("/questions", getQuestions);
router.get("/admins", getAdmins);
router.post("/contact-admin", contactAdmin);
router.post("/notify-reviewer", notifyReviewer);

export default router;
