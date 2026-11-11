// =====================================================================
// CAPA DOMAIN · Contratos del módulo de informes
// =====================================================================
class InformeRepository {
  /** Guarda un informe en borrador. Devuelve su id. */
  async crear(datos) { throw new Error('Método no implementado'); }
  /** Con el contenido completo (JSON ya convertido en objeto). */
  async buscarPorId(id) { throw new Error('Método no implementado'); }
  /** filtros: { parcelaId, duenoId, estado } — sin el contenido, para que la lista sea liviana */
  async listar(filtros) { throw new Error('Método no implementado'); }
  async actualizarContenido(id, contenido, propuestaTexto) { throw new Error('Método no implementado'); }
  async emitir(id, usuarioId) { throw new Error('Método no implementado'); }
}

class GeneradorPdf {
  /** @returns {Promise<Buffer>} el PDF del informe */
  async generar(contenido, cabecera) { throw new Error('Método no implementado'); }
}

module.exports = { InformeRepository, GeneradorPdf };
