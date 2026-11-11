// =====================================================================
// CAPA INTERFACES · Controlador HTTP de fincas
// req.usuario viene del token (lo pone requiereToken).
// =====================================================================
const { exito } = require('../../../shared/utils/respuesta');
const { leerId } = require('../../../shared/utils/leerId');

class FincaController {
  /** @param {import('../application/FincaCasosDeUso')} casosDeUso */
  constructor(casosDeUso) {
    this.casosDeUso = casosDeUso;
  }

  /** GET /api/v1/fincas */
  listar = async (req, res, next) => {
    try {
      const fincas = await this.casosDeUso.listar(req.usuario);
      return exito(res, 'Listado de fincas.', fincas);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/fincas/:id */
  obtener = async (req, res, next) => {
    try {
      const finca = await this.casosDeUso.obtener(leerId(req.params.id, 'id de la finca'), req.usuario);
      return exito(res, 'Datos de la finca.', finca);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/fincas */
  crear = async (req, res, next) => {
    try {
      const finca = await this.casosDeUso.crear(req.body || {}, req.usuario);
      return exito(res, 'Finca registrada correctamente.', finca, 201);
    } catch (error) {
      return next(error);
    }
  };

  /** PUT /api/v1/fincas/:id */
  actualizar = async (req, res, next) => {
    try {
      const finca = await this.casosDeUso.actualizar(leerId(req.params.id, 'id de la finca'), req.body || {}, req.usuario);
      return exito(res, 'Finca actualizada correctamente.', finca);
    } catch (error) {
      return next(error);
    }
  };

  /** PATCH /api/v1/fincas/:id/estado  · body: { "activo": false } */
  cambiarEstado = async (req, res, next) => {
    try {
      const { activo } = req.body || {};
      const finca = await this.casosDeUso.cambiarEstado(leerId(req.params.id, 'id de la finca'), activo, req.usuario);
      return exito(res, activo ? 'Finca activada.' : 'Finca desactivada.', finca);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = FincaController;
