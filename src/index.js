import express from "express";

import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import  testRouters  from "./routes/testRoutes.js";
const app = express();

const PORT = 3000;



app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));


app.use(express.json());

app.use("/auth", authRoutes);

app.use("/api", testRouters);


app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

