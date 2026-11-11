// =====================================================================
// CAPA INTERFACES · Panel de inicio
// GET /api/v1/panel?dias=30  (todos los roles, con token)
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const { requiereToken } = require('../../../shared/middlewares/auth.middleware');
const { exito } = require('../../../shared/utils/respuesta');
const PgPanelRepository = require('../infrastructure/PgPanelRepository');
const ObtenerPanel = require('../application/ObtenerPanel');

const obtenerPanel = new ObtenerPanel(new PgPanelRepository(pool));

// Controlador corto: es una sola ruta de consulta.
async function panel(req, res, next) {
  try {
    const datos = await obtenerPanel.ejecutar(req.usuario, req.query.dias || 30);
    return exito(res, 'Panel de inicio.', datos);
  } catch (error) {
    return next(error);
  }
}

const router = express.Router();
router.get('/panel', requiereToken, panel);

module.exports = router;
