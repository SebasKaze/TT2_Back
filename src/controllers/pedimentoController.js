import pool from "../config/db.js";



export const verPedimentoCompleto = async (req, res) => {
    const { no_pedimento } = req.query;

    try {
        const query = `
            SELECT json_build_object(
                'pedimento', p.*,
                
                'encabezado', (
                    SELECT row_to_json(e)
                    FROM pedimento_encabezado e
                    WHERE e.no_pedimento = p.no_pedimento
                ),

                'proveedores', (
                    SELECT json_agg(dpc)
                    FROM datos_proveedor_comprador dpc
                    WHERE dpc.no_pedimento = p.no_pedimento
                ),

                'destinos', (
                    SELECT json_agg(dd)
                    FROM datos_d dd
                    WHERE dd.no_pedimento = p.no_pedimento
                ),

                'transportes', (
                    SELECT json_agg(dt)
                    FROM datos_transport dt
                    WHERE dt.no_pedimento = p.no_pedimento
                ),

                'candados', (
                    SELECT json_agg(c)
                    FROM candados c
                    WHERE c.no_pedimento = p.no_pedimento
                ),

                'totales', (
                    SELECT row_to_json(t)
                    FROM totales_pedimento t
                    WHERE t.no_pedimento = p.no_pedimento
                ),

                'tasas', (
                    SELECT json_agg(tp)
                    FROM tasa_pedi tp
                    WHERE tp.no_pedimento = p.no_pedimento
                ),

                'cuadro_liquidacion', (
                    SELECT json_agg(cl)
                    FROM cuadro_liquidacion cl
                    WHERE cl.no_pedimento = p.no_pedimento
                ),

                'partidas', (
                    SELECT json_agg(
                        json_build_object(
                            'partida', pa.*,

                            'contribuciones', (
                                SELECT json_agg(tp2)
                                FROM tributo_partida tp2
                                WHERE tp2.id_partida = pa.id_partida
                            )
                        )
                    )
                    FROM partida pa
                    WHERE pa.no_pedimento = p.no_pedimento
                )

            ) AS pedimento_completo

            FROM pedimento p
            WHERE p.no_pedimento = $1;
        `;

        const { rows } = await pool.query(query, [no_pedimento]);

        // 🔴 Validación importante
        if (!rows || rows.length === 0 || !rows[0].pedimento_completo) {
            return res.status(404).json({ message: "Pedimento no encontrado" });
        }

        res.json(rows[0].pedimento_completo);

    } catch (error) {
        console.error("Error al obtener pedimento completo:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

export const verMateProDesc = async (req, res) => {
    const { id_producto } = req.query;
    //const data = req.query;
    //console.log("Datos recibidos:", JSON.stringify(data, null, 2));
    try {
        const { rows } = await pool.query(`
            SELECT 
                mu.id_material,
                m.id_material_interno,
                mu.cantidad
            FROM bom mu
            JOIN material m 
                ON mu.id_material = m.id_material
            WHERE mu.id_producto = $1;
        `, [id_producto]);

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener detalle del producto" });
    }
};
