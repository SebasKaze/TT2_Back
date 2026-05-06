import pool from "../config/db.js";

import axios from "axios";
import FormData from "form-data";


export const procesarPedimento = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se subió ningún archivo" });
        }
        // 1. Preparar archivo
        const formData = new FormData();
        formData.append("file", req.file.buffer, req.file.originalname);
        // 2. Enviar a FastAPI
        const response = await axios.post(
        "http://localhost:8000/extract-pedimento",
        formData,
        {
            headers: formData.getHeaders(),
        }
        );
        const dataIA = response.data.data;

        return res.json({
            message: "Datos extraídos",
            data: dataIA,
        });

    } catch (error) {
        console.error("Error conectando con la API de Python:", error.message);
        return res.status(500).json({
            error: "Error al procesar PDF",
        });
    }
};

export const cargarPedimentoPDF = async (req, res) => {
    
    try {
        const data = req.body;
        console.log("Datos recibidos:", JSON.stringify(data, null, 2));
        /*
        if (!req.file) {
            return res.status(400).json({ error: "No se subió ningún archivo" });
        }
        // 1. Preparar archivo
        const formData = new FormData();
        formData.append("file", req.file.buffer, req.file.originalname);
        // 2. Enviar a FastAPI
        const response = await axios.post(
        "http://localhost:8000/extract-pedimento",
        formData,
        {
            headers: formData.getHeaders(),
        } 
        ); 
        const dataIA = response.data.data;
        // 3. (Opcional) Guardar en DB

        return res.json({
            message: "Datos extraídos",
            data: dataIA,
        });
        */

    } catch (error) {
        console.error("Error conectando con la API de Python:", error.message);
        return res.status(500).json({
            error: "Error al procesar PDF",
        });
    }
};
