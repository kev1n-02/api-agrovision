// =====================================================================
// CAPA INTERFACES · Rutas de parcelas (todas requieren token)
// Se monta en app.js como /api/v1, porque usa dos rutas base:
//   /fincas/:fincaId/parcelas  → parcelas de una finca
//   /parcelas/:id              → una parcela concreta
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const { requiereToken, permitirRoles } = require('../../../shared/middlewares/auth.middleware');

const PgFincaRepository = require('../../fincas/infrastructure/PgFincaRepository');
const PgParcelaRepository = require('../infrastructure/PgParcelaRepository');
const ParcelaCasosDeUso = require('../application/ParcelaCasosDeUso');
const ParcelaController = require('./parcela.controller');

// ---------- Armado de dependencias ----------
const controller = new ParcelaController(
  new ParcelaCasosDeUso(new PgParcelaRepository(pool), new PgFincaRepository(pool), new BitacoraRepository(pool)),
);

const puedeModificar = permitirRoles('ADMINISTRADOR', 'PRODUCTOR');

// ---------- Rutas ----------
const router = express.Router();

router.get('/fincas/:fincaId/parcelas', requiereToken, controller.listarPorFinca);
router.post('/fincas/:fincaId/parcelas', requiereToken, puedeModificar, controller.crear);
router.get('/parcelas/:id', requiereToken, controller.obtener);
router.put('/parcelas/:id', requiereToken, puedeModificar, controller.actualizar);
router.patch('/parcelas/:id/estado', requiereToken, puedeModificar, controller.cambiarEstado);

module.exports = router;
