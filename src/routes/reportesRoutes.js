import express from "express";

import {
    entradaMercanciaReporteExcel,
    entradaMercanciaReportePDF,
    salidaMercanciaReporteExcel,
    saldoMuestraReporteExcel,
    mateUtilizadosReporteExcel
} from '../controllers/reportesController.js'

const router = express.Router();

router.get("/api/procesos/reporte/emercanciasE", entradaMercanciaReporteExcel); 
router.get("/api/procesos/reporte/emercanciasP", entradaMercanciaReportePDF); 
router.get("/api/procesos/reporte/smercanciasE", salidaMercanciaReporteExcel);
router.get("/api/procesos/reporte/saldoE", saldoMuestraReporteExcel);
router.get("/api/procesos/reporte/materialUE", mateUtilizadosReporteExcel);


export default router;
