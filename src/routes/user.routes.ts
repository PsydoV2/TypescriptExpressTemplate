import { Router } from "express";
import {deleteAccount, getUser} from "../controllers/user.controller";
import {validate} from "../middlewares/validate.middleware";
import {deleteUserSchema, getUserSchema} from "../schemas/user.schema";

const router = Router();

router.delete("/deleteAccount", validate(deleteUserSchema), deleteAccount);
router.get("/getUser", validate(getUserSchema), getUser);

export default router;
