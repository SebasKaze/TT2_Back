import express from "express";
import {
    envioPedimento,
    verPedimentos,
    editarPedimento,  // Importamos el nuevo controlador
    activoFijo,
    verPedimento,
    verDomicilios,
    consultaPedimento,
    pedimentoAf,

} from "../controllers/cargasController.js";

const router = express.Router();

router.get("/api/pedimento/verpedi", verPedimentos);

// Ruta para enviar un pedimento
router.post("/api/cmpedimento", envioPedimento);

// Nueva ruta para editar un pedimento
router.post("/api/edicionPedimento", editarPedimento);


router.get("/api/verpedimento", verPedimento); // Mostrar cosas en pedimentos
router.get("/api/activofijo",activoFijo);
router.get("/api/verDomicilios", verDomicilios ); //Mostrar domicilios
router.get("/api/consultaPedimento/:no_pedimento", consultaPedimento); // Consultar pedimento por no_pedimento
router.get("/api/pedimentoAf/activofijo", pedimentoAf);

export default router;
