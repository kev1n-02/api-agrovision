// =====================================================================
// CAPA INTERFACES · Rutas de clima y umbrales (todas con token)
// Se monta en app.js como /api/v1.
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const { requiereToken, permitirRoles } = require('../../../shared/middlewares/auth.middleware');

const PgFincaRepository = require('../../fincas/infrastructure/PgFincaRepository');
const PgParcelaRepository = require('../../parcelas/infrastructure/PgParcelaRepository');
const AccesoParcela = require('../../parcelas/application/AccesoParcela');
const PgMedicionRepository = require('../../sensores/infrastructure/PgMedicionRepository');
const PgUmbralRepository = require('../infrastructure/PgUmbralRepository');
const ClimaCasosDeUso = require('../application/ClimaCasosDeUso');
const ClimaController = require('./clima.controller');

// ---------- Armado de dependencias ----------
const controller = new ClimaController(
  new ClimaCasosDeUso(
    new PgUmbralRepository(pool),
    new PgMedicionRepository(pool),
    new AccesoParcela(new PgParcelaRepository(pool), new PgFincaRepository(pool)),
    new BitacoraRepository(pool),
  ),
);

// ---------- Rutas ----------
const router = express.Router();

router.get('/parcelas/:parcelaId/clima', requiereToken, controller.analizar);
router.get('/umbrales', requiereToken, controller.listarUmbrales);
// Los umbrales son conocimiento agronómico: los ajusta el técnico o el administrador.
router.put('/umbrales/:id', requiereToken, permitirRoles('ADMINISTRADOR', 'TECNICO'), controller.actualizarUmbral);

module.exports = router;
