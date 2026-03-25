import express from "express";
import { testDB } from "../controllers/testController.js";

const router = express.Router();

router.get("/testdb", testDB);

export default router;