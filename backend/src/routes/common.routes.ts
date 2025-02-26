import { Router } from "express";
import { registerUser, verifyEmail } from "../controllers/user.controller";
import { forgotPassword, loginUser, refreshToken, resetPassword } from '../controllers/auth.controller'
import {
  registerValidationRules,
  verifyEmailValidationRules,
  validateRequest,
  loginValidationRules,
} from "../middleware/validation";
import { getHomepageData } from "../controllers/homepage.controller";

const router = Router();

// Unauthenticated routes
router.get("/homepage", getHomepageData);
router.post(
  "/register",
  registerValidationRules,
  validateRequest,
  registerUser,
);
router.post("/login", loginValidationRules, validateRequest, loginUser);
router.get(
  "/verify-email",
  verifyEmailValidationRules,
  validateRequest,
  verifyEmail,
);
router.post("/refresh-token", refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
