// =====================================================================
// CAPA INTERFACES · Controlador HTTP de parcelas
// =====================================================================
const { exito } = require('../../../shared/utils/respuesta');
const { leerId } = require('../../../shared/utils/leerId');

class ParcelaController {
  /** @param {import('../application/ParcelaCasosDeUso')} casosDeUso */
  constructor(casosDeUso) {
    this.casosDeUso = casosDeUso;
  }

  /** GET /api/v1/fincas/:fincaId/parcelas */
  listarPorFinca = async (req, res, next) => {
    try {
      const parcelas = await this.casosDeUso.listarPorFinca(leerId(req.params.fincaId, 'id de la finca'), req.usuario);
      return exito(res, 'Listado de parcelas.', parcelas);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/parcelas/:id */
  obtener = async (req, res, next) => {
    try {
      const parcela = await this.casosDeUso.obtener(leerId(req.params.id, 'id de la parcela'), req.usuario);
      return exito(res, 'Datos de la parcela.', parcela);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/fincas/:fincaId/parcelas */
  crear = async (req, res, next) => {
    try {
      const parcela = await this.casosDeUso.crear(leerId(req.params.fincaId, 'id de la finca'), req.body || {}, req.usuario);
      return exito(res, 'Parcela registrada correctamente.', parcela, 201);
    } catch (error) {
      return next(error);
    }
  };

  /** PUT /api/v1/parcelas/:id */
  actualizar = async (req, res, next) => {
    try {
      const parcela = await this.casosDeUso.actualizar(leerId(req.params.id, 'id de la parcela'), req.body || {}, req.usuario);
      return exito(res, 'Parcela actualizada correctamente.', parcela);
    } catch (error) {
      return next(error);
    }
  };

  /** PATCH /api/v1/parcelas/:id/estado  · body: { "activo": false } */
  cambiarEstado = async (req, res, next) => {
    try {
      const { activo } = req.body || {};
      const parcela = await this.casosDeUso.cambiarEstado(leerId(req.params.id, 'id de la parcela'), activo, req.usuario);
      return exito(res, activo ? 'Parcela activada.' : 'Parcela desactivada.', parcela);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = ParcelaController;
