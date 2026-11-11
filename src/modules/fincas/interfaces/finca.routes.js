// =====================================================================
// CAPA INTERFACES · Rutas de fincas (todas requieren token)
// Se monta en app.js como /api/v1/fincas
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const { requiereToken, permitirRoles } = require('../../../shared/middlewares/auth.middleware');

const PgFincaRepository = require('../infrastructure/PgFincaRepository');
const FincaCasosDeUso = require('../application/FincaCasosDeUso');
const FincaController = require('./finca.controller');

// ---------- Armado de dependencias ----------
const controller = new FincaController(
  new FincaCasosDeUso(new PgFincaRepository(pool), new BitacoraRepository(pool)),
);

// El TECNICO solo consulta; crear y modificar es para ADMINISTRADOR y PRODUCTOR.
const puedeModificar = permitirRoles('ADMINISTRADOR', 'PRODUCTOR');

// ---------- Rutas ----------
const router = express.Router();

router.get('/', requiereToken, controller.listar);
router.get('/:id', requiereToken, controller.obtener);
router.post('/', requiereToken, puedeModificar, controller.crear);
router.put('/:id', requiereToken, puedeModificar, controller.actualizar);
router.patch('/:id/estado', requiereToken, puedeModificar, controller.cambiarEstado);

module.exports = router;
