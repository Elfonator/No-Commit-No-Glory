import { Router } from "express";
import {
  createPaper,
  deletePaper,
  editPaper,
  getCategories,
  getConferences,
  getPaperById,
  notifyParticipant,
  viewMyPapers,
} from "../controllers/participant.controller";
//import { validateRequest, validateSubmitPaper } from '../middleware/validation'
import { authenticateToken } from "../middleware/authenticateToken";
import paperUpload from "../middleware/fileUpload";

const router = Router();

router.use(authenticateToken);

router.get("/papers", viewMyPapers);
router.post('/papers', paperUpload.single("file_link"), async (req, res) => {
  try {
    await createPaper(req, res);
  } catch (error) {
    res.status(400).json({ message: error });
    return;
  }
});
router.get("/papers/:paperId", getPaperById);
router.patch(
  "/papers/:paperId",
  paperUpload.single("file_link"),
  async (req, res) => {
    try {
      await editPaper(req, res);
    } catch (error) {
      res.status(400).json({ message: error });
      return;
    }
  },
);
router.delete("/papers/:paperId", deletePaper);
router.get("/categories", getCategories);
router.get("/conferences", getConferences);
router.post("/notify-participant", notifyParticipant);

export default router;
