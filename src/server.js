
import express from "express";
import { pool } from './config/db.js';
import { PORT } from './config/config.js';

//Importando rutas
import cuenta from './routes/cuenta.routes.js';


import morgan from 'morgan';
import cors from "cors";

const app = express();
app.use(cors());
app.use(morgan('dev')); // No me acuerdo para que era el morgan
app.use(express.json());

//Rutas
app.use(cuenta);


app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});

// Prueba a DB
app.get('/test-db', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW()');
      res.json({ success: true, time: result.rows[0] });
    } catch (err) {
      console.error('Fallo de conexión a la BD:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });