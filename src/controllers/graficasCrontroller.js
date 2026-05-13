import pool from "../config/db.js";



export const verMateriales = async (req, res) =>{
    const { id_empresa, id_domicilio} = req.query;

    if (!id_empresa || !id_domicilio) {
        return res.status(400).json({ message: "Faltan parámetros requeridos." });
    }

    try {
        const { rows } = await pool.query(`
            SELECT 
                id_material_interno, fraccion_arancelaria, nombre_interno, descripcion_fraccion, unidadmedida, subd
            FROM 
                material
            WHERE 
                id_empresa = $1 
                AND 
                id_domicilio = $2
            `,[id_empresa,id_domicilio]);
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};