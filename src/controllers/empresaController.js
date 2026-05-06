import pool from "../config/db.js";
import bcrypt from "bcrypt";


export const DatosGeneralesUsuario = async (req, res) => {
    //console.log("Datos recibidos en el backend:", req.body); 
    const { id_usuario } = req.body;

    try {
        
        const { rows } = await pool.query(`
            SELECT 
                nombre, correo, telefono 
            FROM 
                usuario 
            WHERE 
                id_usuario = $1;`,
            [id_usuario]);
        res.json(rows);

    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
export const ActualizarUsuario = async (req, res) => {
    //console.log("Datos recibidos en el backend:", req.body); 
    const { id_usuario, nombre, telefono } = req.body;

    try {
        const { rows } = await pool.query(`
            UPDATE  usuario
            SET nombre = $2,  telefono =$3  
            WHERE 
                id_usuario = $1;`,
            [id_usuario,nombre, telefono]);
        res.json(rows);

    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
        
};





export const DatosGeneralesEmpresa = async (req, res) => {
    //console.log("Datos recibidos en el backend:", req.body); // 👈 Añade esta línea
    const { id_empresa } = req.body;

    try {
        
        const { rows } = await pool.query(`
            SELECT 
                rfc, razon_social, no_immex
            FROM 
                empresa
            WHERE
                id_empresa = $1
            ;`, [id_empresa]);        
        res.json(rows);

    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
//Registro de empresa
export const RegistroEmpresa = async (req, res) => {
    
    const fechaAhora = new Date().toISOString().split('T')[0]; // Resultado: "2025-05-21"

    //const data = req.body;
    //console.log("Datos recibidos REGISTRO_EMPRESA:", JSON.stringify(data, null, 2));
    try {
        const envioEmpresa = req.body;

        // Verificar si ya existe una empresa con el mismo RFC
        const existeRFCQuery = `SELECT * FROM empresa WHERE rfc = $1`;
        const existeRFCResult = await pool.query(existeRFCQuery, [envioEmpresa.rfc]);
        if (existeRFCResult.rows.length > 0) {
            return res.status(400).json({ message: "Ya existe una empresa con ese RFC." });
        }
        //VERIFICAR SI EXISTE UN SOLO IMMEX
        // Verificar si ya existe una empresa con el mismo número IMMEX
        const existeIMMEXQuery = `SELECT * FROM empresa WHERE no_immex = $1`;
        const existeIMMEXResult = await pool.query(existeIMMEXQuery, [envioEmpresa.no_immex]);
        if (existeIMMEXResult.rows.length > 0) {
            return res.status(400).json({ message: "Ya existe una empresa con ese número IMMEX." });
        }

        // Insertar si no existen duplicados
        const envioEmpresaQuery = `
            INSERT INTO empresa 
            (rfc, razon_social, no_immex, fecha_registro, nombre)
            VALUES ($1, $2, $3, $4, $5)
        `;
        const envioEmpresaValues = [
            envioEmpresa.rfc,
            envioEmpresa.razonSocial,
            envioEmpresa.no_immex,
            fechaAhora,
            envioEmpresa.nombre,
        ];

        await pool.query(envioEmpresaQuery, envioEmpresaValues);
        res.status(200).json({ message: "Empresa registrada con éxito." });

    } catch (error) {
        console.error("Error al registrar la empresa:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};
//Enviar empresa
export const EnvioEmpresa = async(req,res) =>{
    try{
        const { rows } = await pool.query(`
            SELECT 
                id_empresa, nombre
            FROM 
                empresa   
            ;`);
        res.json(rows);
    }catch(error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
//Registrar Domicilio
export const RegistroDomi = async (req, res) => {
    try {
        const envioDomicilio = req.body;
        //console.log("Datos recibidos DOMICILIO:", JSON.stringify(envioDomicilio, null, 2));
        const envioDomicilioQuery = `
            INSERT INTO domicilio
            (id_empresa, texto, id_tipo_domicilio)
            VALUES 
            ($1, $2, $3)
        `;
        const envioDomicilioValues = [
            envioDomicilio.empresaId,
            envioDomicilio.domicilio,
            envioDomicilio.tipo_domi,
        ];

        await pool.query(envioDomicilioQuery, envioDomicilioValues);

        res.status(201).json({ message: "Domicilio registrado exitosamente." });

    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
//Informacion de domicilio
export const InfoDomi = async (req,res) =>{
    const { id_empresa } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT 
                id_domicilio, texto 
            FROM 
                domicilio
            WHERE 
                id_empresa = $1`,
            [id_empresa]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener domicilios:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
//Registrar usuario
export const RegistroUsuario = async (req, res) => {
    try {
        const envioUsuario = req.body;
        //console.log("Datos recibidos REGISTRO_USER:", JSON.stringify(envioUsuario, null, 2));
        // Verificar si ya existe un usuario con el mismo correo
        
        const correoExisteQuery = `SELECT 1 FROM usuario WHERE correo = $1`;
        const { rows } = await pool.query(correoExisteQuery, [envioUsuario.correo]);

        if (rows.length > 0) {
            return res.status(400).json({ error: "El correo ya está registrado." });
        }

        const hashedPassword = await bcrypt.hash(envioUsuario.contraseña, 10);

        const envioUsuarioQuery = `
            INSERT INTO usuario
            (id_empresa, nombre, correo, telefono, password_hash, id_tipo_cuenta, id_domicilio)
            VALUES 
            ($1, $2, $3, $4, $5, $6, $7)
        `;
        const envioUsuarioValues = [
            envioUsuario.empresaId,
            envioUsuario.nombre,
            envioUsuario.correo,
            envioUsuario.telefono,
            hashedPassword,
            envioUsuario.rol,
            envioUsuario.domicilioId,
        ];
        await pool.query(envioUsuarioQuery, envioUsuarioValues);

        res.status(200).json({ message: "Usuario registrado exitosamente" });
        
    } catch (error) {
        console.error("Error al registrar usuario:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
//Ver Domicilios
export const verDomi = async (req, res) => { 
    const {id_usuario, id_empresa} = req.body;
        try {
            const { rows } = await pool.query(`
                SELECT 
                    texto
                FROM
                    domicilio
                WHERE
                    id_empresa = $1
                ;`, [id_empresa]);
            res.json(rows);
        } catch (error) {
            console.error("Error al obtener datos:", error);
            res.status(500).json({ error: "Error interno del servidor" });
        }
    };