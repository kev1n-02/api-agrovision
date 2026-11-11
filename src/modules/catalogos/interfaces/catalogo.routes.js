// =====================================================================
// CAPA INTERFACES · Rutas de catálogos (todas con token)
// Consultar: cualquier rol. Modificar: ADMINISTRADOR y TECNICO.
// Se monta en app.js como /api/v1.
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const { requiereToken, permitirRoles } = require('../../../shared/middlewares/auth.middleware');

const PgCatalogoRepository = require('../infrastructure/PgCatalogoRepository');
const CatalogoCasosDeUso = require('../application/CatalogoCasosDeUso');
const CatalogoController = require('./catalogo.controller');

// ---------- Armado de dependencias ----------
const controller = new CatalogoController(
  new CatalogoCasosDeUso(new PgCatalogoRepository(pool), new BitacoraRepository(pool)),
);

const gestionan = [requiereToken, permitirRoles('ADMINISTRADOR', 'TECNICO')];

// ---------- Rutas ----------
const router = express.Router();

router.get('/enfermedades', requiereToken, controller.listarEnfermedades);
router.get('/enfermedades/:id', requiereToken, controller.obtenerEnfermedad);
router.put('/enfermedades/:id', gestionan, controller.actualizarEnfermedad);

router.get('/enfermedades/:id/recomendaciones', requiereToken, controller.listarRecomendaciones);
router.post('/enfermedades/:id/recomendaciones', gestionan, controller.crearRecomendacion);
router.put('/recomendaciones/:id', gestionan, controller.actualizarRecomendacion);
router.patch('/recomendaciones/:id/estado', gestionan, controller.cambiarEstadoRecomendacion);

router.get('/modelos', requiereToken, controller.listarModelos);

module.exports = router;
