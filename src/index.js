import express from "express";

import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import  testRouters  from "./routes/testRoutes.js";
import empresaRoutes from "./routes/empresaRoutes.js"
import catalogoRoutes from "./routes/catalogoRoutes.js"





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

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

