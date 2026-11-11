// =====================================================================
// CAPA INTERFACES · Rutas de informes (todas con token)
// Generar, ajustar y emitir: ADMINISTRADOR y TECNICO.
// Consultar y descargar: también el productor (solo informes emitidos).
// Se monta en app.js como /api/v1.
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const { requiereToken, permitirRoles } = require('../../../shared/middlewares/auth.middleware');

const PgFincaRepository = require('../../fincas/infrastructure/PgFincaRepository');
const PgParcelaRepository = require('../../parcelas/infrastructure/PgParcelaRepository');
const AccesoParcela = require('../../parcelas/application/AccesoParcela');
const PgDiagnosticoRepository = require('../../diagnosticos/infrastructure/PgDiagnosticoRepository');
const PgCatalogoRepository = require('../../catalogos/infrastructure/PgCatalogoRepository');
const PgTratamientoRepository = require('../../tratamientos/infrastructure/PgTratamientoRepository');
const PgMedicionRepository = require('../../sensores/infrastructure/PgMedicionRepository');
const PgUmbralRepository = require('../../clima/infrastructure/PgUmbralRepository');
const PgInformeRepository = require('../infrastructure/PgInformeRepository');
const PdfKitInforme = require('../infrastructure/PdfKitInforme');
const InformeCasosDeUso = require('../application/InformeCasosDeUso');
const InformeController = require('./informe.controller');

// ---------- Armado de dependencias ----------
const controller = new InformeController(new InformeCasosDeUso({
  informeRepository: new PgInformeRepository(pool),
  accesoParcela: new AccesoParcela(new PgParcelaRepository(pool), new PgFincaRepository(pool)),
  diagnosticoRepository: new PgDiagnosticoRepository(pool),
  catalogoRepository: new PgCatalogoRepository(pool),
  tratamientoRepository: new PgTratamientoRepository(pool),
  medicionRepository: new PgMedicionRepository(pool),
  umbralRepository: new PgUmbralRepository(pool),
  generadorPdf: new PdfKitInforme(),
  bitacora: new BitacoraRepository(pool),
}));

const tecnicos = [requiereToken, permitirRoles('ADMINISTRADOR', 'TECNICO')];

// ---------- Rutas ----------
const router = express.Router();

router.post('/parcelas/:parcelaId/informes', tecnicos, controller.generar);
router.get('/parcelas/:parcelaId/informes', requiereToken, controller.listarPorParcela);
router.get('/informes', requiereToken, controller.listar);
router.get('/informes/:id', requiereToken, controller.obtener);
router.get('/informes/:id/pdf', requiereToken, controller.pdf);
router.put('/informes/:id/propuesta', tecnicos, controller.actualizarPropuesta);
router.post('/informes/:id/emitir', tecnicos, controller.emitir);

module.exports = router;
