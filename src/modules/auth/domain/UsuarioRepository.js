// =====================================================================
// CAPA DOMAIN · Contrato del repositorio de usuarios
// Define QUÉ operaciones existen, no CÓMO se hacen. Los casos de uso
// dependen de este contrato y no de PostgreSQL (principio de inversión
// de dependencias, la D de SOLID).
// La implementación real está en infrastructure/PgUsuarioRepository.js.
// =====================================================================
class UsuarioRepository {
  /** @returns {Promise<import('./Usuario')|null>} */
  async buscarPorCorreo(correo) { throw new Error('Método no implementado'); }

  /** @returns {Promise<import('./Usuario')|null>} */
  async buscarPorId(id) { throw new Error('Método no implementado'); }

  /** excluirId: al editar, para no compararse consigo mismo. */
  async existeCorreo(correo, excluirId = null) { throw new Error('Método no implementado'); }

  /** @returns {Promise<boolean>} */
  async existeCedula(cedula) { throw new Error('Método no implementado'); }

  /** @returns {Promise<number|null>} id del rol o null si no existe */
  async buscarRolId(nombreRol) { throw new Error('Método no implementado'); }

  /** @returns {Promise<import('./Usuario')>} usuario creado */
  async crear({ cedula, nombres, correo, contrasenaHash, rolId, usuarioCreaId }) { throw new Error('Método no implementado'); }

  // ---------- Administración ----------

  /** Lista usuarios; si llega rol, solo los de ese rol. */
  async listar({ rol = null } = {}) { throw new Error('Método no implementado'); }

  async listarRoles() { throw new Error('Método no implementado'); }

  async actualizar(id, { nombres, correo, rolId }, usuarioActId) { throw new Error('Método no implementado'); }

  async cambiarEstado(id, activo, usuarioActId) { throw new Error('Método no implementado'); }

  async cambiarContrasena(id, contrasenaHash) { throw new Error('Método no implementado'); }
}

module.exports = UsuarioRepository;
