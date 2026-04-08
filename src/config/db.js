import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

// Configuración de la conexión usando variables de entorno
export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Verificación rápida en consola
pool.on("connect", () => {
  console.log("✅ Conexión establecida con la base de datos");
});
