// =====================================================================
// CAPA INTERFACES · Rutas de diagnósticos (todas con token)
// Se monta en app.js como /api/v1.
// La foto llega como multipart/form-data en el campo "imagen"; multer
// la deja en memoria (req.file.buffer) para validarla antes de guardarla.
// =====================================================================
const express = require('express');
const multer = require('multer');

const { pool } = require('../../../config/database');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const { requiereToken, permitirRoles } = require('../../../shared/middlewares/auth.middleware');

const PgFincaRepository = require('../../fincas/infrastructure/PgFincaRepository');
const PgParcelaRepository = require('../../parcelas/infrastructure/PgParcelaRepository');
const AccesoParcela = require('../../parcelas/application/AccesoParcela');
const PgCatalogoRepository = require('../../catalogos/infrastructure/PgCatalogoRepository');
const PgDiagnosticoRepository = require('../infrastructure/PgDiagnosticoRepository');
const HttpServicioModelo = require('../infrastructure/HttpServicioModelo');
const AlmacenImagenesDisco = require('../infrastructure/AlmacenImagenesDisco');
const DiagnosticoCasosDeUso = require('../application/DiagnosticoCasosDeUso');
const { TAMANO_MAXIMO } = require('../domain/imagen');
const DiagnosticoController = require('./diagnostico.controller');

// ---------- Armado de dependencias ----------
const controller = new DiagnosticoController(
  new DiagnosticoCasosDeUso(
    new PgDiagnosticoRepository(pool),
    new HttpServicioModelo(process.env.ML_URL, Number(process.env.ML_TIEMPO_ESPERA_MS) || 30000),
    new AlmacenImagenesDisco(process.env.UPLOADS_DIR || 'uploads'),
    new AccesoParcela(new PgParcelaRepository(pool), new PgFincaRepository(pool)),
    new PgCatalogoRepository(pool),
    new BitacoraRepository(pool),
  ),
);

// Una sola imagen, máximo 10 MB, en memoria (no se escribe nada hasta validarla).
const subirImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO, files: 1 },
}).single('imagen');

// ---------- Rutas ----------
const router = express.Router();

// El token va ANTES de multer: sin sesión, ni siquiera se recibe el archivo.
router.post('/parcelas/:parcelaId/diagnosticos', requiereToken, subirImagen, controller.crear);
router.get('/parcelas/:parcelaId/diagnosticos', requiereToken, controller.listarPorParcela);
router.get('/diagnosticos', requiereToken, controller.listar);
router.get('/diagnosticos/:id', requiereToken, controller.obtener);
router.get('/diagnosticos/:id/imagen', requiereToken, controller.imagen);
router.patch('/diagnosticos/:id/revision', requiereToken, permitirRoles('ADMINISTRADOR', 'TECNICO'), controller.revisar);

module.exports = router;
