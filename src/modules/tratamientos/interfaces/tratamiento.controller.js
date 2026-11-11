// =====================================================================
// CAPA INTERFACES · Controlador HTTP de tratamientos y seguimientos
// =====================================================================
const { exito } = require('../../../shared/utils/respuesta');
const { leerId } = require('../../../shared/utils/leerId');

class TratamientoController {
  /** @param {import('../application/TratamientoCasosDeUso')} casosDeUso */
  constructor(casosDeUso) {
    this.casosDeUso = casosDeUso;
  }

  /** POST /api/v1/diagnosticos/:id/tratamientos */
  crearDesdeDiagnostico = async (req, res, next) => {
    try {
      const datos = await this.casosDeUso.crearDesdeDiagnostico(leerId(req.params.id, 'id del diagnóstico'), req.body || {}, req.usuario);
      return exito(res, 'Tratamiento registrado correctamente.', datos, 201);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/parcelas/:parcelaId/tratamientos  (body incluye enfermedadId) */
  crearEnParcela = async (req, res, next) => {
    try {
      const datos = await this.casosDeUso.crearEnParcela(leerId(req.params.parcelaId, 'id de la parcela'), req.body || {}, req.usuario);
      return exito(res, 'Tratamiento registrado correctamente.', datos, 201);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/parcelas/:parcelaId/tratamientos?estado= */
  listarPorParcela = async (req, res, next) => {
    try {
      const lista = await this.casosDeUso.listar({
        parcelaId: leerId(req.params.parcelaId, 'id de la parcela'),
        estado: req.query.estado || null,
      }, req.usuario);
      return exito(res, 'Tratamientos de la parcela.', lista);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/tratamientos?estado=activo */
  listar = async (req, res, next) => {
    try {
      const lista = await this.casosDeUso.listar({ estado: req.query.estado || null }, req.usuario);
      return exito(res, 'Listado de tratamientos.', lista);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/tratamientos/:id */
  obtener = async (req, res, next) => {
    try {
      const datos = await this.casosDeUso.obtener(leerId(req.params.id, 'id del tratamiento'), req.usuario);
      return exito(res, 'Detalle del tratamiento.', datos);
    } catch (error) {
      return next(error);
    }
  };

  /** PUT /api/v1/tratamientos/:id */
  actualizar = async (req, res, next) => {
    try {
      const datos = await this.casosDeUso.actualizar(leerId(req.params.id, 'id del tratamiento'), req.body || {}, req.usuario);
      return exito(res, 'Tratamiento actualizado correctamente.', datos);
    } catch (error) {
      return next(error);
    }
  };

  /** PATCH /api/v1/tratamientos/:id/estado · body: { "estado": "cerrado", "fechaFin": "2026-12-15" } */
  cambiarEstado = async (req, res, next) => {
    try {
      const datos = await this.casosDeUso.cambiarEstado(leerId(req.params.id, 'id del tratamiento'), req.body || {}, req.usuario);
      return exito(res, `Tratamiento ${datos.estado}.`, datos);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/tratamientos/:id/seguimientos */
  registrarSeguimiento = async (req, res, next) => {
    try {
      const datos = await this.casosDeUso.registrarSeguimiento(leerId(req.params.id, 'id del tratamiento'), req.body || {}, req.usuario);
      return exito(res, 'Evaluación registrada correctamente.', datos, 201);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = TratamientoController;
