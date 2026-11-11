// =====================================================================
// CAPA DOMAIN · Contratos (qué se necesita, no cómo se hace)
//   DiagnosticoRepository → guardar y consultar en la base
//   ServicioModelo        → pedir la predicción al servicio Python
//   AlmacenImagenes       → guardar y leer las fotos
// Las implementaciones están en infrastructure/.
// =====================================================================
class DiagnosticoRepository {
  /** Modelo marcado como activo en modelo_ia. */
  async modeloActivo() { throw new Error('Método no implementado'); }
  /** Catálogo de enfermedades: [{ id, codigo, nombre }]. */
  async enfermedades() { throw new Error('Método no implementado'); }
  /** Guarda cabecera + detalle en una transacción. Devuelve el id. */
  async crear(cabecera, detalle) { throw new Error('Método no implementado'); }
  async buscarPorId(id) { throw new Error('Método no implementado'); }
  /** filtros: { parcelaId, duenoId, estado, desde, hasta } */
  async listar(filtros) { throw new Error('Método no implementado'); }
  async revisar(id, { estado, enfermedadConfirmadaId, observaciones }, revisadoPor) { throw new Error('Método no implementado'); }
  /** Ruta y hash de la foto. */
  async datosImagen(id) { throw new Error('Método no implementado'); }
}

class ServicioModelo {
  /**
   * @param {Buffer} contenido  Bytes de la imagen
   * @param {string} tipo       'image/jpeg' | 'image/png'
   * @returns {Promise<{ probabilidades: Object<string, number>, umbrales: Object<string, number>,
   *                     modelo: string, advertencias: string[], calidad: object|null }>}
   */
  async predecir(contenido, tipo) { throw new Error('Método no implementado'); }
}

class AlmacenImagenes {
  /** @returns {Promise<{ ruta: string, hash: string }>} */
  async guardar(contenido, tipo) { throw new Error('Método no implementado'); }
  /** @returns {Promise<Buffer>} */
  async leer(ruta) { throw new Error('Método no implementado'); }
  async eliminar(ruta) { throw new Error('Método no implementado'); }
}

module.exports = { DiagnosticoRepository, ServicioModelo, AlmacenImagenes };
