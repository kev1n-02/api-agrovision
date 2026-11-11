// =====================================================================
// CAPA DOMAIN · Contrato del repositorio de parcelas
// La implementación con SQL está en infrastructure/PgParcelaRepository.js.
// =====================================================================
class ParcelaRepository {
  async listarPorFinca(fincaId) { throw new Error('Método no implementado'); }

  /** @returns {Promise<import('./Parcela')|null>} */
  async buscarPorId(id) { throw new Error('Método no implementado'); }

  /** true si el código ya existe en esa finca (excluirId sirve al editar). */
  async existeCodigo(fincaId, codigo, excluirId = null) { throw new Error('Método no implementado'); }

  async crear(fincaId, { codigo, variedad, superficie, numeroArboles, fechaPlantacion }, usuarioCreaId) { throw new Error('Método no implementado'); }

  async actualizar(id, { codigo, variedad, superficie, numeroArboles, fechaPlantacion }, usuarioActId) { throw new Error('Método no implementado'); }

  async cambiarEstado(id, activo, usuarioActId) { throw new Error('Método no implementado'); }
}

module.exports = ParcelaRepository;
