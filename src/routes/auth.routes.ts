import { Router } from "express";
import { registerUser, loginUser } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { loginSchema, registerSchema } from "../schemas/auth.schema";

const router = Router();

/**
 * @openapi
 *  /api/auth/register:
 *  post:
 *  summary: Register a user
 *  requestBody:
 *  content:
 *  application/json:
 *  schema:
 *  $ref: '#/components/schemas/RegisterInput'
 *  responses:
 *   200:
 *    description: OK
 */
router.post("/register", validate(registerSchema), registerUser);

/**
 * @openapi
 *  /api/auth/login:
 *  post:
 *  summary: Authenticate a user
 *  requestBody:
 *  content:
 *  application/json:
 *  schema:
 *  $ref: '#/components/schemas/LoginInput'
 *  responses:
 *   200:
 *    description: OK
 */
router.post("/login", validate(loginSchema), loginUser);

export default router;
