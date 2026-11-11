// =====================================================================
// CAPA INTERFACES · Consulta de la bitácora (solo ADMINISTRADOR)
// GET /api/v1/bitacora?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&usuarioId=2&accion=LOGIN&pagina=1&tamano=50
// Por defecto, los últimos 30 días.
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const { requiereToken, permitirRoles } = require('../../../shared/middlewares/auth.middleware');
const { exito } = require('../../../shared/utils/respuesta');
const { leerRango } = require('../../../shared/utils/rangoFechas');
const ConsultarBitacora = require('../application/ConsultarBitacora');

const consultar = new ConsultarBitacora(new BitacoraRepository(pool));

// Controlador corto: es una sola ruta de consulta.
async function listar(req, res, next) {
  try {
    const rango = leerRango(req.query.desde, req.query.hasta, 30);
    const resultado = await consultar.ejecutar(rango, req.query);
    return exito(res, `Bitácora del ${rango.desde} al ${rango.hasta}.`, resultado);
  } catch (error) {
    return next(error);
  }
}

const router = express.Router();
router.get('/bitacora', requiereToken, permitirRoles('ADMINISTRADOR'), listar);

module.exports = router;
