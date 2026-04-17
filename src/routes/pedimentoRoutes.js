import express from "express";
import {
    verPedimentoCompleto
} from "../controllers/pedimentoController.js"

const router = express.Router();

router.get("/api/verpedimentocompleto", verPedimentoCompleto);

export default router;
