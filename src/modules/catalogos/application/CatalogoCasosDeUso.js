// =====================================================================
// CAPA APPLICATION · Casos de uso de catálogos
// Consultar: cualquier usuario con sesión.
// Modificar: ADMINISTRADOR y TECNICO (lo controla la ruta).
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const Enfermedad = require('../domain/Enfermedad');
const Recomendacion = require('../domain/Recomendacion');

// Quién puede ver recomendaciones desactivadas.
const GESTIONAN_CATALOGO = ['ADMINISTRADOR', 'TECNICO'];

class CatalogoCasosDeUso {
  /**
   * @param {import('../domain/CatalogoRepository')} catalogoRepository
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(catalogoRepository, bitacora) {
    this.catalogoRepository = catalogoRepository;
    this.bitacora = bitacora;
  }

  // ---------- Enfermedades ----------

  async listarEnfermedades() {
    return this.catalogoRepository.listarEnfermedades();
  }

  /** Devuelve la enfermedad con sus recomendaciones. */
  async obtenerEnfermedad(id, actor) {
    const enfermedad = await this.buscarEnfermedad(id);
    const recomendaciones = await this.catalogoRepository.listarRecomendaciones(id, !GESTIONAN_CATALOGO.includes(actor.rol));
    return { ...enfermedad, recomendaciones };
  }

  async actualizarEnfermedad(id, datos, actor) {
    await this.buscarEnfermedad(id);
    const limpio = Enfermedad.validarEdicion(datos);
    const enfermedad = await this.catalogoRepository.actualizarEnfermedad(id, limpio);
    await this.registrar(actor, 'EDITAR_ENFERMEDAD', 'enfermedad', id);
    return enfermedad;
  }

  // ---------- Recomendaciones ----------

  async listarRecomendaciones(enfermedadId, actor) {
    await this.buscarEnfermedad(enfermedadId);
    return this.catalogoRepository.listarRecomendaciones(enfermedadId, !GESTIONAN_CATALOGO.includes(actor.rol));
  }

  async crearRecomendacion(enfermedadId, datos, actor) {
    await this.buscarEnfermedad(enfermedadId);
    const limpio = Recomendacion.validar(datos);
    const recomendacion = await this.catalogoRepository.crearRecomendacion(enfermedadId, limpio, actor.id);
    await this.registrar(actor, 'CREAR_RECOMENDACION', 'recomendacion', recomendacion.id);
    return recomendacion;
  }

  async actualizarRecomendacion(id, datos, actor) {
    await this.buscarRecomendacion(id);
    const limpio = Recomendacion.validar(datos);
    const recomendacion = await this.catalogoRepository.actualizarRecomendacion(id, limpio, actor.id);
    await this.registrar(actor, 'EDITAR_RECOMENDACION', 'recomendacion', id);
    return recomendacion;
  }

  /** Borrado lógico: una recomendación desactivada ya no aparece en los informes. */
  async cambiarEstadoRecomendacion(id, activo, actor) {
    if (typeof activo !== 'boolean') {
      throw new AppError('El estado no es válido.', 422, [{ campo: 'activo', mensaje: 'Debe ser true o false.' }]);
    }
    await this.buscarRecomendacion(id);
    const recomendacion = await this.catalogoRepository.cambiarEstadoRecomendacion(id, activo, actor.id);
    await this.registrar(actor, activo ? 'ACTIVAR_RECOMENDACION' : 'DESACTIVAR_RECOMENDACION', 'recomendacion', id);
    return recomendacion;
  }

  // ---------- Modelos ----------

  async listarModelos() {
    return this.catalogoRepository.listarModelos();
  }

  // ---------- Ayudantes ----------

  async buscarEnfermedad(id) {
    const enfermedad = await this.catalogoRepository.buscarEnfermedad(id);
    if (!enfermedad) throw new AppError('La enfermedad no existe.', 404);
    return enfermedad;
  }

  async buscarRecomendacion(id) {
    const recomendacion = await this.catalogoRepository.buscarRecomendacion(id);
    if (!recomendacion) throw new AppError('La recomendación no existe.', 404);
    return recomendacion;
  }

  async registrar(actor, accion, tabla, registroId) {
    await this.bitacora.registrar({ usuarioId: actor.id, accion, tabla, registroId, resultado: 'exito' });
  }
}

module.exports = CatalogoCasosDeUso;
