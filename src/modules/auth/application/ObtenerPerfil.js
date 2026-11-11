// =====================================================================
// CAPA APPLICATION · Caso de uso: ver el perfil del usuario conectado
// El id viene del token (req.usuario.id), no de lo que envíe el cliente.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

class ObtenerPerfil {
  /** @param {import('../domain/UsuarioRepository')} usuarioRepository */
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  /**
   * @param {number} usuarioId
   * @returns {Promise<object>} datos públicos del usuario
   */
  async ejecutar(usuarioId) {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario || !usuario.activo) {
      throw new AppError('Usuario no encontrado o inactivo.', 404);
    }
    return usuario.datosPublicos();
  }
}

module.exports = ObtenerPerfil;
