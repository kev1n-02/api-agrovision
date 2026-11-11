// =====================================================================
// CAPA DOMAIN · Contrato del repositorio del panel
// En todas las consultas, duenoId = null significa "todas las fincas"
// (técnico y administrador); con valor, solo las fincas de ese productor.
// =====================================================================
class PanelRepository {
  async contadores(duenoId, dias) { throw new Error('Método no implementado'); }
  async distribucionPorEnfermedad(duenoId, dias) { throw new Error('Método no implementado'); }
  async ultimosDiagnosticos(duenoId, cantidad) { throw new Error('Método no implementado'); }
  async pendientesAntiguos(duenoId, diasMinimos) { throw new Error('Método no implementado'); }
  async noConcluyentes(duenoId, dias) { throw new Error('Método no implementado'); }
  async tratamientosSinSeguimiento(duenoId, diasMinimos) { throw new Error('Método no implementado'); }
  async usuariosPorRol() { throw new Error('Método no implementado'); }
}

module.exports = PanelRepository;
