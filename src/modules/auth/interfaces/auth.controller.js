// =====================================================================
// CAPA INTERFACES · Controlador HTTP de autenticación
// Solo traduce HTTP ↔ casos de uso: toma datos de req, llama al caso
// de uso y responde. No tiene reglas de negocio ni SQL.
// Los errores se pasan a next(), y los maneja errores.middleware.js.
// =====================================================================
const { exito } = require('../../../shared/utils/respuesta');

class AuthController {
  /**
   * @param {import('../application/IniciarSesion')} iniciarSesion
   * @param {import('../application/RegistrarUsuario')} registrarUsuario
   * @param {import('../application/ObtenerPerfil')} obtenerPerfil
   * @param {import('../application/CambiarContrasena')} cambiarContrasena
   */
  constructor(iniciarSesion, registrarUsuario, obtenerPerfil, cambiarContrasena) {
    this.iniciarSesion = iniciarSesion;
    this.registrarUsuario = registrarUsuario;
    this.obtenerPerfil = obtenerPerfil;
    this.cambiarContrasena = cambiarContrasena;
  }

  /** PATCH /api/v1/auth/contrasena · body: { "actual": "...", "nueva": "..." } */
  contrasena = async (req, res, next) => {
    try {
      await this.cambiarContrasena.ejecutar(req.usuario.id, req.body || {});
      return exito(res, 'Contraseña actualizada correctamente.');
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/auth/login */
  login = async (req, res, next) => {
    try {
      const resultado = await this.iniciarSesion.ejecutar(req.body || {}, req.ip);
      return exito(res, 'Inicio de sesión correcto.', resultado);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/auth/registro · siempre crea un PRODUCTOR */
  registro = async (req, res, next) => {
    try {
      const usuario = await this.registrarUsuario.ejecutar(req.body || {}, 'PRODUCTOR');
      return exito(res, 'Usuario registrado correctamente.', usuario.datosPublicos(), 201);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/auth/perfil · requiere token */
  perfil = async (req, res, next) => {
    try {
      const datos = await this.obtenerPerfil.ejecutar(req.usuario.id);
      return exito(res, 'Perfil del usuario.', datos);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = AuthController;
