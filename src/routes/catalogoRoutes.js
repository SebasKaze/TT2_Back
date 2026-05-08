import express from "express";
import {
    cargaMaterial,
    verMateriales,
    editarMaterial,
    eliminarMaterial,

    cargaProducto,
    verProductos,
    editarProducto,

    verBillete
} from "../controllers/catalogoController.js";

const router = express.Router();


// MATERIALS
router.post("/api/cargamateriales", cargaMaterial);
router.get("/api/verMateriales", verMateriales);
router.post("/api/editarmaterial",editarMaterial);
router.delete("/api/eliminarmaterial/:id",eliminarMaterial);

//PRODUCTO
router.post("/api/cargaproducto", cargaProducto);
router.get("/api/verproductos", verProductos);
router.put("/api/editarproducto/:id",editarProducto);

//BILLETE DE MATERIALES 
router.get("/api/billete/:id",verBillete);

export default router;
