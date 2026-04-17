import pool from "../config/db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";


export const entradaMercanciaReporteExcel = async (req, res) => {
    try {
        const { id_empresa, id_domicilio, fechaInicio, fechaFin } = req.query;
        if (!id_empresa || !id_domicilio) {
            return res.status(400).json({ error: "Faltan parámetros" });
        }

        // Consultar datos generales de la empresa
        const queryDatosGenerales = `
            SELECT 
                razon_social, 
                rfc,
                no_immex
            FROM 
                empresa
            WHERE 
                id_empresa = $1;
        `;
        const valuesDatosGenerales = [id_empresa];
        const { rows: datosGenerales } = await pool.query(queryDatosGenerales, valuesDatosGenerales);
        
        // Consultar domicilio
        const queryDom = `
            SELECT 
                texto
            FROM 
                domicilio
            WHERE 
                id_empresa = $1 AND id_tipo_domicilio = 1;
        `;
        const valuesDom = [id_empresa];
        const { rows: domicilioData } = await pool.query(queryDom, valuesDom);

        // Construcción dinámica del query con JOIN a partidas
        let query = `
            SELECT 
                p.no_pedimento, 
                p.clave_ped,
                TO_CHAR(e.feca_sal, 'YYYY-MM-DD') AS fecha_en,
                pa.fraccion,
                pa.cantidad_umc,
                pa.descripcion
            FROM 
                pedimento p
            JOIN pedimento_encabezado e ON p.no_pedimento = e.no_pedimento
            LEFT JOIN partida pa ON p.no_pedimento = pa.no_pedimento
            WHERE p.id_empresa = $1 
            AND p.id_domicilio = $2 
            AND p.tipo_oper = 'IMP'
        `;

        const values = [id_empresa, id_domicilio];
        // Agregar filtro de fechas si están presentes
        if (fechaInicio && fechaFin) {
            query += " AND e.fecha_en BETWEEN $3 AND $4";
            values.push(fechaInicio, fechaFin);
        }
        
        // Ordenar por número de pedimento para agrupar las partidas
        query += " ORDER BY p.no_pedimento, pa.fraccion";
        
        const { rows } = await pool.query(query, values);

        // Crear un libro de Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("EntradaMercancias");

        // Agregar datos generales en las primeras filas
        worksheet.addRow(["Empresa:", datosGenerales[0]?.razon_social || "N/A"]);
        worksheet.addRow(["RFC:", datosGenerales[0]?.rfc || "N/A"]);
        worksheet.addRow(["Número IMMEX:", datosGenerales[0]?.no_immex || "N/A"]);
        worksheet.addRow(["Domicilio:", domicilioData[0]?.texto || "N/A"]);
        worksheet.addRow([]); // Fila en blanco para separación

        // Definir encabezados de la tabla
        const headers = ["Pedimento", "Clave de pedimento", "Fecha", "Fracción", "Cantidad UMC", "Descripcion"];
        worksheet.addRow(headers).font = { bold: true };

        // Agregar filas con los datos de la tabla
        let currentPedimento = null;
        
        rows.forEach((row) => {
            // Si es un nuevo pedimento, mostramos todos sus datos
            if (row.no_pedimento !== currentPedimento) {
                worksheet.addRow([
                    row.no_pedimento, 
                    row.clave_ped, 
                    row.fecha_en,
                    row.fraccion || "N/A",
                    row.cantidad_umc || "N/A",
                    row.descripcion || "N/A"
                ]);
                currentPedimento = row.no_pedimento;
            } else {
                // Si es la misma pedimento pero con otra partida, solo mostramos los datos de la partida
                worksheet.addRow([
                    "", "", "",
                    row.fraccion || "N/A",
                    row.cantidad_umc || "N/A",
                    row.descripcion || "N/A"
                ]);
            }
        });

        // Configurar la respuesta para descarga
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=EntradaMercancias.xlsx"
        );

        // Enviar el archivo al cliente
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error al generar el archivo Excel:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
export const entradaMercanciaReportePDF = async (req, res) => {
    try {
        const { id_empresa, id_domicilio } = req.query;
        if (!id_empresa || !id_domicilio) {
            return res.status(400).json({ error: "Faltan parámetros" });
        }

        const query = `
            SELECT 
                p.no_pedimento, 
                p.clave_ped,
                TO_CHAR(e.fecha_en, 'YYYY-MM-DD') AS fecha_en
            FROM 
                pedimento p
            JOIN encabezado_p_pedimento e ON p.no_pedimento = e.no_pedimento
            WHERE p.id_empresa = $1 AND p.id_domicilio = $2 AND p.tipo_oper = 'IMP';
        `;
        const values = [id_empresa, id_domicilio];

        const { rows } = await pool.query(query, values);

        // Crear un nuevo documento PDF
        const doc = new PDFDocument();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=pedimentos.pdf");

        // Pipe del documento a la respuesta
        doc.pipe(res);

        doc.fontSize(16).text("Reporte de Pedimentos", { align: "center" });
        doc.moveDown();

        rows.forEach((row) => {
            doc.fontSize(12).text(`Pedimento: ${row.no_pedimento}`);
            doc.text(`Clave: ${row.clave_ped}`);
            doc.text(`Fecha: ${row.fecha_en}`);
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        console.error("Error al generar el PDF:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
export const salidaMercanciaReporteExcel = async (req, res) => {
    try {
        const { id_empresa, id_domicilio , fechaInicio, fechaFin } = req.query;
        if (!id_empresa || !id_domicilio) {
            return res.status(400).json({ error: "Faltan parámetros" });
        }
        // Consultar datos generales de la empresa
        const queryDatosGenerales = `
            SELECT 
                razon_social, 
                rfc_empresa,
                no_immex
            FROM 
                info_empresa
            WHERE 
                id_empresa = $1;
        `;
        const valuesDatosGenerales = [id_empresa];
        const { rows: datosGenerales } = await pool.query(queryDatosGenerales, valuesDatosGenerales);
        
        // Consultar domicilio
        const queryDom = `
            SELECT 
                domicilio
            FROM 
                domicilios
            WHERE 
                id_empresa = $1 AND tipo_de_domicilio = 1;
        `;
        const valuesDom = [id_empresa];
        const { rows: domicilioData } = await pool.query(queryDom, valuesDom);

        // Construcción dinámica del query
        let query = `
            SELECT 
                p.no_pedimento, 
                p.clave_ped,
                TO_CHAR(e.feca_sal, 'YYYY-MM-DD') AS fecha_en
            FROM 
                pedimento p
            JOIN encabezado_p_pedimento e ON p.no_pedimento = e.no_pedimento
            WHERE p.id_empresa = $1 
            AND p.id_domicilio = $2 
            AND p.tipo_oper = 'EXP'
        `;

        const values = [id_empresa, id_domicilio];
        // Agregar filtro de fechas si están presentes
        if (fechaInicio && fechaFin) {
            query += " AND e.fecha_en BETWEEN $3 AND $4";
            values.push(fechaInicio, fechaFin);
        }
        const { rows } = await pool.query(query, values);

        // Crear un libro de Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("SalidaMercancias");

        // **Agregar datos generales en las primeras filas**
        worksheet.addRow(["Empresa:", datosGenerales[0]?.razon_social || "N/A"]);
        worksheet.addRow(["RFC:", datosGenerales[0]?.rfc_empresa || "N/A"]);
        worksheet.addRow(["Número IMMEX:", datosGenerales[0]?.no_immex || "N/A"]);
        worksheet.addRow(["Domicilio:", domicilioData[0]?.domicilio || "N/A"]);
        worksheet.addRow([]); // Fila en blanco para separación

        // **Definir encabezados de la tabla**
        worksheet.addRow(["Pedimento", "Clave de pedimento", "Fecha"]).font = { bold: true };

        // **Agregar filas con los datos de la tabla**
        rows.forEach((row) => {
            worksheet.addRow([row.no_pedimento, row.clave_ped, row.fecha_en]);
        });

        // Configurar la respuesta para descarga
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=SalidaMercancias.xlsx"
        );

        // Enviar el archivo al cliente
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error al generar el archivo Excel:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
export const saldoMuestraReporteExcel = async (req, res) => {
    try {
        const { id_empresa, id_domicilio, selector } = req.query;

        if (!id_empresa || !id_domicilio || !selector) {
            return res.status(400).json({
                error: "Parámetros id_empresa, id_domicilio y selector son obligatorios"
            });
        }

        // ==========================
        // DATOS GENERALES
        // ==========================
        const queryDatosGenerales = `
            SELECT razon_social, rfc, no_immex
            FROM empresa
            WHERE id_empresa = $1;
        `;
        const { rows: datosGenerales } = await pool.query(queryDatosGenerales, [id_empresa]);

        const queryDom = `
            SELECT texto
            FROM domicilio
            WHERE id_empresa = $1 AND id_domicilio = $2;
        `;
        const { rows: domicilioData } = await pool.query(queryDom, [
            id_empresa,
            id_domicilio
        ]);

        // ==========================
        // PEDIMENTOS
        // ==========================
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
            return res.status(404).json({
                mensaje: "No se encontraron pedimentos"
            });
        }

        let resultados = [];

        for (const pedimentoRow of resultPedimentos.rows) {
            const no_pedimento = pedimentoRow.no_pedimento;

            // ======================================
            // SELECTOR 1 → Fracciones sin utilizar
            // ======================================
            if (Number(selector) === 1) {
                const fracciones = await pool.query(`
                    SELECT id_suma, fracc, subd, cant_total
                    FROM suma
                    WHERE no_pedimento = $1
                    AND estado = '1';
                `, [no_pedimento]);

                for (const row of fracciones.rows) {
                    const uso = await pool.query(`
                        SELECT 1
                        FROM resta_suma_mu
                        WHERE idd_suma = $1
                        LIMIT 1;
                    `, [row.id_suma]);

                    if (uso.rows.length === 0) {
                        resultados.push({
                            no_pedimento,
                            fraccion: `${row.fracc}-${row.subd}`,
                            cantidad: row.cant_total
                        });
                    }
                }
            }

            // ======================================
            // SELECTOR 2 → Fracciones agotadas
            // ======================================
            if (Number(selector) === 2) {
                const fracciones = await pool.query(`
                    SELECT fracc, subd
                    FROM suma
                    WHERE no_pedimento = $1
                    AND estado = '2';
                `, [no_pedimento]);

                fracciones.rows.forEach(row => {
                    resultados.push({
                        no_pedimento,
                        fraccion: `${row.fracc}-${row.subd}`
                    });
                });
            }

            // ======================================
            // SELECTOR 3 → Con saldo restante
            // ======================================
            if (Number(selector) === 3) {
                const fracciones = await pool.query(`
                    SELECT id_suma, fracc, subd
                    FROM suma
                    WHERE no_pedimento = $1
                    AND estado = '1';
                `, [no_pedimento]);

                for (const row of fracciones.rows) {
                    const saldo = await pool.query(`
                        SELECT cant_restante
                        FROM resta_suma_mu
                        WHERE idd_suma = $1
                        ORDER BY id_resta DESC
                        LIMIT 1;
                    `, [row.id_suma]);

                    if (saldo.rows.length > 0) {
                        resultados.push({
                            no_pedimento,
                            fraccion: `${row.fracc}-${row.subd}`,
                            cantidad: saldo.rows[0].cant_restante
                        });
                    }
                }
            }
        }

        // ==========================
        // CREAR EXCEL
        // ==========================
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Saldo");

        worksheet.addRow(["Empresa:", datosGenerales[0]?.razon_social || "N/A"]);
        worksheet.addRow(["RFC:", datosGenerales[0]?.rfc_empresa || "N/A"]);
        worksheet.addRow(["IMMEX:", datosGenerales[0]?.no_immex || "N/A"]);
        worksheet.addRow(["Domicilio:", domicilioData[0]?.domicilio || "N/A"]);
        worksheet.addRow([]);

        // Encabezados dinámicos
        let headers = ["No. Pedimento", "Fracción"];

        if (Number(selector) === 1) {
            headers.push("Cantidad Total");
        }

        if (Number(selector) === 3) {
            headers.push("Cantidad Restante");
        }

        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };

        // Datos
        resultados.forEach(row => {
            let data = [row.no_pedimento, row.fraccion];

            if (Number(selector) === 1 || Number(selector) === 3) {
                data.push(row.cantidad);
            }

            worksheet.addRow(data);
        });

        // Ajustar ancho automático
        worksheet.columns.forEach(column => {
            column.width = 25;
        });

        // Descargar
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=saldo_muestra.xlsx"
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error al generar Excel:", error);
        res.status(500).json({
            error: "Error interno del servidor"
        });
    }
};
export const mateUtilizadosReporteExcel = async (req, res) => {
    try {
        const { id_empresa, id_domicilio, fechaInicio, fechaFin } = req.query;

        if (!id_empresa || !id_domicilio || !fechaInicio || !fechaFin) {
            return res.status(400).json({
                error: "id_empresa, id_domicilio, fechaInicio y fechaFin son obligatorios"
            });
        }

        // ==========================
        // DATOS GENERALES
        // ==========================
        const { rows: datosGenerales } = await pool.query(`
            SELECT razon_social, rfc, no_immex
            FROM empresa
            WHERE id_empresa = $1;
        `, [id_empresa]);

        const { rows: domicilioData } = await pool.query(`
            SELECT texto
            FROM domicilio
            WHERE id_empresa = $1
            AND id_domicilio = $2;
        `, [id_empresa, id_domicilio]);

        // ==========================
        // QUERY PRINCIPAL
        // ==========================
        const query = `
            SELECT
                p.no_pedimento,
                TO_CHAR(p.fecha_hora, 'YYYY-MM-DD') AS fecha_pedimento,
                cp.id_transformacion,
                m.id_material,
                m.id_material_interno,
                m.nombre_interno,
                m.fraccion_arancelaria,
                m.subd,
                mu.cantidad
            FROM pedimento p
            INNER JOIN transformacion cp
                ON p.no_pedimento = cp.no_pedimento
            INNER JOIN material_utilizado mu
                ON cp.id_transformacion = mu.id_transformacion
            INNER JOIN material m
                ON mu.id_material = m.id_material
            WHERE p.id_empresa = $1
            AND p.id_domicilio = $2
            AND p.tipo_oper = 'EXP'
            AND p.fecha_hora BETWEEN $3 AND $4
            ORDER BY p.fecha_hora ASC, cp.id_transformacion ASC;
        `;

        const { rows } = await pool.query(query, [
            id_empresa,
            id_domicilio,
            fechaInicio,
            fechaFin
        ]);

        if (rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontraron materiales utilizados"
            });
        }

        // ==========================
        // CREAR EXCEL
        // ==========================
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("MaterialesUtilizados");

        worksheet.addRow(["Empresa:", datosGenerales[0]?.razon_social || "N/A"]);
        worksheet.addRow(["RFC:", datosGenerales[0]?.rfc_empresa || "N/A"]);
        worksheet.addRow(["Número IMMEX:", datosGenerales[0]?.no_immex || "N/A"]);
        worksheet.addRow(["Domicilio:", domicilioData[0]?.domicilio || "N/A"]);
        worksheet.addRow(["Periodo:", `${fechaInicio} a ${fechaFin}`]);
        worksheet.addRow([]);

        // encabezados
        const headerRow = worksheet.addRow([
            "No Pedimento",
            "Fecha Pedimento",
            "ID Transformación",
            "ID Material",
            "Material Interno",
            "Nombre",
            "Fracción",
            "SUBD",
            "Cantidad"
        ]);

        headerRow.font = { bold: true };

        // filas
        rows.forEach(row => {
            worksheet.addRow([
                row.no_pedimento,
                row.fecha_pedimento,
                row.id_transformacion,
                row.id_material,
                row.id_material_interno,
                row.nombre_interno,
                row.fraccion_arancelaria,
                row.subd,
                row.cantidad
            ]);
        });

        worksheet.columns.forEach(column => {
            column.width = 22;
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=MaterialesUtilizados.xlsx"
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error al generar Excel:", error);
        res.status(500).json({
            error: "Error interno del servidor"
        });
    }
};