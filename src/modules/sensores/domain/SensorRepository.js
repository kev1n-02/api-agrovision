// =====================================================================
// CAPA DOMAIN · Contratos de los repositorios de sensores y mediciones
// Implementaciones con SQL en infrastructure/.
// =====================================================================
class SensorRepository {
  async listarPorParcela(parcelaId) { throw new Error('Método no implementado'); }
  async buscarPorId(id) { throw new Error('Método no implementado'); }
  /** Busca un sensor activo o inactivo por el hash de su clave. */
  async buscarPorClave(hashClave) { throw new Error('Método no implementado'); }
  async existeCodigo(codigo) { throw new Error('Método no implementado'); }
  async crear({ parcelaId, codigo, descripcion, tipo, hashClave, usuarioCreaId }) { throw new Error('Método no implementado'); }
  async guardarClave(id, hashClave, usuarioActId) { throw new Error('Método no implementado'); }
  async cambiarEstado(id, activo, usuarioActId) { throw new Error('Método no implementado'); }
}

class MedicionRepository {
  async listarPorSensor(sensorId, desde, hasta) { throw new Error('Método no implementado'); }
  /** Todas las mediciones de los sensores de una parcela, ordenadas por fecha. */
  async listarPorParcela(parcelaId, desde, hasta) { throw new Error('Método no implementado'); }
  async existe(sensorId, fecha) { throw new Error('Método no implementado'); }
  async crear({ sensorId, fecha, temperatura, humedad, luminosidad, origen, usuarioCreaId }) { throw new Error('Método no implementado'); }
}

module.exports = { SensorRepository, MedicionRepository };
