// =====================================================================
// CAPA DOMAIN · Contrato del repositorio de umbrales
// =====================================================================
class UmbralRepository {
  async listar() { throw new Error('Método no implementado'); }
  async buscarPorId(id) { throw new Error('Método no implementado'); }
  async actualizar(id, { tempMin, tempMax, humedadMin, horasMin, descripcion, provisional }, usuarioActId) { throw new Error('Método no implementado'); }
}

module.exports = UmbralRepository;
