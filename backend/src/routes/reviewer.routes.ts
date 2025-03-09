import { Router } from "express";
import {
  submitReview,
  getReviewById,
  getAssignedPapers,
  contactAdmin,
  getQuestions,
  notifyReviewer,
  appendReview,
  getAllReviews,
  getAdmins,
  downloadPaperForReview,

} from '../controllers/reviewer.controller'
import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

router.use(authenticateToken);

router.get("/papers", getAssignedPapers);
router.get("/papers/download/:conferenceId/:paperId", downloadPaperForReview);
router.post('/papers/:paperId', appendReview);

router.get('/reviews', getAllReviews)
router.get("/reviews/:reviewId", getReviewById);
router.post("/reviews", submitReview);
router.patch("/reviews/:reviewId", submitReview);

router.get("/questions", getQuestions);
router.get("/admins", getAdmins);
router.post("/contact-admin", contactAdmin);
router.post("/notify-reviewer", notifyReviewer);0

export default router;
