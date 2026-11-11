// =====================================================================
// CAPA APPLICATION · Caso de uso: datos del panel de inicio
// El productor ve solo sus fincas; técnico y administrador, todas.
// El administrador además ve cuántos usuarios hay por rol.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const { DIAS_PENDIENTE, DIAS_SIN_SEGUIMIENTO, enfermedadMasFrecuente, armarAlertas } = require('../domain/alertas');

class ObtenerPanel {
  /** @param {import('../domain/PanelRepository')} panelRepository */
  constructor(panelRepository) {
    this.panelRepository = panelRepository;
  }

  /**
   * @param {{ id: number, rol: string }} actor
   * @param {number|string} dias  Periodo de las estadísticas (por defecto 30)
   */
  async ejecutar(actor, dias = 30) {
    const periodo = Number(dias);
    if (!Number.isInteger(periodo) || periodo < 1 || periodo > 365) {
      throw new AppError('El periodo debe ser un número de días entre 1 y 365.', 400);
    }
    const duenoId = actor.rol === 'PRODUCTOR' ? actor.id : null;
    const repo = this.panelRepository;

    // Las consultas no dependen entre sí: se lanzan a la vez para responder más rápido.
    const [contadores, distribucion, ultimos, pendientes, noConcluyentes, sinSeguimiento] = await Promise.all([
      repo.contadores(duenoId, periodo),
      repo.distribucionPorEnfermedad(duenoId, periodo),
      repo.ultimosDiagnosticos(duenoId, 5),
      repo.pendientesAntiguos(duenoId, DIAS_PENDIENTE),
      repo.noConcluyentes(duenoId, periodo),
      repo.tratamientosSinSeguimiento(duenoId, DIAS_SIN_SEGUIMIENTO),
    ]);

    const panel = {
      rol: actor.rol,
      periodoDias: periodo,
      tarjetas: {
        ...contadores,
        enfermedadMasFrecuente: enfermedadMasFrecuente(distribucion),
      },
      distribucion,
      ultimosDiagnosticos: ultimos,
      alertas: armarAlertas({ pendientesAntiguos: pendientes, noConcluyentes, tratamientosSinSeguimiento: sinSeguimiento }),
    };

    // El productor no gestiona borradores de informes.
    if (actor.rol === 'PRODUCTOR') {
      delete panel.tarjetas.informesBorrador;
    }
    if (actor.rol === 'ADMINISTRADOR') {
      panel.usuariosPorRol = await repo.usuariosPorRol();
    }
    return panel;
  }
}

module.exports = ObtenerPanel;
