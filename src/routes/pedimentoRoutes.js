import express from "express";
import {
    verPedimentoCompleto,
    verMateProDesc,
    editarPedimento
} from "../controllers/pedimentoController.js"

const router = express.Router();

router.get("/api/verpedimentocompleto", verPedimentoCompleto);

router.get("/api/verDetalleProducto", verMateProDesc);

router.post("/api/editarpedimento",editarPedimento);

export default router;
 