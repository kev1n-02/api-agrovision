// =====================================================================
// CAPA DOMAIN · Contrato del repositorio de tratamientos y seguimientos
// =====================================================================
class TratamientoRepository {
  async crear({ parcelaId, diagnosticoId, enfermedadId, responsableId, objetivo, acciones, producto, fechaInicio, fechaFin }) { throw new Error('Método no implementado'); }
  async buscarPorId(id) { throw new Error('Método no implementado'); }
  /** filtros: { parcelaId, duenoId, estado } */
  async listar(filtros) { throw new Error('Método no implementado'); }
  async actualizar(id, { objetivo, acciones, producto, fechaInicio, fechaFin }, usuarioActId) { throw new Error('Método no implementado'); }
  async cambiarEstado(id, estado, fechaFin, usuarioActId) { throw new Error('Método no implementado'); }
  /** true si el diagnóstico ya tiene un tratamiento activo. */
  async existeActivoParaDiagnostico(diagnosticoId) { throw new Error('Método no implementado'); }

  async listarSeguimientos(tratamientoId) { throw new Error('Método no implementado'); }
  async existeSeguimientoEnFecha(tratamientoId, fecha) { throw new Error('Método no implementado'); }
  async crearSeguimiento(tratamientoId, { fecha, hojasEvaluadas, hojasAfectadas, severidad, observaciones }, usuarioCreaId) { throw new Error('Método no implementado'); }
}

module.exports = TratamientoRepository;
