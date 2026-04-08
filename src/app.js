import cors from "cors";
import dotenv from "dotenv";

//Rutas
import express from "express";
import { pool } from "./config/db.js";
import userRoutes from "./routes/users.js";
import fileRoutes from "./routes/cuenta.routes.js";

dotenv.config();

//Middlewares
const app = express();
app.use(cors());
app.use(express.json());

// Rutas base

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("🚀 Servidor funcionando correctamente");
});

app.use("/api/users", userRoutes);
app.use("/api/files", fileRoutes);

//Rutas de pruebas
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    console.error("Fallo de conexión a la BD:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT_ENV = process.env.PORT || PORT;
app.listen(PORT_ENV, () => {
  console.log(`Servidor escuchando en el puerto ${PORT_ENV}`);
});
