// =====================================================================
// CAPA APPLICATION · Caso de uso: consultar la bitácora (ADMINISTRADOR)
// Filtros: rango de fechas, usuario y acción. Paginación de 50 en 50
// (máximo 200 por página) para no traer miles de filas de golpe.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

class ConsultarBitacora {
  /** @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora */
  constructor(bitacora) {
    this.bitacora = bitacora;
  }

  /**
   * @param {{ desde: string, hasta: string }} rango
   * @param {{ usuarioId?: string, accion?: string, pagina?: string, tamano?: string }} filtros
   */
  async ejecutar(rango, { usuarioId, accion, pagina, tamano } = {}) {
    const numeroPagina = pagina === undefined ? 1 : Number(pagina);
    const porPagina = tamano === undefined ? 50 : Number(tamano);
    if (!Number.isInteger(numeroPagina) || numeroPagina < 1) {
      throw new AppError('La página debe ser un número entero mayor a 0.', 400);
    }
    if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 200) {
      throw new AppError('El tamaño de página debe estar entre 1 y 200.', 400);
    }
    const idUsuario = usuarioId === undefined || usuarioId === '' ? null : Number(usuarioId);
    if (idUsuario !== null && (!Number.isInteger(idUsuario) || idUsuario <= 0)) {
      throw new AppError('El usuario no es válido.', 400);
    }

    const { total, registros } = await this.bitacora.listar({
      ...rango,
      usuarioId: idUsuario,
      accion: accion ? String(accion).trim().toUpperCase() : null,
      limite: porPagina,
      desplazamiento: (numeroPagina - 1) * porPagina,
    });

    return {
      pagina: numeroPagina,
      tamano: porPagina,
      total,
      paginas: Math.ceil(total / porPagina),
      registros,
    };
  }
}

module.exports = ConsultarBitacora;
