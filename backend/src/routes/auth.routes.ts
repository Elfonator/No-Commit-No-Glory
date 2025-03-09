import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  upload,
} from "../controllers/user.controller";
import { logoutUser } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

router.use(authenticateToken);

// Authenticated routes
router.get("/profile", getUserProfile);
router.patch("/upload", upload.single("avatar"), updateUserProfile);
router.post("/logout", logoutUser);

export default router;
