import pool from "../config/db.js";

export const entradaMercancia = async (req, res) => {
    try {
        //const data = req.query;
        //console.log("Datos recibidos:", JSON.stringify(data, null, 2));
        
        const { id_empresa, id_domicilio } = req.query;

        if (!id_empresa || !id_domicilio) {
            return res.status(400).json({ error: "Parámetros id_empresa e id_domicilio son obligatorios" });
        }

        const query = `
            SELECT 
                p.no_pedimento, 
                p.clave_ped,
                TO_CHAR(e.fecha_en, 'YYYY-MM-DD') AS fecha_en
            FROM 
                pedimento p
            JOIN pedimento_encabezado e ON p.no_pedimento = e.no_pedimento
            WHERE p.id_empresa = $1 AND p.id_domicilio = $2 AND p.tipo_oper = 'IMP';
        `;
        const values = [id_empresa, id_domicilio];
        const { rows } = await pool.query(query, values);
        res.json(rows);
        
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

export const salidaMercancias = async (req, res) => { // como odio JavaScript por cierto
    try {
        //const data = req.query;
        //console.log("Datos recibidos:", JSON.stringify(data, null, 2));
        const { id_empresa, id_domicilio } = req.query;

        if (!id_empresa || !id_domicilio) {
            return res.status(400).json({ error: "Parámetros id_empresa e id_domicilio son obligatorios" });
        }

        const query = `
            SELECT 
                p.no_pedimento, 
                p.clave_ped,
                TO_CHAR(e.fecha_en, 'YYYY-MM-DD') AS fecha_en
            FROM 
                pedimento p
            JOIN pedimento_encabezado e ON p.no_pedimento = e.no_pedimento
            WHERE p.id_empresa = $1 AND p.id_domicilio = $2 AND p.tipo_oper = 'EXP';
        `;
        const values = [id_empresa, id_domicilio];
        const { rows } = await pool.query(query, values);
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

export const salidaMercanciasFracciones = async (req, res) => {
    try {
        const { no_pedimento } = req.query;

        if (!no_pedimento) {
            return res.status(400).json({ error: "El parámetro no_pedimento es obligatorio" });
        }

        const query = `
            SELECT 
                fraccion,
                cantidad_umt 
            FROM 
                partida
            WHERE 
                no_pedimento = $1;
        `;
        const values = [no_pedimento];
        const { rows } = await pool.query(query, values);
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

export const mateCargaProducto = async (req, res) => {
    try {
        const { id_empresa, id_domicilio } = req.query;

        if (!id_empresa || !id_domicilio) {
            return res.status(400).json({ error: "Parámetros id_empresa e id_domicilio son obligatorios" });
        }

        const query = `
            SELECT 
                id_producto,
                id_producto_interno,
                nombre_interno
            FROM 
                producto
            WHERE 
                id_empresa = $1 AND id_domicilio = $2
        `;
        const values = [id_empresa, id_domicilio];
        const { rows } = await pool.query(query, values);
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }

};



    export const mateCargaGuardar = async (req, res) => {
        const data = req.body;
        try {
            const id_producto = data.id_producto;
            const id_domicilio = data.id_domicilio;
            const query1 = `
                SELECT 
                    nombre_interno
                FROM 
                    producto
                WHERE 
                    id_producto = $1
            `;
            const values1 = [id_producto];
            const resultadoNombre = await pool.query(query1, values1);

            if (resultadoNombre.rows.length === 0) {
                return res.status(404).json({ error: "Producto no encontrado" });
            }

            const nombre_interno = resultadoNombre.rows[0].nombre_interno;
            const QueryinsertCreacionP = `
                INSERT INTO creacion_de_producto
                    (id_producto, cantidad, fecha_transformacion, id_usuario, nombre, fecha_registro, id_domicilio, id_empresa) 
                VALUES 
                    ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id_transformacion;
            `;
            const ValuesinsertCreacionP = [
                id_producto,
                data.cantidad_producto,
                data.fecha_creacion,
                data.id_usuario,
                nombre_interno,
                data.fecha_reg,
                data.id_domicilio,
                data.id_empresa
            ];
            const PoolCreacionP = await pool.query(QueryinsertCreacionP, ValuesinsertCreacionP);
            const id_trans = PoolCreacionP.rows[0].id_transformacion;
            await cargaMaterialUtilizado(id_trans, data.materiales,id_domicilio);
            res.json({
                message: "Información enviada correctamente",
                data: PoolCreacionP.rows[0],
            });
        } catch (error) {
            console.error("Error al procesar la solicitud:", error);
            res.status(500).json({ error: "Error interno del servidor" });
        }
    };

    const cargaMaterialUtilizado = async (id, materiales, id_domicilio) => {
        const client = await pool.connect(); // Usar transacción para consistencia
        try {
            await client.query('BEGIN');
            
            if (Array.isArray(materiales) && materiales.length > 0) {
                
                for (const material of materiales) {
                    let cantidadPendiente = material.cantidad;
                    const resMU = await client.query(
                        `INSERT INTO material_utilizado 
                        (id_transformacion, id_material, cantidad, id_domicilio)
                        VALUES ($1, $2, $3, $4) RETURNING id_uso`,
                        [id, material.id_material, material.cantidad, id_domicilio]
                    );
                    const id_uso = resMU.rows[0].id_uso;
                    const resFracc = await client.query(
                        `SELECT fraccion_arancelaria 
                        FROM material 
                        WHERE id_material = $1`,
                        [material.id_material]
                    );
                    
                    if (!resFracc.rows[0]?.fraccion_arancelaria) {
                        throw new Error(`Fracción no encontrada para material ${material.id_material}`);
                    }

                    const fraccion = resFracc.rows[0].fraccion_arancelaria;

                    while (cantidadPendiente > 0) {
                        const saldo = await client.query(`
                            SELECT s.id_saldo, s.cantidad, s.no_pedimento,
                                COALESCE(
                                    (SELECT restante 
                                     FROM resta_saldo_mu 
                                     WHERE id_saldo = s.id_saldo 
                                     ORDER BY id_resta_saldo_mu DESC 
                                     LIMIT 1),
                                    s.cantidad
                                ) as restante_actual
                            FROM saldo s
                            WHERE s.fraccion = $1
                              AND s.estado = 1
                              AND ( -- Filtrar saldos con disponibilidad
                                EXISTS (
                                    SELECT 1 FROM resta_saldo_mu 
                                    WHERE id_saldo = s.id_saldo 
                                    AND restante > 0
                                ) OR NOT EXISTS (
                                    SELECT 1 FROM resta_saldo_mu 
                                    WHERE id_saldo = s.id_saldo
                                )
                              )
                            ORDER BY s.fecha_sal ASC
                            LIMIT 1
                        `, [fraccion]);
    
                        if (saldo.rows.length === 0) {
                            await client.query('ROLLBACK');
                            throw new Error(`Saldo insuficiente para fracción ${fraccion}`);
                        }
    
                        const { 
                            id_saldo, 
                            no_pedimento, 
                            restante_actual, 
                            cantidad: saldo_original 
                        } = saldo.rows[0];
                        const consumo = Math.min(cantidadPendiente, restante_actual);
                        const nuevo_restante = restante_actual - consumo;
                        await client.query(
                            `INSERT INTO resta_saldo_mu 
                            (id_saldo, id_uso, restante, no_pedimento)
                            VALUES ($1, $2, $3, $4)`,
                            [id_saldo, id_uso, nuevo_restante, no_pedimento]
                        );

                        if (nuevo_restante <= 0) {
                            await client.query(
                                `UPDATE saldo SET estado = 2 WHERE id_saldo = $1`,
                                [id_saldo]
                            );

                        }
                        cantidadPendiente -= consumo;
                    }
                }
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error en transacción:', error.message);
            throw error;
        } finally {
            client.release();
        }
    };
    
    

export const mateCargaMeteriales = async (req, res) => {
    try {
        const { id_transformacion } = req.query;

        if (!id_transformacion) {
            return res.status(400).json({
                error: "id_transformacion es obligatorio"
            });
        }

        const query = `
            SELECT
                mu.id_material,
                m.id_material_interno,
                m.nombre_interno,
                m.fraccion_arancelaria,
                m.subd,
                mu.cantidad
            FROM material_utilizado mu
            INNER JOIN material m
                ON mu.id_material = m.id_material
            WHERE mu.id_transformacion = $1
            ORDER BY m.nombre_interno;
        `;

        const { rows } = await pool.query(query, [id_transformacion]);

        res.json(rows);

    } catch (error) {
        console.error("Error al obtener materiales utilizados:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};



export const prodCreado = async (req, res) => {
    try {
        const { id_empresa, id_domicilio } = req.query;

        if (!id_empresa || !id_domicilio) {
            return res.status(400).json({
                error: "Parámetros id_empresa e id_domicilio son obligatorios"
            });
        }

        const query = `
            SELECT
                t.id_transformacion,
                t.no_pedimento,
                p.id_producto_interno,
                p.nombre_interno,
                p.fraccion_arancelaria,
                t.sec_partida,
                t.cantidad,
                t.fecha_transformacion
            FROM transformacion t
            INNER JOIN producto p
                ON t.id_producto = p.id_producto
            INNER JOIN pedimento ped
                ON t.no_pedimento = ped.no_pedimento
            WHERE ped.id_empresa = $1
              AND ped.id_domicilio = $2
              AND ped.tipo_oper = 'EXP'
            ORDER BY t.fecha_transformacion DESC;
        `;

        const { rows } = await pool.query(query, [
            id_empresa,
            id_domicilio
        ]);

        if (rows.length === 0) {
            return res.json({ mensaje: "No se encontraron productos creados" });
        }

        res.json(rows);

    } catch (error) {
        console.error("Error al obtener productos creados:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};


export const saldoMuestra = async (req, res) => {
    try {
        const { id_empresa, id_domicilio, selector } = req.query;

        if (!id_empresa || !id_domicilio || !selector) {
            return res.status(400).json({
                error: "Parámetros id_empresa, id_domicilio y selector son obligatorios"
            });
        }

        const queryPedimentos = `
            SELECT no_pedimento
            FROM pedimento
            WHERE id_empresa = $1
            AND id_domicilio = $2
            AND tipo_oper = 'IMP';
        `;

        const resultPedimentos = await pool.query(queryPedimentos, [
            id_empresa,
            id_domicilio
        ]);

        if (resultPedimentos.rows.length === 0) {
            return res.json({ mensaje: "No se encontraron pedimentos" });
        }

        let resultados = [];

        for (const pedimentoRow of resultPedimentos.rows) {
            const no_pedimento = pedimentoRow.no_pedimento;

            // ==========================
            // SELECTOR 1
            // Fracciones sin utilizar
            // ==========================
            if (Number(selector) === 1) {
                const queryFracciones = `
                    SELECT id_suma, fracc, subd, cant_total
                    FROM suma
                    WHERE no_pedimento = $1
                    AND estado = '1';
                `;

                const fracciones = await pool.query(queryFracciones, [no_pedimento]);

                for (const fraccionRow of fracciones.rows) {
                    const { id_suma, fracc, subd, cant_total } = fraccionRow;

                    const queryUso = `
                        SELECT 1
                        FROM resta_suma_mu
                        WHERE idd_suma = $1
                        LIMIT 1;
                    `;

                    const uso = await pool.query(queryUso, [id_suma]);

                    // Si no existe, nunca se ha usado
                    if (uso.rows.length === 0) {
                        resultados.push({
                            no_pedimento,
                            fraccion: `${fracc}-${subd}`,
                            cantidad_total: cant_total
                        });
                    }
                }
            }

            // ==========================
            // SELECTOR 2
            // Fracciones agotadas
            // ==========================
            if (Number(selector) === 2) {
                const queryFracciones = `
                    SELECT fracc, subd
                    FROM suma
                    WHERE no_pedimento = $1
                    AND estado = '2';
                `;

                const fracciones = await pool.query(queryFracciones, [no_pedimento]);

                for (const fraccionRow of fracciones.rows) {
                    resultados.push({
                        no_pedimento,
                        fraccion: `${fraccionRow.fracc}-${fraccionRow.subd}`
                    });
                }
            }

            // ==========================
            // SELECTOR 3
            // Fracciones con saldo restante
            // ==========================
            if (Number(selector) === 3) {
                const queryFracciones = `
                    SELECT id_suma, fracc, subd
                    FROM suma
                    WHERE no_pedimento = $1
                    AND estado = '1';
                `;

                const fracciones = await pool.query(queryFracciones, [no_pedimento]);

                for (const fraccionRow of fracciones.rows) {
                    const { id_suma, fracc, subd } = fraccionRow;

                    const queryRestaSaldo = `
                        SELECT cant_restante
                        FROM resta_suma_mu
                        WHERE idd_suma = $1
                        ORDER BY id_resta DESC
                        LIMIT 1;
                    `;

                    const resultRestaSaldo = await pool.query(queryRestaSaldo, [id_suma]);

                    if (resultRestaSaldo.rows.length > 0) {
                        resultados.push({
                            no_pedimento,
                            fraccion: `${fracc}-${subd}`,
                            cantidad_restante: resultRestaSaldo.rows[0].cant_restante
                        });
                    }
                }
            }
        }

        //console.log("Resultados enviados al frontend:", resultados);
        res.json(resultados);

    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};