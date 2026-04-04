import express from "express";
import {
    DatosGeneralesUsuario,
    DatosGeneralesEmpresa,
    RegistroEmpresa,
    EnvioEmpresa,
    RegistroDomi,
    InfoDomi,
    RegistroUsuario,
    verDomi,
} from "../controllers/empresaController.js";

const router = express.Router();


router.post("/api/registrarempresa", RegistroEmpresa);
router.post("/api/registrosdomi", RegistroDomi);
router.post("/api/registrousuario", RegistroUsuario);


router.post("/api/datosGenerales/usuario", DatosGeneralesUsuario); // Ver datos generales
router.post("/api/datosGenerales/empresa", DatosGeneralesEmpresa); // Ver datos generales
router.get("/api/infoempre", EnvioEmpresa); // Ver empresas
router.get("/api/infodomi/:id_empresa", InfoDomi); // Ver información de domicilios
router.post("/api/domicilios/verdomi", verDomi); // Ver domicilios


export default router;
