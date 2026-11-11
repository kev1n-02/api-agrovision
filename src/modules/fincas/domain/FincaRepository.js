// =====================================================================
// CAPA DOMAIN · Contrato del repositorio de fincas
// Qué operaciones existen. La implementación con SQL está en
// infrastructure/PgFincaRepository.js.
// =====================================================================
class FincaRepository {
  /** Lista fincas. Si usuarioId tiene valor, solo las de ese usuario. */
  async listar({ usuarioId = null } = {}) { throw new Error('Método no implementado'); }

  /** @returns {Promise<import('./Finca')|null>} */
  async buscarPorId(id) { throw new Error('Método no implementado'); }

  /** Devuelve el rol de un usuario activo, o null si no existe. */
  async rolDeUsuario(usuarioId) { throw new Error('Método no implementado'); }

  /** @returns {Promise<import('./Finca')>} finca creada */
  async crear({ usuarioId, nombre, provincia, canton, direccion, altitud, usuarioCreaId }) { throw new Error('Método no implementado'); }

  /** @returns {Promise<import('./Finca')>} finca actualizada */
  async actualizar(id, { nombre, provincia, canton, direccion, altitud }, usuarioActId) { throw new Error('Método no implementado'); }

  /** Activa o desactiva la finca (borrado lógico). */
  async cambiarEstado(id, activo, usuarioActId) { throw new Error('Método no implementado'); }
}

module.exports = FincaRepository;
