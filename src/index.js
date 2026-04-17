import express from "express";

import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import  testRouters  from "./routes/testRoutes.js";
import empresaRoutes from "./routes/empresaRoutes.js"
import catalogoRoutes from "./routes/catalogoRoutes.js"
import cargasRoutes from "./routes/cargasRoutes.js"
import procesosRoutes from "./routes/procesosRoutes.js"
import reportesRoutes from "./routes/reportesRoutes.js"
import pedimentoRoutes from "./routes/pedimentoRoutes.js"



const app = express();

const PORT = 3000;



app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));


app.use(express.json());

app.use("/auth", authRoutes);

app.use("/api", testRouters);

app.use(empresaRoutes);

app.use(catalogoRoutes);

app.use(cargasRoutes);

app.use(procesosRoutes);

app.use(reportesRoutes);

app.use(pedimentoRoutes);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

