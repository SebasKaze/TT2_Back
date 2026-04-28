import express from "express";
import {
    verPedimentoCompleto,
    verMateProDesc
} from "../controllers/pedimentoController.js"

const router = express.Router();

router.get("/api/verpedimentocompleto", verPedimentoCompleto);

router.get("/api/verDetalleProducto", verMateProDesc);

export default router;
