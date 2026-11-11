// =====================================================================
// CAPA INTERFACES · Rutas de tratamientos y seguimientos (todas con token)
// Consultar: cualquier rol con acceso a la parcela.
// Crear y modificar: ADMINISTRADOR y TECNICO.
// Se monta en app.js como /api/v1.
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const { requiereToken, permitirRoles } = require('../../../shared/middlewares/auth.middleware');

const PgFincaRepository = require('../../fincas/infrastructure/PgFincaRepository');
const PgParcelaRepository = require('../../parcelas/infrastructure/PgParcelaRepository');
const AccesoParcela = require('../../parcelas/application/AccesoParcela');
const PgCatalogoRepository = require('../../catalogos/infrastructure/PgCatalogoRepository');
const PgDiagnosticoRepository = require('../../diagnosticos/infrastructure/PgDiagnosticoRepository');
const PgTratamientoRepository = require('../infrastructure/PgTratamientoRepository');
const TratamientoCasosDeUso = require('../application/TratamientoCasosDeUso');
const TratamientoController = require('./tratamiento.controller');

// ---------- Armado de dependencias ----------
const controller = new TratamientoController(
  new TratamientoCasosDeUso(
    new PgTratamientoRepository(pool),
    new PgDiagnosticoRepository(pool),
    new PgCatalogoRepository(pool),
    new AccesoParcela(new PgParcelaRepository(pool), new PgFincaRepository(pool)),
    new BitacoraRepository(pool),
  ),
);

const tecnicos = [requiereToken, permitirRoles('ADMINISTRADOR', 'TECNICO')];

// ---------- Rutas ----------
const router = express.Router();

router.post('/diagnosticos/:id/tratamientos', tecnicos, controller.crearDesdeDiagnostico);
router.post('/parcelas/:parcelaId/tratamientos', tecnicos, controller.crearEnParcela);
router.get('/parcelas/:parcelaId/tratamientos', requiereToken, controller.listarPorParcela);

router.get('/tratamientos', requiereToken, controller.listar);
router.get('/tratamientos/:id', requiereToken, controller.obtener);
router.put('/tratamientos/:id', tecnicos, controller.actualizar);
router.patch('/tratamientos/:id/estado', tecnicos, controller.cambiarEstado);
router.post('/tratamientos/:id/seguimientos', tecnicos, controller.registrarSeguimiento);

module.exports = router;
