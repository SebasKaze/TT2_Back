import pool from "../config/db.js";

export const testDB = async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "Conexión exitosa",
            time: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Error conectando a la base de datos"
        });
    }
};