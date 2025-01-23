import { Router } from "express";
import {
  getAllUsers,
  editUserDetails,
  getAllCategories,
  createCategory,
  updateCategory,
  getAllConferences,
  createConference,
  updateConference,
  getAllPapers,
  assignReviewer,
  downloadPapersByConference,
  changeSubmissionDeadline,
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteCategory,
  getConferenceById,
  getQuestionById,
  getAdminReports,
  getReviewers,
  getPaperById,
  deleteQuestion,
  getUserById,
  getCategoryById,
} from "../controllers/admin.controller";
import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

router.use(authenticateToken);

//Users
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:userId", editUserDetails);
router.get("/reviewers", getReviewers);

//Categories
router.get("/categories", getAllCategories);
router.get("/categories/categoryId", getCategoryById);
router.post("/categories", createCategory);
router.patch("/categories/:categoryId", updateCategory);
router.delete("/categories/:categoryId", deleteCategory);

// Conferences
router.get("/conferences", getAllConferences);
router.get("/conferences/:conferenceId", getConferenceById);
router.post("/conferences", createConference);
router.patch("/conferences/:conferenceId", updateConference);

// Questions for reviews
router.get("/questions", getAllQuestions);
router.get("/questions/:questionId", getQuestionById);
router.post("/questions", createQuestion);
router.patch("/questions/:questionId", updateQuestion);
router.delete("/questions/:questionId", deleteQuestion);

//Papers by conference
router.get("/papers", getAllPapers);
router.get("/papers/:paperId", getPaperById);
router.get("/papers/download/:conferenceId", downloadPapersByConference);
router.patch("/papers/:paperId/reviewer", assignReviewer);
router.patch("/papers/:paperId/deadline", changeSubmissionDeadline);

router.get("/reports", getAdminReports);
export default router;
