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
  getReviewers,
  getPaperById,
  deleteQuestion,
  getUserById,
  getCategoryById,
  deleteUser,
  createUser,
  downloadSinglePaper,
  adminDeletePaper,
  deleteConference,
  getCommittees,
  addCommittee,
  updateCommittee, deleteCommittee, getProgram, deleteProgramItem, uploadProgramFile, addProgramItem, updateProgramItem
} from '../controllers/admin.controller'
import { authenticateToken } from "../middleware/authenticateToken";
import { upload } from '../controllers/user.controller'

const router = Router();

router.use(authenticateToken);

//Users
router.get("/users", getAllUsers);
router.get("/users/:userId", getUserById);
router.patch("/users/:userId", editUserDetails);
router.post("/users", createUser)
router.get("/reviewers", getReviewers);
router.delete("/users/:userId", deleteUser);

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
router.delete("/conferences/:conferenceId", deleteConference);

// Questions for reviews
router.get("/questions", getAllQuestions);
router.get("/questions/:questionId", getQuestionById);
router.post("/questions", createQuestion);
router.patch("/questions/:questionId", updateQuestion);
router.delete("/questions/:questionId", deleteQuestion);

//Papers by conference
router.get("/papers", getAllPapers);
router.get("/papers/:paperId", getPaperById);
router.get("/papers/download/:conferenceId/:paperId", downloadSinglePaper);
router.get("/papers/download/:conferenceId", downloadPapersByConference);
router.patch("/papers/:paperId/reviewer", assignReviewer);
router.patch("/papers/:paperId/deadline", changeSubmissionDeadline);
router.delete("/papers/:paperId", adminDeletePaper);

//Homepage - Committees
router.get('/committees', getCommittees);
router.post('/committees', addCommittee);
router.patch('/committees/:committeeId', updateCommittee);
router.delete('/committees/:committeeId', deleteCommittee);

//Homepage - Program
router.get("/program", getProgram);
router.post("/program", addProgramItem);
router.patch("/program/:itemId", updateProgramItem);
router.delete("/program/:itemId",  deleteProgramItem);
router.post("/program/upload", upload.single("file"), uploadProgramFile);

//Homepage - Documents

//Homepage - Templates

//router.get("/reports", getAdminReports);
export default router;
