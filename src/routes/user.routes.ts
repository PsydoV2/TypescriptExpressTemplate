import { Router } from "express";
import {deleteAccount, getUser} from "../controllers/user.controller";
import {validate} from "../middlewares/validate.middleware";
import {deleteUserSchema, getUserSchema} from "../schemas/user.schema";

const router = Router();

/**
 * @openapi
 * /api/user/deleteAccount:
 * delete:
 * summary: Delete user account
 * tags: [User]
 * security:
 *  - bearerAuth: []
 * requestBody:
 *  required: true
 * content:
 *  application/json:
 * schema:
 * $ref: '#/components/schemas/DeleteUserInput'
 * responses:
 *  200:
 *   description: Account deleted
 *  401:
 *   description: Unauthorized
 */
router.delete("/deleteAccount", validate(deleteUserSchema), deleteAccount);

/**
 * @openapi
 * /api/user/getUser:
 * get:
 * summary: Get user details
 * tags: [User]
 * parameters:
 *  - in: query
 * name: userID
 * required: true
 * schema:
 *  type: string
 *  format: uuid
 * responses:
 *  200:
 *   description: User data retrieved successfully
 *  404:
 *   description: User not found
 */
router.get("/getUser", validate(getUserSchema), getUser);

export default router;
