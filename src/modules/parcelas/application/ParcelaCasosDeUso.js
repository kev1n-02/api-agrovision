// =====================================================================
// CAPA APPLICATION · Casos de uso de parcelas
// Usa también el repositorio de fincas, porque los permisos de una
// parcela dependen de su finca.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const Parcela = require('../domain/Parcela');

class ParcelaCasosDeUso {
  /**
   * @param {import('../domain/ParcelaRepository')} parcelaRepository
   * @param {import('../../fincas/domain/FincaRepository')} fincaRepository
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(parcelaRepository, fincaRepository, bitacora) {
    this.parcelaRepository = parcelaRepository;
    this.fincaRepository = fincaRepository;
    this.bitacora = bitacora;
  }

  async listarPorFinca(fincaId, actor) {
    await this.verificarFinca(fincaId, actor, 'ver');
    return this.parcelaRepository.listarPorFinca(fincaId);
  }

  async obtener(id, actor) {
    const parcela = await this.buscarParcela(id);
    await this.verificarFinca(parcela.fincaId, actor, 'ver');
    return parcela;
  }

  async crear(fincaId, datos, actor) {
    const finca = await this.verificarFinca(fincaId, actor, 'editar');
    if (!finca.activo) {
      throw new AppError('No se pueden agregar parcelas a una finca inactiva.', 400);
    }

    const limpio = Parcela.validar(datos);
    await this.verificarCodigo(fincaId, limpio.codigo);

    const parcela = await this.parcelaRepository.crear(fincaId, limpio, actor.id);
    await this.registrar(actor, 'CREAR_PARCELA', parcela.id);
    return parcela;
  }

  async actualizar(id, datos, actor) {
    const parcela = await this.buscarParcela(id);
    await this.verificarFinca(parcela.fincaId, actor, 'editar');

    const limpio = Parcela.validar(datos);
    await this.verificarCodigo(parcela.fincaId, limpio.codigo, id);

    const actualizada = await this.parcelaRepository.actualizar(id, limpio, actor.id);
    await this.registrar(actor, 'EDITAR_PARCELA', id);
    return actualizada;
  }

  /** Borrado lógico: activo = false. */
  async cambiarEstado(id, activo, actor) {
    if (typeof activo !== 'boolean') {
      throw new AppError('El estado no es válido.', 422, [{ campo: 'activo', mensaje: 'Debe ser true o false.' }]);
    }
    const parcela = await this.buscarParcela(id);
    await this.verificarFinca(parcela.fincaId, actor, 'editar');

    const actualizada = await this.parcelaRepository.cambiarEstado(id, activo, actor.id);
    await this.registrar(actor, activo ? 'ACTIVAR_PARCELA' : 'DESACTIVAR_PARCELA', id);
    return actualizada;
  }

  // ---------- Ayudantes ----------

  async buscarParcela(id) {
    const parcela = await this.parcelaRepository.buscarPorId(id);
    if (!parcela) {
      throw new AppError('La parcela no existe.', 404);
    }
    return parcela;
  }

  /** Busca la finca y aplica sus reglas de permiso (Finca.puedeVer / puedeEditar). */
  async verificarFinca(fincaId, actor, accion) {
    const finca = await this.fincaRepository.buscarPorId(fincaId);
    if (!finca) {
      throw new AppError('La finca no existe.', 404);
    }
    const permitido = accion === 'ver' ? finca.puedeVer(actor) : finca.puedeEditar(actor);
    if (!permitido) {
      throw new AppError('No tiene permiso para acceder a esta finca.', 403);
    }
    return finca;
  }

  /** El código (P-01) no puede repetirse dentro de la misma finca. */
  async verificarCodigo(fincaId, codigo, excluirId = null) {
    if (await this.parcelaRepository.existeCodigo(fincaId, codigo, excluirId)) {
      throw new AppError('Ya existe una parcela con ese código en esta finca.', 409, [
        { campo: 'codigo', mensaje: `El código ${codigo} ya está en uso.` },
      ]);
    }
  }

  async registrar(actor, accion, parcelaId) {
    await this.bitacora.registrar({
      usuarioId: actor.id, accion, tabla: 'parcela', registroId: parcelaId, resultado: 'exito',
    });
  }
}

module.exports = ParcelaCasosDeUso;
