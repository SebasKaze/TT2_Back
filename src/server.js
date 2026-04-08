import express from "express";
import { pool } from "./config/db.js";
import { PORT } from "./config/config.js";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

//Importando rutas
//import cuenta from './routes/cuenta.routes.js';

import morgan from "morgan";
import cors from "cors";

const app = express();
app.use(cors());
app.use(morgan("dev")); // No me acuerdo para que era el morgan
app.use(express.json());

//Rutas
//app.use(cuenta);

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});

// Prueba a DB
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    console.error("Fallo de conexión a la BD:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

// Ruta para procesar el pedimento
app.post("/procesar-pedimento", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No se subió ningún archivo" });

    // 1. Preparamos el archivo para enviarlo a FastAPI
    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);

    // 2. Enviamos a la API de Python (Puerto 8000 según tu código)
    const response = await axios.post(
      "http://localhost:8000/extract-pedimento",
      formData,
      {
        headers: formData.getHeaders(),
      },
    );

    const dataIA = response.data;

    // 3. (Opcional) Guardar en PostgreSQL
    // Aquí usarías el 'pool' que ya configuraste
    /*
        const { no_pedimento, peso_bruto } = dataIA.encabezado;
        await pool.query('INSERT INTO pedimentos_logs (no_pedimento, datos) VALUES ($1, $2)', [no_pedimento, dataIA]);
        */

    res.json({
      message: "Datos extraídos",
      data: dataIA,
    });
  } catch (error) {
    console.error("Error conectando con la API de Python:", error.message);
    res.status(500).json({ error: "Error al procesar PDF" });
  }
});

app.post("/procesar-pedimento", upload.single("file"), async (req, res) => {
  const client = await pool.connect(); // Usamos un cliente para la transacción
  try {
    if (!req.file) return res.status(400).json({ error: "No se subió el PDF" });

    // 1. Llamada a la API de Python (FastAPI)
    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);
    const aiResponse = await axios.post(
      "http://localhost:8000/extract-pedimento",
      formData,
      {
        headers: formData.getHeaders(),
      },
    );

    const dataIA = aiResponse.data;

    // 2. INICIO DE TRANSACCIÓN EN POSTGRESQL
    await client.query("BEGIN");

    // A. Insertar en tabla 'pedimento'
    // Nota: id_empresa e id_usuario deberían venir de la sesión del usuario
    await client.query(
      `INSERT INTO pedimento (no_pedimento, id_empresa, id_usuario, tipo_oper, clave_ped) 
             VALUES ($1, $2, $3, $4, $5)`,
      [
        dataIA.encabezado.no_pedimento,
        1,
        1,
        dataIA.encabezado.tipo_oper,
        dataIA.encabezado.clave_ped,
      ],
    );

    // B. Insertar en 'pedimento_encabezado'
    // Ajustamos los IDs de catálogos (asegúrate de que existan en tus tablas cat_*)
    await client.query(
      `INSERT INTO pedimento_encabezado (no_pedimento, id_aduana, id_regimen, tipo_cambio, peso_bruto) 
             VALUES ($1, $2, $3, $4, $5)`,
      [
        dataIA.encabezado.no_pedimento,
        1,
        1,
        dataIA.encabezado.tipo_cambio,
        dataIA.encabezado.peso_bruto,
      ],
    );

    // C. Insertar Partidas (Bucle)
    for (const partida of dataIA.partidas) {
      await client.query(
        `INSERT INTO partida (no_pedimento, sec, fraccion, cantidad_umc, descripcion, valor_aduana) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          dataIA.encabezado.no_pedimento,
          partida.sec,
          partida.fraccion,
          partida.cantidad_umc,
          partida.descripcion,
          partida.valor_aduana,
        ],
      );
    }

    await client.query("COMMIT"); // Guardar todo
    res.json({
      success: true,
      message: "Pedimento procesado y guardado",
      id: dataIA.encabezado.no_pedimento,
    });
  } catch (error) {
    await client.query("ROLLBACK"); // Cancelar todo si hubo error
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});
