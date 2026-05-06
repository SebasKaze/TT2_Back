import express from "express";

import {
    procesarPedimento,
    cargarPedimentoPDF
} from "../controllers/cargaPDFController.js"
import {
    upload
} from "../middlewares/upload.js"

const router = express.Router();

router.post("/api/procesar_pedimento", upload.single("file"), procesarPedimento);

router.post("/api/cargarpedimentoPDF", cargarPedimentoPDF);


export default router; 
