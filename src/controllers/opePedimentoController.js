import pool from "../config/db.js";
import { compareSync } from 'bcrypt';

export const envioPedimento = async (req, res) => {
    //const data = req.body;
    //console.log("Datos recibidos GARGA_PEDIMENTO:", JSON.stringify(data, null, 2));
    
    let client;
    try {
        // Conectar con la base de datos y comenzar transacción
        client = await pool.connect();
        
        await client.query("BEGIN");

        // Desestructuración de datos recibidos
        const { id_usuario, id_empresa, id_domicilio, seccion1, seccion2, seccion3, seccion4, seccion5, seccion6, seccion7, contribuciones, CuadroLiquidacion, } = req.body;


        //|||||||||||||||||||||||||||||
        //|||||||PEDIMENTO IMP|||||||||
        //|||||||||||||||||||||||||||||
        if(seccion1.tipoOperacion === "IMP"){
            //Verifica si existen las fracciones en los materiales
            const { rows:rowsfra } = await pool.query (`
                SELECT 
                    fraccion_arancelaria, subd 
                FROM 
                    material 
                WHERE 
                    id_empresa = $1 
                    AND 
                    id_domicilio = $2
            `,[id_empresa,id_domicilio]);

            // Crear Set con fraccion + subd para comparar rápido
            const fraccionesDB = new Set(
                rowsfra.map(item => `${item.fraccion_arancelaria}-${item.subd}`)
            );
            // Buscar cuáles no existen
            const noEncontradas = [];
            for (const fraccionPartida of seccion7) {
                const clave = `${fraccionPartida.fraccion}-${fraccionPartida.Subd}`;

                if (!fraccionesDB.has(clave)) {
                    noEncontradas.push({
                        fraccion: fraccionPartida.fraccion,
                        subd: fraccionPartida.Subd,
                        sec: fraccionPartida.sec
                    });
                }
            }
            // Si hay faltantes, detener proceso
            if (noEncontradas.length > 0) {
                return res.status(400).json({
                    error: "Hay fracciones no registradas en material",
                    detalle: noEncontradas
                });
            }


            
            // **Insertar en pedimento (tabla principal)**
            const pedimentoQuery = `
                INSERT INTO pedimento (no_pedimento, tipo_oper, clave_ped, id_empresa, id_usuario, fecha_hora,id_domicilio)
                VALUES ($1, $2, $3, $4, $5, NOW(),$6)
                RETURNING no_pedimento;
            `;
            const pedimentoValues = [
                seccion1.noPedimento,
                seccion1.tipoOperacion,
                seccion1.clavePedi,
                id_empresa,
                id_usuario,
                id_domicilio
            ];
            // Se inserta el pedimento y se obtiene el no_pedimento insertado

            const { rows } = await client.query(pedimentoQuery, pedimentoValues);
            const insertedNoPedimento = rows[0].no_pedimento;
            const clave_pedimento = seccion1.clavePedi;
            // **Verificación del pedimento insertado**
            if (!insertedNoPedimento) {
                throw new Error("No se pudo obtener el no_pedimento. Cancelando transacción.");
            }

            // **Si el pedimento se insertó correctamente, se procede con el resto de tablas**
            //console.log("Pedimento insertado correctamente con no_pedimento:", insertedNoPedimento);

            const encaPQuery = `
                    INSERT INTO pedimento_encabezado (
                    no_pedimento, regimen, des_ori, tipo_cambio, peso_bruto, aduana_e_s, medio_transpo, 
                    medio_transpo_arri, medio_transpo_sali, valor_dolares, valor_aduana, precio_pagado,
                    rfc_import_export, curp_import_export, razon_so_im_ex, domicilio_im_ex, val_seguros,
                    seguros, fletes, embalajes, otros_incremen, transpo_decremen, seguro_decremen, carga_decemen,
                    desc_decremen, otro_decremen, acuse_electroni_val, codigo_barra, clv_sec_edu_despacho,
                    total_bultos, fecha_en, feca_sal)
                    VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 
                        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
                        RETURNING *;
                    `;
            //seccion 1
            const encaPValues = [
                insertedNoPedimento,
                seccion1.regimen,
                seccion1.dest_ori || 0,
                seccion1.tipoCambio,
                seccion1.pesoBruto,
                seccion1.aduanaES,
                seccion1.m_trans,
                seccion1.m_trans_arr,
                seccion1.m_trans_sa,
                seccion1.valorDolares,
                seccion1.valorAduana,
                seccion1.precioPagado,
                seccion1.rfc_impo_expo,
                seccion1.curp_impo_expo,
                seccion1.razonSocial,
                seccion1.domImpoExpo,
                seccion1.valSeguros,
                seccion1.seguros,
                seccion1.fletes,
                seccion1.embalajes,
                seccion1.otrosInc,
                seccion1.transDecre,
                seccion1.transDecre,
                seccion1.cargaDecre,
                seccion1.descargaDecre,
                seccion1.otrosDecre,
                seccion1.acuseEle,
                seccion1.codigoBarras,
                seccion1.claveSecAdu,
                seccion1.marcas,
                seccion1.fechaEntrada,
                seccion1.fechaSalida,
            ];
            //seccion 2
            const encaSecQuery = `
                    INSERT INTO encabezado_sec_pedimento (
                        rfc_import_export, curp_import_export, no_pedimento)
                        VALUES (
                        $1, $2, $3)
                        RETURNING *;
                    `;
            const encaSecValues = [
                seccion2.rfcImportador,
                seccion2.curpImpo,
                insertedNoPedimento,
            ];
            //seccion 3
            const datosProveComQuery = `
                    INSERT INTO datos_proveedor_comprador (
                        id_fiscal, nom_razon_social, domicilio, vinculacion, no_cfdi, fecha_factu, incoterm, moneda_fact, val_mon_fact, factor_mon_fact, val_dolares, no_pedimento)
                        VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                        RETURNING *;
                    `;
            const datosProveComValues = [
                seccion3.idFiscalSec3,
                seccion3.razonSocialImpoExpo,
                seccion3.DomSec3,
                seccion3.Vinculacion,
                seccion3.numCDFI,
                seccion3.fechaSec3,
                seccion3.INCOTERM,
                seccion3.moneadaFact,
                seccion3.valMonFact,
                seccion3.factorMonFact,
                seccion3.valDolares,
                insertedNoPedimento,
            ];
            //seccion 4
            const datosDestiQuery = `
                    INSERT INTO datos_d (
                        id_fiscal, nom_d_d, dom_d_d, no_pedimento)
                        VALUES (
                        $1, $2, $3, $4)
                        RETURNING *;
                    `;
            const datosDestiValues = [
                seccion4.idFiscalSec4,
                seccion4.razonSocialImpoExpoSec4,
                seccion4.DomSec4,
                insertedNoPedimento
            ];
            //seccion 5
            const datosTransQuery = `
                    INSERT INTO datos_transport (
                        identificacion, pais, transportista, rfc_transportista, curp_transportista, domicilio_transportista, no_pedimento)
                        VALUES (
                        $1, $2, $3, $4, $5, $6, $7)
                        RETURNING *;
                    `;
            const datosTransValue = [
                seccion5.identifiSec5,
                seccion5.paisSec5,
                seccion5.transSec5,
                seccion5.rfcSec5,
                seccion5.curpSec5,
                seccion5.domSec5,
                insertedNoPedimento
            ];
            //seccion 6
            const candadosQuery = `
                    INSERT INTO candados (
                        numero_candado, revision1, revision2, no_pedimento)
                        VALUES (
                        $1, $2, $3, $4)
                        RETURNING *;
                    `;
            const candadosValue = [
                seccion6.numCandado,
                seccion6.rev1,
                seccion6.rev2,
                insertedNoPedimento
            ];
            //seccion 7
            const sumaFraccion = 0;

            if (seccion7 && seccion7.length > 0) {
                for (const seccion of seccion7) {
                    // Consulta para insertar en la tabla 'partidas'
                    const seccion7Query = `
                        INSERT INTO partida (
                            no_pedimento, sec, fraccion, subd, vinc, met_val, id_umc, cantidad_umc, id_umt, 
                            cantidad_umt, pvc, pod, descripcion, valor_aduana, imp_precio_pag, precio_unit, 
                            val_agreg, marca, modelo, codigo_produ, obser
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                        RETURNING id_partida;
                    `;
            
                    // Valores a insertar en 'partidas'
                    const seccion7Values = [
                        insertedNoPedimento, 
                        seccion.sec, 
                        seccion.fraccion || null, 
                        seccion.Subd || null, 
                        seccion.vinc || null, 
                        seccion.MetS7P || null,
                        seccion.UMCS7P || null, 
                        seccion.CantiUMCS7P || null, 
                        seccion.UMTS7P || null, 
                        seccion.CantiUMTS7P || null,
                        seccion.PVCS7P || null, 
                        seccion.PODS7P || null, 
                        seccion.DescS7P || null, 
                        seccion.VALADUS7P || null, 
                        seccion.IMPOPRES7P || null, 
                        seccion.PRECIOUNITS7P || null, 
                        seccion.VALAGRES7P || null, 
                        seccion.MarcaS7P || null, 
                        seccion.ModeloS7P || null, 
                        seccion.CodigoProS7P || null, 
                        seccion.ObserS7P || null
                    ];
            
                    // Verificar datos antes de la inserción
                    //console.log("Consulta INSERT partidas:", seccion7Query);
                    //console.log("Valores INSERT partidas:", seccion7Values);
            
                    // Insertar la partida en la base de datos
                    const seccion7Result = await client.query(seccion7Query, seccion7Values);
                    
                    //Insertar los datos en SALDO

                    const saldoQuery = `
                        INSERT INTO saldo (no_pedimento, cantidad, fraccion, fecha_sal)
                        VALUES ($1,$2,$3,$4)
                        RETURNING id_saldo;
                    `;
                    const saldoValues = [
                        insertedNoPedimento, 
                        seccion.CantiUMTS7P,
                        seccion.fraccion,
                        seccion1.fechaSalida,
                    ];
                    const saldoResult = await client.query(saldoQuery,saldoValues);

                    // Verificar si se obtuvo un ID válido
                    if (!seccion7Result.rows || seccion7Result.rows.length === 0) {
                        console.error("❌ Error: No se obtuvo un id_partida después de la inserción.");
                        continue; // Saltar esta iteración si no hay id_partida
                    }
            
                    const id_partida = seccion7Result.rows[0].id_partida;
                    //console.log("ID de partida insertado:", id_partida);
            
                    // Si hay contribuciones asociadas a esta partida
                    if (seccion.contributions && seccion.contributions.length > 0) {
                        const contribucionesValues = [];
                        const placeholders = [];
            
                        seccion.contributions.forEach((contribucion, index) => {
                            const offset = index * 6;
                            placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
                            contribucionesValues.push(
                                contribucion.con || null, 
                                contribucion.tasa || 0, 
                                contribucion.tt || null, 
                                contribucion.fp || null, 
                                contribucion.importe || 0,
                                id_partida
                            );
                        });
            
                        const contribucionesQuery = `
                            INSERT INTO tributo_partida (contribucion, clave_tasa, tasa, f_p, importe, id_partida)
                            VALUES ${placeholders.join(", ")};
                        `;
            
                        //console.log("Consulta INSERT contribuciones:", contribucionesQuery);
                        //console.log("Valores INSERT contribuciones:", contribucionesValues);
            
                        await client.query(contribucionesQuery, contribucionesValues);
                    }
                }
            }

            //Suma de fracciones
            const sumaQuery =`
            INSERT INTO suma (
                fracc, cant_total, fecha_ped, no_pedimento, estado)
                VALUES (
                $1, $2, $3, $4, $5)
                RETURNING *;
            `;
            const restaQuery = `
                INSERT INTO resta_suma_mu (fraccion,cant_restante,idd_suma,idd_mu) 
                VALUES ($1, $2, $3, $4)
            `;
            const sumaPorFraccion = new Map();
            for (const item of seccion7) {
                const fraccion = item.fraccion;
                const cantidad = Number(item.CantiUMCS7P) || 0;
                sumaPorFraccion.set(
                    fraccion,
                    (sumaPorFraccion.get(fraccion) || 0) + cantidad
                );
            }
            for (const [fraccion, total] of sumaPorFraccion) {

                const sumaResultado = await client.query(sumaQuery, [
                    fraccion,
                    total,
                    seccion1.fechaSalida,
                    insertedNoPedimento, 
                    1
                ]);

                const id_suma = sumaResultado.rows[0].id_suma;
                await client.query(restaQuery, [
                    fraccion,
                    total,
                    id_suma, 
                    0
                ]);
            }           

            //Tasas a nivel de pedimento
            if (contribuciones && contribuciones.length > 0) {
                const tasasValues = [];
                const placeholdersTasas = [];
            
                contribuciones.forEach((contribucion, index) => {
                    const offset = index * 4;
                    placeholdersTasas.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
                    tasasValues.push(
                        contribucion.contribucion,              
                        contribucion.clave,
                        contribucion.tasa || 0,
                        insertedNoPedimento
                    );
                });
            
                const tasasQuery = `
                    INSERT INTO tasa_pedi (contribucion, cv_t_tasa, tasa, no_pedimento)
                    VALUES ${placeholdersTasas.join(", ")};
                `;
            
                await client.query(tasasQuery, tasasValues);
            }
            //Cuadros de Liquidacion
            if (CuadroLiquidacion && CuadroLiquidacion.length > 0) {
                const cuadroLiQuery = `
                    INSERT INTO cuadro_liquidacion (
                        concepto, forma_pago, importe, no_pedimento
                    ) VALUES ($1, $2, $3, $4);
                `;

                for (const cuadroLi of CuadroLiquidacion) {
                    const cuadroLiValues = [
                        cuadroLi.concepto,             
                        cuadroLi.formaPago || 0,
                        cuadroLi.importe || 0,
                        insertedNoPedimento
                    ];
                    await client.query(cuadroLiQuery, cuadroLiValues);
                }
            }
            const totalesQuery = `
                    INSERT INTO totales_pedimento (
                        efectivo, otros, total, no_pedimento)
                        VALUES (
                        $1, $2, $3, $4)
                        RETURNING *;
                    `;
            const totalesValues = [
                seccion1.efec,
                seccion1.otros,
                seccion1.total,
                insertedNoPedimento
            ];

            const encaPPush = await client.query(encaPQuery, encaPValues); 
            const encaSecPush = await client.query(encaSecQuery, encaSecValues);
            const datosProveComPush = await client.query(datosProveComQuery, datosProveComValues);
            const datosDestiPush = await client.query(datosDestiQuery, datosDestiValues);
            const datosTransPush = await client.query(datosTransQuery, datosTransValue);
            const candadosPush = await client.query(candadosQuery, candadosValue);
            const totalesPush = await client.query(totalesQuery, totalesValues);

            // **Confirmar la transacción**
            await client.query("COMMIT");

            console.log("Pedimento y datos relacionados insertados correctamente");
            res.status(201).json({ message: "Pedimento insertado correctamente", no_pedimento: insertedNoPedimento });
        }
        //|||||||||||||||||||||||||||||
        //|||||||PEDIMENTO EXP|||||||||
        //|||||||||||||||||||||||||||||
        if(seccion1.tipoOperacion === "EXP"){
            
            // **Insertar en pedimento (tabla principal)**
            const pedimentoQuery = `
                INSERT INTO pedimento (no_pedimento, tipo_oper, clave_ped, id_empresa, id_usuario, fecha_hora,id_domicilio)
                VALUES ($1, $2, $3, $4, $5, NOW(),$6)
                RETURNING no_pedimento;
            `;
            const pedimentoValues = [
                seccion1.noPedimento,
                seccion1.tipoOperacion,
                seccion1.clavePedi,
                id_empresa,
                id_usuario,
                id_domicilio
            ];
            // Se inserta el pedimento y se obtiene el no_pedimento insertado

            const { rows } = await client.query(pedimentoQuery, pedimentoValues);
            const insertedNoPedimento = rows[0].no_pedimento;
            // **Verificación del pedimento insertado**
            if (!insertedNoPedimento) {
                throw new Error("No se pudo obtener el no_pedimento. Cancelando transacción.");
            }

            // **Si el pedimento se insertó correctamente, se procede con el resto de tablas**
            //console.log("Pedimento insertado correctamente con no_pedimento:", insertedNoPedimento);

            const encaPQuery = `
                    INSERT INTO pedimento_encabezado (
                    no_pedimento, regimen, des_ori, tipo_cambio, peso_bruto, aduana_e_s, medio_transpo, 
                    medio_transpo_arri, medio_transpo_sali, valor_dolares, valor_aduana, precio_pagado,
                    rfc_import_export, curp_import_export, razon_so_im_ex, domicilio_im_ex, val_seguros,
                    seguros, fletes, embalajes, otros_incremen, transpo_decremen, seguro_decremen, carga_decemen,
                    desc_decremen, otro_decremen, acuse_electroni_val, codigo_barra, clv_sec_edu_despacho,
                    total_bultos, fecha_en, feca_sal)
                    VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 
                        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
                        RETURNING *;
                    `;
            //seccion 1
            const encaPValues = [
                insertedNoPedimento,
                seccion1.regimen,
                seccion1.dest_ori || 0,
                seccion1.tipoCambio,
                seccion1.pesoBruto,
                seccion1.aduanaES,
                seccion1.m_trans,
                seccion1.m_trans_arr,
                seccion1.m_trans_sa,
                seccion1.valorDolares,
                seccion1.valorAduana,
                seccion1.precioPagado,
                seccion1.rfc_impo_expo,
                seccion1.curp_impo_expo,
                seccion1.razonSocial,
                seccion1.domImpoExpo,
                seccion1.valSeguros,
                seccion1.seguros,
                seccion1.fletes,
                seccion1.embalajes,
                seccion1.otrosInc,
                seccion1.transDecre,
                seccion1.transDecre,
                seccion1.cargaDecre,
                seccion1.descargaDecre,
                seccion1.otrosDecre,
                seccion1.acuseEle,
                seccion1.codigoBarras,
                seccion1.claveSecAdu,
                seccion1.marcas,
                seccion1.fechaEntrada,
                seccion1.fechaSalida,
            ];
            //seccion 2
            const encaSecQuery = `
                    INSERT INTO encabezado_sec_pedimento (
                        rfc_import_export, curp_import_export, no_pedimento)
                        VALUES (
                        $1, $2, $3)
                        RETURNING *;
                    `;
            const encaSecValues = [
                seccion2.rfcImportador,
                seccion2.curpImpo,
                insertedNoPedimento,
            ];
            //seccion 3
            const datosProveComQuery = `
                    INSERT INTO datos_proveedor_comprador (
                        id_fiscal, nom_razon_social, domicilio, vinculacion, no_cfdi, fecha_factu, incoterm, moneda_fact, val_mon_fact, factor_mon_fact, val_dolares, no_pedimento)
                        VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                        RETURNING *;
                    `;
            const datosProveComValues = [
                seccion3.idFiscalSec3,
                seccion3.razonSocialImpoExpo,
                seccion3.DomSec3,
                seccion3.Vinculacion,
                seccion3.numCDFI,
                seccion3.fechaSec3,
                seccion3.INCOTERM,
                seccion3.moneadaFact,
                seccion3.valMonFact,
                seccion3.factorMonFact,
                seccion3.valDolares,
                insertedNoPedimento,
            ];
            //seccion 4
            const datosDestiQuery = `
                    INSERT INTO datos_d (
                        id_fiscal, nom_d_d, dom_d_d, no_pedimento)
                        VALUES (
                        $1, $2, $3, $4)
                        RETURNING *;
                    `;
            const datosDestiValues = [
                seccion4.idFiscalSec4,
                seccion4.razonSocialImpoExpoSec4,
                seccion4.DomSec4,
                insertedNoPedimento
            ];
            //seccion 5
            const datosTransQuery = `
                    INSERT INTO datos_transport (
                        identificacion, pais, transportista, rfc_transportista, curp_transportista, domicilio_transportista, no_pedimento)
                        VALUES (
                        $1, $2, $3, $4, $5, $6, $7)
                        RETURNING *;
                    `;
            const datosTransValue = [
                seccion5.identifiSec5,
                seccion5.paisSec5,
                seccion5.transSec5,
                seccion5.rfcSec5,
                seccion5.curpSec5,
                seccion5.domSec5,
                insertedNoPedimento
            ];
            //seccion 6
            const candadosQuery = `
                    INSERT INTO candados (
                        numero_candado, revision1, revision2, no_pedimento)
                        VALUES (
                        $1, $2, $3, $4)
                        RETURNING *;
                    `;
            const candadosValue = [
                seccion6.numCandado,
                seccion6.rev1,
                seccion6.rev2,
                insertedNoPedimento
            ];
            //seccion 7
            const sumaFraccion = 0;



            if (seccion7 && seccion7.length > 0) {
                for (const seccion of seccion7) {
                    // Consulta para insertar en la tabla 'partidas'
                    const seccion7Query = `
                        INSERT INTO partida (
                            no_pedimento, sec, fraccion, subd, vinc, met_val, id_umc, cantidad_umc, id_umt, 
                            cantidad_umt, pvc, pod, descripcion, valor_aduana, imp_precio_pag, precio_unit, 
                            val_agreg, marca, modelo, codigo_produ, obser
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                        RETURNING id_partida;
                    `;
            
                    // Valores a insertar en 'partidas'
                    const seccion7Values = [
                        insertedNoPedimento, 
                        seccion.sec, 
                        seccion.fraccion || null, 
                        seccion.subd || null, 
                        seccion.vinc || null, 
                        seccion.MetS7P || null,
                        seccion.UMCS7P || null, 
                        seccion.CantiUMCS7P || null, 
                        seccion.UMTS7P || null, 
                        seccion.CantiUMTS7P || null,
                        seccion.PVCS7P || null, 
                        seccion.PODS7P || null, 
                        seccion.DescS7P || null, 
                        seccion.VALADUS7P || null, 
                        seccion.IMPOPRES7P || null, 
                        seccion.PRECIOUNITS7P || null, 
                        seccion.VALAGRES7P || null, 
                        seccion.MarcaS7P || null, 
                        seccion.ModeloS7P || null, 
                        seccion.CodigoProS7P || null, 
                        seccion.ObserS7P || null
                    ];
            
                    // Verificar datos antes de la inserción
                    //console.log("Consulta INSERT partidas:", seccion7Query);
                    //console.log("Valores INSERT partidas:", seccion7Values);
                    const seccion7Result = await client.query(seccion7Query, seccion7Values);
                    


                    // Verificar si se obtuvo un ID válido
                    if (!seccion7Result.rows || seccion7Result.rows.length === 0) {
                        console.error("❌ Error: No se obtuvo un id_partida después de la inserción.");
                        continue; // Saltar esta iteración si no hay id_partida
                    }
                    const id_partida = seccion7Result.rows[0].id_partida;
                    //console.log("ID de partida insertado:", id_partida);
            
                    // Si hay contribuciones asociadas a esta partida
                    if (seccion.contributions && seccion.contributions.length > 0) {
                        const contribucionesValues = [];
                        const placeholders = [];
            
                        seccion.contributions.forEach((contribucion, index) => {
                            const offset = index * 6;
                            placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
                            contribucionesValues.push(
                                contribucion.con || null, 
                                contribucion.tasa || 0, 
                                contribucion.tt || null, 
                                contribucion.fp || null, 
                                contribucion.importe || 0,
                                id_partida
                            );
                        });
            
                        const contribucionesQuery = `
                            INSERT INTO tributo_partida (contribucion, clave_tasa, tasa, f_p, importe, id_partida)
                            VALUES ${placeholders.join(", ")};
                        `;
            
                        //console.log("Consulta INSERT contribuciones:", contribucionesQuery);
                        //console.log("Valores INSERT contribuciones:", contribucionesValues);
            
                        await client.query(contribucionesQuery, contribucionesValues);
                    }
                }
            }

            //Tasas a nivel de pedimento
            if (contribuciones && contribuciones.length > 0) {
                const tasasValues = [];
                const placeholdersTasas = [];
            
                contribuciones.forEach((contribucion, index) => {
                    const offset = index * 4;
                    placeholdersTasas.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
                    tasasValues.push(
                        contribucion.contribucion,              
                        contribucion.clave,
                        contribucion.tasa || 0,
                        insertedNoPedimento
                    );
                });
            
                const tasasQuery = `
                    INSERT INTO tasa_pedi (contribucion, cv_t_tasa, tasa, no_pedimento)
                    VALUES ${placeholdersTasas.join(", ")};
                `;
            
                await client.query(tasasQuery, tasasValues);
            }
            //Cuadros de Liquidacion
            if (CuadroLiquidacion && CuadroLiquidacion.length > 0) {
                const cuadroLiQuery = `
                    INSERT INTO cuadro_liquidacion (
                        concepto, forma_pago, importe, no_pedimento
                    ) VALUES ($1, $2, $3, $4);
                `;

                for (const cuadroLi of CuadroLiquidacion) {
                    const cuadroLiValues = [
                        cuadroLi.concepto,             
                        cuadroLi.formaPago || 0,
                        cuadroLi.importe || 0,
                        insertedNoPedimento
                    ];
                    await client.query(cuadroLiQuery, cuadroLiValues);
                }
            }
            const totalesQuery = `
                    INSERT INTO totales_pedimento (
                        efectivo, otros, total, no_pedimento)
                        VALUES (
                        $1, $2, $3, $4)
                        RETURNING *;
                    `;
            const totalesValues = [
                seccion1.efec,
                seccion1.otros,
                seccion1.total,
                insertedNoPedimento
            ];



            //Verifica si existen las fracciones en los productos
            const { rows: rowsfra } = await pool.query(`
                SELECT 
                    id_producto,
                    fraccion_arancelaria,
                    subd
                FROM producto
                WHERE id_empresa = $1
                AND id_domicilio = $2
            `, [id_empresa, id_domicilio]);

            const desperdicioQuery = `
                INSERT INTO desperdicio
                (no_fraccion, fraccion, descrip, cantidad, tipo, subd)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;

            const materialUtilizadoQuery = `
                INSERT INTO material_utilizado
                (id_transformacion, id_material, cantidad)
                VALUES ($1, $2, $3)
                RETURNING id_uso
            `;

            const transformacionQuery = `
                INSERT INTO transformacion
                (id_producto, fecha_transformacion, cantidad, no_pedimento, sec_partida)
                VALUES ($1, NOW(), $2, $3, $4)
                RETURNING id_transformacion
            `;

            const productosMap = new Map(
                rowsfra.map(item => [
                    `${item.fraccion_arancelaria}-${item.subd}`,
                    item.id_producto
                ])
            );

            for (const fraccionPartida of seccion7) {
                const clave = `${fraccionPartida.fraccion}-${fraccionPartida.Subd}`;
                const cantidadFabricada = Number(fraccionPartida.CantiUMCS7P || 0);

                const idProducto = productosMap.get(clave);

                if (!idProducto) {
                    const desperdicioValues = [
                        insertedNoPedimento,
                        fraccionPartida.fraccion,
                        "Desperdicio o merma",
                        cantidadFabricada,
                        "Desperdicio",
                        fraccionPartida.Subd
                    ];

                    await client.query(desperdicioQuery, desperdicioValues);
                    continue;
                }

                // ✅ 1) Crear transformación 
                const { rows: transformacionRows } = await client.query(
                    transformacionQuery,
                    [
                        idProducto,
                        cantidadFabricada,
                        insertedNoPedimento,
                        fraccionPartida.sec
                    ]
                );

                const idTransformacion = transformacionRows[0].id_transformacion;

                // ✅ 2) Obtener materiales del BOM
                const { rows: materiales } = await client.query(`
                    SELECT 
                        b.id_material,
                        b.cantidad,
                        b.merma_por,
                        m.fraccion_arancelaria,
                        m.subd
                    FROM bom b
                    JOIN material m
                        ON m.id_material = b.id_material
                    WHERE b.id_producto = $1
                `, [idProducto]);

                for (const material of materiales) {
                    const cantidadBom = Number(material.cantidad || 0);
                    const mermaPor = Number(material.merma_por || 0);

                    const cantidadUsada = cantidadBom * cantidadFabricada;
                    const merma = cantidadUsada * (mermaPor / 100);
                    const totalMaterial = cantidadUsada + merma;
                    
                    // ✅ Guardar desperdicio
                    await client.query(desperdicioQuery, [
                        insertedNoPedimento,
                        fraccionPartida.fraccion,
                        `Material ${material.id_material} usado con merma ${mermaPor}%`,
                        merma,
                        "Merma BOM",
                        fraccionPartida.Subd
                    ]);


                    const { rows: muRows } = await client.query(
                        materialUtilizadoQuery,
                        [idTransformacion, material.id_material, totalMaterial]
                    );

                    const idMaterialUtilizado = muRows[0].id_uso;

                    await consumirMaterialFIFO(
                        client,
                        material.fraccion_arancelaria,
                        totalMaterial,
                        idMaterialUtilizado,
                        material.subd
                    );
                }
            }


            const encaPPush = await client.query(encaPQuery, encaPValues); 
            const encaSecPush = await client.query(encaSecQuery, encaSecValues);
            const datosProveComPush = await client.query(datosProveComQuery, datosProveComValues);
            const datosDestiPush = await client.query(datosDestiQuery, datosDestiValues);
            const datosTransPush = await client.query(datosTransQuery, datosTransValue);
            const candadosPush = await client.query(candadosQuery, candadosValue);
            const totalesPush = await client.query(totalesQuery, totalesValues);

            // **Confirmar la transacción**
            await client.query("COMMIT");
            console.log("Pedimento y datos relacionados insertados correctamente");
            res.status(201).json({ message: "Pedimento insertado correctamente", no_pedimento: insertedNoPedimento });
        }

        
    } catch (error) {
        if (client) await client.query("ROLLBACK");
        console.error("Error al insertar pedimento:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    
};

    async function consumirMaterialFIFO(
        client,
        fraccion,
        cantidadNecesaria,
        idMaterialUtilizado,
        subd
    ) {
        let restante = cantidadNecesaria;
        console.log("DatosRecibidos:", fraccion, subd);
        while (restante > 0) {
            // 1) Buscar saldo actual más reciente en RESTA
            const { rows: saldoRows } = await client.query(`
                SELECT idd_suma, cant_restante
                FROM resta_suma_mu
                WHERE fraccion = $1
                AND subd = $2
                ORDER BY id_resta DESC
                LIMIT 1
            `, [fraccion, subd]);

            let saldoActual = 0;
            let iddSuma = null;

            if (saldoRows.length > 0) {
                saldoActual = Number(saldoRows[0].cant_restante || 0);
                iddSuma = saldoRows[0].idd_suma;
            }

            // ✅ Caso 1: sí alcanza
            if (saldoActual >= restante) {
                const nuevoSaldo = saldoActual - restante;

                await client.query(`
                    INSERT INTO resta_suma_mu
                    (fraccion, cant_restante, idd_suma, idd_mu, subd)
                    VALUES ($1, $2, $3, $4, $5)
                `, [fraccion, nuevoSaldo, iddSuma, idMaterialUtilizado, subd]);

                restante = 0;
                break;
            }

            // ❌ Caso 2: no alcanza
            restante -= saldoActual;

            // marcar lote anterior agotado
            if (iddSuma) {
                await client.query(`
                    UPDATE suma
                    SET estado = 2
                    WHERE idd_suma = $1
                `, [iddSuma]);
            }

            // buscar siguiente lote FIFO
            const { rows: siguienteRows } = await client.query(`
                SELECT id_suma, cant_total
                FROM suma
                WHERE fracc = $1
                AND subd = $2
                AND estado = 'disponible'
                ORDER BY fecha_ped ASC
                LIMIT 1
            `, [fraccion, subd]);

            if (siguienteRows.length === 0) {
                throw new Error(`Sin inventario suficiente para ${fraccion}`);
            }

            const siguiente = siguienteRows[0];
            const nuevoSaldo = Number(siguiente.cant_total) - restante;

            if (nuevoSaldo < 0) {
                // consumir completamente este lote
                await client.query(`
                    UPDATE suma
                    SET estado = 2
                    WHERE id_suma = $1
                `, [siguiente.idd_suma]);

                restante = Math.abs(nuevoSaldo);
                continue;
            }

            // registrar nuevo saldo restante
            await client.query(`
                INSERT INTO resta_suma_mu
                (fraccion, cant_restante, idd_suma, idd_mu, subd)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                fraccion,
                nuevoSaldo,
                siguiente.idd_suma, 
                idMaterialUtilizado,
                subd
            ]);

            // si quedó en 0 -> agotado
            if (nuevoSaldo === 0) {
                await client.query(`
                    UPDATE suma
                    SET estado = 2
                    WHERE id_suma = $1
                `, [siguiente.id_suma]);
            }

            restante = 0;
        }
    }