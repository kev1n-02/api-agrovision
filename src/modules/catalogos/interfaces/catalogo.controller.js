// =====================================================================
// CAPA INTERFACES · Controlador HTTP de catálogos
// =====================================================================
const { exito } = require('../../../shared/utils/respuesta');
const { leerId } = require('../../../shared/utils/leerId');

class CatalogoController {
  /** @param {import('../application/CatalogoCasosDeUso')} casosDeUso */
  constructor(casosDeUso) {
    this.casosDeUso = casosDeUso;
  }

  /** GET /api/v1/enfermedades */
  listarEnfermedades = async (req, res, next) => {
    try {
      return exito(res, 'Catálogo de enfermedades.', await this.casosDeUso.listarEnfermedades());
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/enfermedades/:id  (incluye sus recomendaciones) */
  obtenerEnfermedad = async (req, res, next) => {
    try {
      const datos = await this.casosDeUso.obtenerEnfermedad(leerId(req.params.id, 'id de la enfermedad'), req.usuario);
      return exito(res, 'Datos de la enfermedad.', datos);
    } catch (error) {
      return next(error);
    }
  };

  /** PUT /api/v1/enfermedades/:id */
  actualizarEnfermedad = async (req, res, next) => {
    try {
      const datos = await this.casosDeUso.actualizarEnfermedad(leerId(req.params.id, 'id de la enfermedad'), req.body || {}, req.usuario);
      return exito(res, 'Enfermedad actualizada correctamente.', datos);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/enfermedades/:id/recomendaciones */
  listarRecomendaciones = async (req, res, next) => {
    try {
      const lista = await this.casosDeUso.listarRecomendaciones(leerId(req.params.id, 'id de la enfermedad'), req.usuario);
      return exito(res, 'Recomendaciones de la enfermedad.', lista);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/enfermedades/:id/recomendaciones */
  crearRecomendacion = async (req, res, next) => {
    try {
      const datos = await this.casosDeUso.crearRecomendacion(leerId(req.params.id, 'id de la enfermedad'), req.body || {}, req.usuario);
      return exito(res, 'Recomendación registrada correctamente.', datos, 201);
    } catch (error) {
      return next(error);
    }
  };

  /** PUT /api/v1/recomendaciones/:id */
  actualizarRecomendacion = async (req, res, next) => {
    try {
      const datos = await this.casosDeUso.actualizarRecomendacion(leerId(req.params.id, 'id de la recomendación'), req.body || {}, req.usuario);
      return exito(res, 'Recomendación actualizada correctamente.', datos);
    } catch (error) {
      return next(error);
    }
  };

  /** PATCH /api/v1/recomendaciones/:id/estado · body: { "activo": false } */
  cambiarEstadoRecomendacion = async (req, res, next) => {
    try {
      const { activo } = req.body || {};
      const datos = await this.casosDeUso.cambiarEstadoRecomendacion(leerId(req.params.id, 'id de la recomendación'), activo, req.usuario);
      return exito(res, activo ? 'Recomendación activada.' : 'Recomendación desactivada.', datos);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/modelos */
  listarModelos = async (req, res, next) => {
    try {
      return exito(res, 'Modelos de IA registrados.', await this.casosDeUso.listarModelos());
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = CatalogoController;
