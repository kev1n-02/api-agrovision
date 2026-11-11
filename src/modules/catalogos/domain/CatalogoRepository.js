// =====================================================================
// CAPA DOMAIN · Contrato del repositorio de catálogos
// Enfermedades, recomendaciones y modelos de IA.
// =====================================================================
class CatalogoRepository {
  async listarEnfermedades() { throw new Error('Método no implementado'); }
  async buscarEnfermedad(id) { throw new Error('Método no implementado'); }
  async actualizarEnfermedad(id, { nombre, agenteCausal, descripcion, condicionesFavorables }) { throw new Error('Método no implementado'); }

  /** soloActivas = true para los usuarios que no administran el catálogo. */
  async listarRecomendaciones(enfermedadId, soloActivas) { throw new Error('Método no implementado'); }
  async buscarRecomendacion(id) { throw new Error('Método no implementado'); }
  async crearRecomendacion(enfermedadId, { tipo, descripcion, fuente }, usuarioCreaId) { throw new Error('Método no implementado'); }
  async actualizarRecomendacion(id, { tipo, descripcion, fuente }, usuarioActId) { throw new Error('Método no implementado'); }
  async cambiarEstadoRecomendacion(id, activo, usuarioActId) { throw new Error('Método no implementado'); }

  async listarModelos() { throw new Error('Método no implementado'); }
}

module.exports = CatalogoRepository;
