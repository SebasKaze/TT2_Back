import { config } from "dotenv";

// Carga las variables del archivo .env en el objeto process.env
config();

// Exportamos la constante PORT que server.js está intentando importar
export const PORT = process.env.PORT || 3000;
