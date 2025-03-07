import { Router } from "express";
import {
  submitReview,
  getReviewById,
  downloadPaper,
  getAssignedPapers,
  contactAdmin,
  getQuestions,
  notifyReviewer, appendReview, getSubmittedReviews, getAllReviews, getAdmins
} from '../controllers/reviewer.controller'
import { authenticateToken } from "../middleware/authenticateToken";
import path from 'path'
// /import { validateRequest, validateReviewSubmission, validateReviewUpdate } from '../middleware/validation'

const router = Router();

router.use(authenticateToken);

router.get("/papers", getAssignedPapers);
router.get('/uploads/docs/:conferenceId/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads/docs', req.params.filename);
  res.download(filePath, (err) => {
    if (err) {
      console.error('Error during file download:', err);
      res.status(404).send('File not found');
    }
  });
});
router.post('/papers/:paperId', appendReview);

router.get('/reviews', getAllReviews)
router.get("/reviews/:reviewId", getReviewById);
router.post("/reviews", submitReview);
router.patch("/reviews/:reviewId", submitReview);

router.get("/questions", getQuestions);
router.get("/admins", getAdmins);
router.post("/contact-admin", contactAdmin);
router.post("/notify-reviewer", notifyReviewer);

export default router;
