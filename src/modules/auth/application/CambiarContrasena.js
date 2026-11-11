// =====================================================================
// CAPA APPLICATION · Caso de uso: cambiar la contraseña propia
// Pide la contraseña actual para que nadie pueda cambiarla con solo
// tener la sesión abierta en un equipo ajeno.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const Usuario = require('../domain/Usuario');

class CambiarContrasena {
  /**
   * @param {import('../domain/UsuarioRepository')} usuarioRepository
   * @param {{ hashear: Function, comparar: Function }} servicioContrasena
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(usuarioRepository, servicioContrasena, bitacora) {
    this.usuarioRepository = usuarioRepository;
    this.servicioContrasena = servicioContrasena;
    this.bitacora = bitacora;
  }

  /**
   * @param {number} usuarioId  Del token
   * @param {{ actual: string, nueva: string }} datos
   */
  async ejecutar(usuarioId, { actual, nueva } = {}) {
    const errores = [];
    if (!actual) errores.push({ campo: 'actual', mensaje: 'Ingrese su contraseña actual.' });
    const errorNueva = Usuario.errorContrasena(nueva);
    if (errorNueva) errores.push({ campo: 'nueva', mensaje: errorNueva });
    if (actual && nueva && actual === nueva) {
      errores.push({ campo: 'nueva', mensaje: 'La contraseña nueva debe ser distinta de la actual.' });
    }
    if (errores.length > 0) {
      throw new AppError('No se pudo cambiar la contraseña.', 422, errores);
    }

    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario || !usuario.activo) {
      throw new AppError('Usuario no encontrado o inactivo.', 404);
    }

    const coincide = await this.servicioContrasena.comparar(String(actual), usuario.contrasenaHash);
    if (!coincide) {
      throw new AppError('La contraseña actual no es correcta.', 422, [
        { campo: 'actual', mensaje: 'La contraseña actual no es correcta.' },
      ]);
    }

    await this.usuarioRepository.cambiarContrasena(usuarioId, await this.servicioContrasena.hashear(nueva));
    await this.bitacora.registrar({
      usuarioId, accion: 'CAMBIAR_CONTRASENA', tabla: 'usuario', registroId: usuarioId, resultado: 'exito',
    });
  }
}

module.exports = CambiarContrasena;
