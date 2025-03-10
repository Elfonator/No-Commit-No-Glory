import { Router } from "express";
import {
  createPaper,
  deletePaper,
  editPaper,
  getCategories,
  getConferences,
  getPaperById, getReviewByPaperId,
  notifyParticipant,
  viewMyPapers
} from '../controllers/participant.controller'
import { authenticateToken } from "../middleware/authenticateToken";
import paperUpload from "../middleware/fileUpload";

const router = Router();

router.use(authenticateToken);

router.get("/papers", viewMyPapers);
router.post("/papers", paperUpload.single("file_link"), createPaper);
router.get("/papers/:paperId", getPaperById);
router.get("/papers/:paperId/review", getReviewByPaperId);
router.patch("/papers/:paperId", paperUpload.single("file_link"), editPaper);

router.delete("/papers/:paperId", deletePaper);
router.get("/categories", getCategories);
router.get("/conferences", getConferences);
router.post("/notify-participant", notifyParticipant);

export default router;
