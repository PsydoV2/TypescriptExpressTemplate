import { Router } from "express";
import {deleteAccount, getUser} from "../controllers/user.controller";
import {validate} from "../middlewares/validate.middleware";
import {deleteUserSchema, getUserSchema} from "../schemas/user.schema";

const router = Router();

/**
 * User routes
 * - /deleteAccount → Deletes the currently authenticated user account
 * - /getUser → Gets all data of a user
 */
router.delete("/deleteAccount", validate(deleteUserSchema), deleteAccount);
router.get("/getUser", validate(getUserSchema), getUser);

export default router;
