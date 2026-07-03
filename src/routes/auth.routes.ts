import { Router } from "express";
import {
  registerUser,
  loginUser,
  refreshToken,
  logout,
  requestPasswordReset,
  resetPassword,
} from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema";

const router = Router();

router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/refresh", validate(refreshTokenSchema), refreshToken);
router.post("/logout", validate(refreshTokenSchema), logout);
router.post(
  "/request-password-reset",
  validate(requestPasswordResetSchema),
  requestPasswordReset,
);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
