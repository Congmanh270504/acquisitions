import express from "express";
import { signIn, signOut, signUp } from "../controller/auth.controller";

const router = express.Router();

router.post("/sign-in", signIn);

router.post("/sign-up", signUp);

router.post("/sign-out", signOut);

export default router;
