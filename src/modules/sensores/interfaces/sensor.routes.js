// =====================================================================
// CAPA INTERFACES · Rutas de sensores y mediciones
// Se monta en app.js como /api/v1.
// Todas usan token de usuario, EXCEPTO /ingesta/mediciones, que usa la
// clave del sensor (encabezado x-api-key) porque la llama el ESP32.
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const claveSensor = require('../../../shared/security/claveSensor');
const { requiereToken, permitirRoles } = require('../../../shared/middlewares/auth.middleware');

const PgFincaRepository = require('../../fincas/infrastructure/PgFincaRepository');
const PgParcelaRepository = require('../../parcelas/infrastructure/PgParcelaRepository');
const AccesoParcela = require('../../parcelas/application/AccesoParcela');
const PgSensorRepository = require('../infrastructure/PgSensorRepository');
const PgMedicionRepository = require('../infrastructure/PgMedicionRepository');
const SensorCasosDeUso = require('../application/SensorCasosDeUso');
const MedicionCasosDeUso = require('../application/MedicionCasosDeUso');
const SensorController = require('./sensor.controller');

// ---------- Armado de dependencias ----------
const sensorRepository = new PgSensorRepository(pool);
const accesoParcela = new AccesoParcela(new PgParcelaRepository(pool), new PgFincaRepository(pool));
const sensores = new SensorCasosDeUso(sensorRepository, accesoParcela, claveSensor, new BitacoraRepository(pool));
const mediciones = new MedicionCasosDeUso(new PgMedicionRepository(pool), sensores, sensorRepository, claveSensor);
const controller = new SensorController(sensores, mediciones);

const puedeModificar = permitirRoles('ADMINISTRADOR', 'PRODUCTOR');

// ---------- Rutas ----------
const router = express.Router();

router.get('/parcelas/:parcelaId/sensores', requiereToken, controller.listar);
router.post('/parcelas/:parcelaId/sensores', requiereToken, puedeModificar, controller.crear);
router.post('/sensores/:id/regenerar-clave', requiereToken, puedeModificar, controller.regenerarClave);
router.patch('/sensores/:id/estado', requiereToken, puedeModificar, controller.cambiarEstado);

router.get('/sensores/:id/mediciones', requiereToken, controller.listarMediciones);
router.post('/sensores/:id/mediciones', requiereToken, puedeModificar, controller.registrarManual);

// Ruta del ESP32: sin token de usuario, con clave del sensor.
router.post('/ingesta/mediciones', controller.ingesta);

module.exports = router;
