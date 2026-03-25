import bcrypt from "bcrypt";
import { generateToken } from "../config/jwt.js";
import { findUserByEmail } from "../services/authService.js";

import pool from "../config/db.js";

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await findUserByEmail(email);
        //Validaciones de usuario y de contraseñas
        if (!user) {
        return res.status(404).json({
            message: "Usuario no encontrado"
        });
        }
        if (!password || !user.password_hash) {
            return res.status(400).json({
                message: "Faltan datos para validar contraseña"
            }); 
        }
        //Comparacion de la contraseña hasheada
        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );
        if (!validPassword) {
            return res.status(401).json({
                message: "Contraseña incorrecta"
            });
        }
        //Generacion de token
        const token = generateToken(user);
        res.json({
        message: "Login correcto",
        token,
        user: {
            id: user.id_usuario,
            email: user.correo,
            cuenta: user.id_tipo_cuenta
        }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error del servidor"
        });
    }
};

//Prueba para registrar usuarios
export const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validación básica
        if (!email || !password) {
            return res.status(400).json({
                message: "Email y password son requeridos"
            });
        }
        // Verificar si ya existe
        const existingUser = await pool.query(
            "SELECT * FROM usuario WHERE correo = $1",
            [email]
        );
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "El usuario ya existe"
            });
        }
        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        // Insertar usuario
        const result = await pool.query(
        "INSERT INTO usuario (id_empresa, nombre, correo, telefono, password_hash, id_tipo_cuenta) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_usuario, correo",
        [1,"Sebas",email,"5555123",hashedPassword,1]
        );
        res.status(201).json({
            message: "Usuario creado correctamente",
            user: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error en el servidor"
        });
    }
};
