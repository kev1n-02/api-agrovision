// =====================================================================
// CAPA INTERFACES · Rutas del módulo de autenticación
// Aquí también se "arma" el módulo: se crean las implementaciones
// concretas (PostgreSQL, Bcrypt, JWT) y se entregan a los casos de uso.
// Es el único lugar del módulo que conoce todas las piezas.
// =====================================================================
const express = require('express');

const { pool } = require('../../../config/database');
const contrasena = require('../../../shared/security/contrasena');
const token = require('../../../shared/security/token');
const BitacoraRepository = require('../../../shared/bitacora/BitacoraRepository');
const { requiereToken } = require('../../../shared/middlewares/auth.middleware');

const PgUsuarioRepository = require('../infrastructure/PgUsuarioRepository');
const IniciarSesion = require('../application/IniciarSesion');
const RegistrarUsuario = require('../application/RegistrarUsuario');
const ObtenerPerfil = require('../application/ObtenerPerfil');
const CambiarContrasena = require('../application/CambiarContrasena');
const AuthController = require('./auth.controller');

// ---------- Armado de dependencias ----------
const usuarioRepository = new PgUsuarioRepository(pool);
const bitacora = new BitacoraRepository(pool);

const controller = new AuthController(
  new IniciarSesion(usuarioRepository, contrasena, token, bitacora),
  new RegistrarUsuario(usuarioRepository, contrasena, bitacora),
  new ObtenerPerfil(usuarioRepository),
  new CambiarContrasena(usuarioRepository, contrasena, bitacora),
);

// ---------- Rutas ----------
const router = express.Router();

router.post('/login', controller.login);
router.post('/registro', controller.registro);
router.get('/perfil', requiereToken, controller.perfil);
router.patch('/contrasena', requiereToken, controller.contrasena);

module.exports = router;
