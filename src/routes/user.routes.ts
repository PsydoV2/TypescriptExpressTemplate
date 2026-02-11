import { Router } from "express";
import {deleteAccount, getUser} from "../controllers/user.controller";

const router = Router();

/**
 * User routes
 * - /deleteAccount → Deletes the currently authenticated user account
 * - /getUser → Gets all data of a user
 * - /userTest → Simple test route to verify router is working
 */
router.delete("/deleteAccount", deleteAccount);
router.get("/getUser", getUser);
router.get("/userTest", (_req, res) => res.send("User routes working!"));

export default router;
