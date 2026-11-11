// =====================================================================
// CAPA APPLICATION · Verificación de acceso a una parcela
// Varios módulos trabajan "dentro" de una parcela (sensores, clima,
// diagnósticos). Todos aplican la misma regla: el permiso lo da la
// finca a la que pertenece la parcela. Esta clase evita repetir esa
// lógica en cada módulo.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

class AccesoParcela {
  /**
   * @param {import('../domain/ParcelaRepository')} parcelaRepository
   * @param {import('../../fincas/domain/FincaRepository')} fincaRepository
   */
  constructor(parcelaRepository, fincaRepository) {
    this.parcelaRepository = parcelaRepository;
    this.fincaRepository = fincaRepository;
  }

  /**
   * @param {number} parcelaId
   * @param {{ id: number, rol: string }} actor
   * @param {'ver'|'editar'} accion
   * @returns {Promise<{ parcela: object, finca: object }>}
   */
  async verificar(parcelaId, actor, accion) {
    const parcela = await this.parcelaRepository.buscarPorId(parcelaId);
    if (!parcela) {
      throw new AppError('La parcela no existe.', 404);
    }
    const finca = await this.fincaRepository.buscarPorId(parcela.fincaId);
    const permitido = accion === 'ver' ? finca.puedeVer(actor) : finca.puedeEditar(actor);
    if (!permitido) {
      throw new AppError('No tiene permiso para acceder a esta parcela.', 403);
    }
    return { parcela, finca };
  }
}

module.exports = AccesoParcela;
