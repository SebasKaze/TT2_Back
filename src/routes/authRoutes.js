import express from "express";
import { login } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

import { register } from "../controllers/authController.js";




const router = express.Router();

router.post("/login", login);

router.get("/profile", verifyToken, (req, res) => {
    res.json({
        message: "Ruta protegida",
        user: req.user
    });
});

router.post("/register", register);

export default router;