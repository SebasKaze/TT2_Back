import pool from "../config/db.js";
import { compareSync } from 'bcrypt';

export const verPedimentos = async (req, res) => {
    const { id_empresa, id_domicilio } = req.query;

    if (!id_empresa || !id_domicilio) {
        return res.status(400).json({ message: "Faltan parámetros requeridos." });
    }

    try {
        const { rows } = await pool.query(
            `SELECT no_pedimento FROM pedimento WHERE id_empresa = $1 AND id_domicilio = $2`,
            [id_empresa, id_domicilio]
        );

        res.json(rows);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

export const editarPedimento = async (req, res) => {
    const data = req.body;
    console.log("Pedimento:", JSON.stringify(data, null, 2));
    const { no_pedimento } = req.body;
    console.log("Valor de PEDI:", no_pedimento);

    if (!no_pedimento) {
        return res.status(400).json({ error: "El número de pedimento es requerido" });
    }

    let client;
    try {
        // Conectar con la base de datos y comenzar transacción
        client = await pool.connect();
        await client.query("BEGIN");
        const pedimento = await client.query(
            "SELECT * FROM pedimento WHERE no_pedimento = $1",
            [parseInt(no_pedimento, 10)]        
        );
        if (pedimento.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Pedimento no encontrado" });
        }

        // 2. Actualizar registros existentes en partidas
        if (data.seccion7?.modified?.length > 0) {
            for (const item of data.seccion7.modified) {
                await client.query(
                    `UPDATE partidas SET 
                        sec = $1, fraccion = $2, subd = $3, vinc = $4, met_val = $5, umc = $6, cantidad_umc = $7, 
                        umt = $8, cantidad_umt = $9, pvc = $10, pod = $11, descri = $12, val_adu = $13, 
                        imp_precio_pag = $14, precio_unit = $15, val_agreg = $16, marca = $17, modelo = $18, 
                        codigo_produ = $19, obser = $20
                    WHERE id_partida = $21 AND no_pedimento = $22`,
                    [
                        item.sec, item.fraccion, item.subd, item.vinc, item.met_val, item.umc, 
                        item.cantidad_umc, item.umt, item.cantidad_umt, item.pvc, item.pod, 
                        item.descri, item.val_adu, item.imp_precio_pag, item.precio_unit, 
                        item.val_agreg, item.marca, item.modelo, item.codigo_produ, item.obser, 
                        item.id_partida, no_pedimento
                    ]
                );
            }
        }

        // 3. Insertar nuevas partidas
        if (data.seccion7?.added?.length > 0) {
            for (const item of data.seccion7.added) {
                await client.query(
                    `INSERT INTO partidas (
                        no_pedimento, sec, fraccion, subd, vinc, met_val, umc, cantidad_umc, umt, 
                        cantidad_umt, pvc, pod, descri, val_adu, imp_precio_pag, precio_unit, 
                        val_agreg, marca, modelo, codigo_produ, obser
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
                    [
                        no_pedimento, item.sec, item.fraccion, item.subd, item.vinc, item.met_val, 
                        item.umc, item.cantidad_umc, item.umt, item.cantidad_umt, item.pvc, item.pod, 
                        item.descri, item.val_adu, item.imp_precio_pag, item.precio_unit, 
                        item.val_agreg, item.marca, item.modelo, item.codigo_produ, item.obser
                    ]
                );
            }
        }

        // 4. Eliminar partidas
        if (data.seccion7?.removed?.length > 0) {
            for (const idPartida of data.seccion7.removed) {
                await client.query(
                    "DELETE FROM partidas WHERE id_partida = $1 AND no_pedimento = $2",
                    [idPartida, no_pedimento]
                );
            }
        }

        // 5. Manejo de contribuciones
        if (data.contribuciones?.added?.length > 0) {
            for (const item of data.contribuciones.added) {
                await client.query(
                    `INSERT INTO tasa_pedi (contribucion, cv_t_tasa, tasa, no_pedimento) 
                    VALUES ($1, $2, $3, $4)`,
                    [item.contribucion, item.clave, item.tasa, no_pedimento]
                );
            }
        }

        if (data.contribuciones?.modified?.length > 0) {
            for (const item of data.contribuciones.modified) {
                await client.query(
                    `UPDATE tasa_pedi SET contribucion = $1, cv_t_tasa = $2, tasa = $3 
                    WHERE id_tasa = $4 AND no_pedimento = $5`,
                    [item.contribucion, item.clave, item.tasa, item.id_tasa, no_pedimento]
                );
            }
        }

        if (data.contribuciones?.removed?.length > 0) {
            for (const idTasa of data.contribuciones.removed) {
                await client.query(
                    "DELETE FROM tasa_pedi WHERE id_tasa = $1 AND no_pedimento = $2",
                    [idTasa, no_pedimento]
                );
            }
        }

        // 6. Manejo del cuadro de liquidación
        if (data.cuadroLiquidacion?.added?.length > 0) {
            for (const item of data.cuadroLiquidacion.added) {
                await client.query(
                    `INSERT INTO cua_liqui (concepto, forma_pago, importe, no_pedimento) 
                    VALUES ($1, $2, $3, $4)`,
                    [item.concepto, item.formaPago, item.importe, no_pedimento]
                );
            }
        }

        if (data.cuadroLiquidacion?.modified?.length > 0) {
            for (const item of data.cuadroLiquidacion.modified) {
                await client.query(
                    `UPDATE cua_liqui SET concepto = $1, forma_pago = $2, importe = $3 
                    WHERE id_cua = $4 AND no_pedimento = $5`,
                    [item.concepto, item.formaPago, item.importe, item.id_cua, no_pedimento]
                );
            }
        }

        if (data.cuadroLiquidacion?.removed?.length > 0) {
            for (const idCua of data.cuadroLiquidacion.removed) {
                await client.query(
                    "DELETE FROM cua_liqui WHERE id_cua = $1 AND no_pedimento = $2",
                    [idCua, no_pedimento]
                );
            }
        }

        if (data.seccion1) {
            await client.query(
                `UPDATE encabezado_p_pedimento 
                 SET 
                     regimen = $1,
                     des_ori = $2,
                     tipo_cambio = $3,
                     peso_bruto = $4,
                     aduana_e_s = $5,
                     medio_transpo = $6,
                     medio_transpo_arri = $7,
                     medio_transpo_sali = $8,
                     valor_dolares = $9,
                     valor_aduana = $10,
                     precio_pagado = $11,
                     rfc_import_export = $12,
                     curp_import_export = $13,
                     razon_so_im_ex = $14,
                     domicilio_im_ex = $15,
                     val_seguros = $16,
                     seguros = $17,
                     fletes = $18,
                     embalajes = $19,
                     otros_incremen = $20,
                     transpo_decremen = $21,
                     seguro_decremen = $22,
                     carga_decemen = $23,
                     desc_decremen = $24,
                     otro_decremen = $25,
                     acuse_electroni_val = $26,
                     codigo_barra = $27,
                     clv_sec_edu_despacho = $28,
                     total_bultos = $29,
                     fecha_en = $30,
                     feca_sal = $31
                 WHERE no_pedimento = $32`,
                [
                    data.seccion1.regimen, data.seccion1.des_ori, data.seccion1.tipo_cambio, 
                    data.seccion1.peso_bruto, data.seccion1.aduana_e_s, data.seccion1.medio_transpo,
                    data.seccion1.medio_transpo_arri, data.seccion1.medio_transpo_sali, 
                    data.seccion1.valor_dolares, data.seccion1.valor_aduana, data.seccion1.precio_pagado,
                    data.seccion1.rfc_import_export, data.seccion1.curp_import_export, 
                    data.seccion1.razon_so_im_ex, data.seccion1.domicilio_im_ex, data.seccion1.val_seguros,
                    data.seccion1.seguros, data.seccion1.fletes, data.seccion1.embalajes, 
                    data.seccion1.otros_incremen, data.seccion1.transpo_decremen, 
                    data.seccion1.seguro_decremen, data.seccion1.carga_decemen, 
                    data.seccion1.desc_decremen, data.seccion1.otro_decremen, 
                    data.seccion1.acuse_electroni_val, data.seccion1.codigo_barra, 
                    data.seccion1.clv_sec_edu_despacho, data.seccion1.total_bultos, 
                    data.seccion1.fecha_en, data.seccion1.feca_sal, 
                    no_pedimento
                ]
            );
            
        }
        
        if (data.seccion2) {
            await client.query(
                `UPDATE encabezado_sec_pedimento 
                 SET rfc_import_export = $1, curp_import_export = $2 
                 WHERE no_pedimento = $3`,
                [data.seccion2.rfc_import_export, data.seccion2.curp_import_export, no_pedimento]
            );
        }
        
        if (data.seccion3) {
            await client.query(
                `UPDATE datos_proveedor_comprador 
                 SET id_fiscal = $1, nom_razon_social = $2, domicilio = $3, vinculacion = $4, 
                     no_cfdi = $5, fecha_factu = $6, incoterm = $7, moneda_fact = $8, val_mon_fact = $9, 
                     factor_mon_fact = $10, val_dolares = $11 
                 WHERE no_pedimento = $12`,
                [
                    data.seccion3.id_fiscal, data.seccion3.nom_razon_social, data.seccion3.domicilio, 
                    data.seccion3.vinculacion, data.seccion3.no_cfdi, data.seccion3.fecha_factu, 
                    data.seccion3.incoterm, data.seccion3.moneda_fact, data.seccion3.val_mon_fact, 
                    data.seccion3.factor_mon_fact, data.seccion3.val_dolares, no_pedimento
                ]
            );
        }
        
        if (data.seccion4) {
            await client.query(
                `UPDATE datos_d 
                 SET id_fiscal = $1, nom_d_d = $2, dom_d_d = $3 
                 WHERE no_pedimento = $4`,
                [data.seccion4.id_fiscal, data.seccion4.nom_d_d, data.seccion4.dom_d_d, no_pedimento]
            );
        }
        
        if (data.seccion5) {
            await client.query(
                `UPDATE datos_transport 
                 SET identificacion = $1, pais = $2, transportista = $3, rfc_transportista = $4, 
                     curp_transportista = $5, domicilio_transportista = $6 
                 WHERE no_pedimento = $7`,
                [
                    data.seccion5.identificacion, data.seccion5.pais, data.seccion5.transportista, 
                    data.seccion5.rfc_transportista, data.seccion5.curp_transportista, data.seccion5.domicilio_transportista, 
                    no_pedimento
                ]
            );
        }
        
        if (data.seccion6) {
            await client.query(
                `UPDATE candados 
                 SET numero_candado = $1, revision1 = $2, revision2 = $3 
                 WHERE no_pedimento = $4`,
                [data.seccion6.numero_candado, data.seccion6.revision1, data.seccion6.revision2, no_pedimento]
            );
        }
        
        await client.query(
            `INSERT INTO historial_cambios (id_user,no_pedimento, des_ori, fecha_hora)
             VALUES ($1, $2, $3, $4)`,
            [data.id_usuario,no_pedimento, data.nombre_usuario , new Date()]
        );

        await client.query("COMMIT"); // Confirmar la transacción

        return res.status(200).json({ message: "Pedimento actualizado exitosamente." });

    } catch (error) {
        await client.query("ROLLBACK"); // Revertir la transacción en caso de error
        console.error("Error al editar pedimento:", error);
        return res.status(500).json({ error: "Error al editar el pedimento" });
    } finally {
        client.release(); // Liberar el cliente de la base de datos
    }
};

export const activoFijo = async (req, res) => {
    //const data = req.query;
    //console.log("Datos recibidos:", JSON.stringify(data, null, 2));
    const { id_empresa, id_domicilio} = req.query;
    if (!id_empresa || !id_domicilio) {
        return res.status(400).json({ message: "Faltan parámetros requeridos." });
    }
    try {
        const { rows } = await pool.query(`
            SELECT 
                id_activo_fijo_interno, nombre, fraccion_arancelaria, ubi_interna, descripcion, no_pedimento
            FROM 
                activo_fijo
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

export const verPedimento = async (req, res) => {
    try {
        //const data = req.query;
        //console.log("Datos recibidos:", JSON.stringify(data, null, 2));
        
        const { id_empresa, id_domicilio } = req.query;
        const query = `
        SELECT 
            p.no_pedimento, 
            p.tipo_oper,
            TO_CHAR(e.fecha_en, 'YYYY-MM-DD') AS fecha_en
        FROM 
            pedimento p
        JOIN 
            pedimento_encabezado e ON p.no_pedimento = e.no_pedimento
        WHERE 
            p.id_empresa = $1 
        AND p.id_domicilio = $2;
        `;
        const values = [id_empresa, id_domicilio];
        const { rows } = await pool.query(query, values);
        res.json(rows);
        
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

export const verDomicilios = async (req, res) => {
    try {
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ error: "El parámetro id_empresa es obligatorio" });
        }

        const query = `
            SELECT 
                id_domicilio, 
                texto
            FROM domicilio
            WHERE id_empresa = $1;
        `;
        const values = [id_empresa];
        const { rows } = await pool.query(query, values);
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener domicilios:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

export const consultaPedimento = async (req, res) => {
    const { no_pedimento } = req.params;
    let client;
    try {
        client = await pool.connect();
        const pedimentoQuery = `SELECT * FROM pedimento WHERE no_pedimento = $1;`;
        const pedimentoResult = await client.query(pedimentoQuery, [no_pedimento]);

        if (pedimentoResult.rows.length === 0) {
            return res.status(404).json({ message: "No se encontró el pedimento" });
        }

        const pedimento = pedimentoResult.rows[0];
        // Obtener datos de encabezado_p_pedimento
        const encabezadoQuery = `SELECT * FROM encabezado_p_pedimento WHERE no_pedimento = $1;`;
        const encabezadoResult = await client.query(encabezadoQuery, [no_pedimento]);
        // Obtener datos de encabezado_sec_pedimento
        const encabezadoSecQuery = `SELECT * FROM encabezado_sec_pedimento WHERE no_pedimento = $1;`;
        const encabezadoSecResult = await client.query(encabezadoSecQuery, [no_pedimento]);
        // Obtener datos de datos_proveedor_comprador
        const proveedorQuery = `SELECT * FROM datos_proveedor_comprador WHERE no_pedimento = $1;`;
        const proveedorResult = await client.query(proveedorQuery, [no_pedimento]);
        // Obtener datos de datos_d (Destinatarios)
        const destinatariosQuery = `SELECT * FROM datos_d WHERE no_pedimento = $1;`;
        const destinatariosResult = await client.query(destinatariosQuery, [no_pedimento]);
        // Obtener datos de datos_transport
        const transportQuery = `SELECT * FROM datos_transport WHERE no_pedimento = $1;`;
        const transportResult = await client.query(transportQuery, [no_pedimento]);
        // Obtener datos de candados
        const candadosQuery = `SELECT * FROM candados WHERE no_pedimento = $1;`;
        const candadosResult = await client.query(candadosQuery, [no_pedimento]);
        // Obtener partidas
        const partidasQuery = `SELECT * FROM partidas WHERE no_pedimento = $1;`;
        const partidasResult = await client.query(partidasQuery, [no_pedimento]);
        // Obtener contribuciones de cada partida
        const partidasContribuciones = [];
        for (const partida of partidasResult.rows) {
            const contribucionQuery = `SELECT * FROM parti_contr WHERE id_partida = $1;`;
            const contribucionResult = await client.query(contribucionQuery, [partida.id_partida]);
            partidasContribuciones.push({ ...partida, contribuciones: contribucionResult.rows });
        }
        // Obtener tasas a nivel de pedimento
        const contribucionesQuery = `SELECT * FROM tasa_pedi WHERE no_pedimento = $1;`;
        const contribucionesResult = await client.query(contribucionesQuery, [no_pedimento]);
        // Obtener cuadros de liquidación
        const cuadroLiquidacionQuery = `SELECT * FROM cua_liqui WHERE no_pedimento = $1;`;
        const cuadroLiquidacionResult = await client.query(cuadroLiquidacionQuery, [no_pedimento]);
        // Obtener totales
        const totalesQuery = `SELECT * FROM totales WHERE no_pedimento = $1;`;
        const totalesResult = await client.query(totalesQuery, [no_pedimento]);
        // Construcción de respuesta
        const resultado = {
            pedimento,
            encabezado: encabezadoResult.rows[0] || null,
            encabezado_sec: encabezadoSecResult.rows[0] || null,
            proveedor: proveedorResult.rows[0] || null,
            destinatarios: destinatariosResult.rows[0],
            transportes: transportResult.rows[0],
            candados: candadosResult.rows[0],
            partidas: partidasContribuciones,
            contribuciones: contribucionesResult.rows,
            cuadroLiquidacion: cuadroLiquidacionResult.rows,
            totales: totalesResult.rows[0] || null
        };
        res.json(resultado);
    } catch (error) {
        console.error("Error al consultar el pedimento:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        if (client) client.release();
    }
};

export const pedimentoAf = async (req,res) => { 
    //const data = req.query;
    //console.log("Datos recibidos:", JSON.stringify(data, null, 2));
    const { id_empresa, id_domicilio} = req.query;
        if (!id_empresa || !id_domicilio) {
        return res.status(400).json({ message: "Faltan parámetros requeridos." });
    }
    try {
        const { rows } = await pool.query(`
            SELECT 
                no_pedimento
            FROM 
                pedimento
            WHERE 
                id_empresa = $1 
                AND 
                id_domicilio = $2
                AND
                clave_ped = 'AF'
            `,[id_empresa,id_domicilio]);
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}