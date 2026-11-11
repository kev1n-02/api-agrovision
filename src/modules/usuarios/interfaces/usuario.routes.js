// =====================================================================
// CAPA INTERFACES · Rutas de administración de usuarios
// Todas requieren token y rol ADMINISTRADOR. Se monta como /api/v1.
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const contrasena = require('../../../shared/security/contrasena');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const { requiereToken, permitirRoles } = require('../../../shared/middlewares/auth.middleware');

const PgUsuarioRepository = require('../../auth/infrastructure/PgUsuarioRepository');
const RegistrarUsuario = require('../../auth/application/RegistrarUsuario');
const UsuarioCasosDeUso = require('../application/UsuarioCasosDeUso');
const UsuarioController = require('./usuario.controller');

// ---------- Armado de dependencias ----------
const usuarioRepository = new PgUsuarioRepository(pool);
const bitacora = new BitacoraRepository(pool);
const controller = new UsuarioController(
  new UsuarioCasosDeUso(usuarioRepository, new RegistrarUsuario(usuarioRepository, contrasena, bitacora), bitacora),
);

const soloAdmin = [requiereToken, permitirRoles('ADMINISTRADOR')];

// ---------- Rutas ----------
const router = express.Router();

router.get('/roles', soloAdmin, controller.listarRoles);
router.get('/usuarios', soloAdmin, controller.listar);
router.get('/usuarios/:id', soloAdmin, controller.obtener);
router.post('/usuarios', soloAdmin, controller.crear);
router.put('/usuarios/:id', soloAdmin, controller.actualizar);
router.patch('/usuarios/:id/estado', soloAdmin, controller.cambiarEstado);

module.exports = router;
