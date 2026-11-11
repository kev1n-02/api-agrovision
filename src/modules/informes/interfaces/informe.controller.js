// =====================================================================
// CAPA INTERFACES · Controlador HTTP de informes
// =====================================================================
const { exito } = require('../../../shared/utils/respuesta');
const { leerId } = require('../../../shared/utils/leerId');

class InformeController {
  /** @param {import('../application/InformeCasosDeUso')} casosDeUso */
  constructor(casosDeUso) {
    this.casosDeUso = casosDeUso;
  }

  /** POST /api/v1/parcelas/:parcelaId/informes · body: { "desde": "2026-11-01", "hasta": "2026-11-30" } */
  generar = async (req, res, next) => {
    try {
      const informe = await this.casosDeUso.generar(leerId(req.params.parcelaId, 'id de la parcela'), req.body || {}, req.usuario);
      return exito(res, 'Informe generado como borrador. Revise la propuesta y emítalo.', informe, 201);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/parcelas/:parcelaId/informes */
  listarPorParcela = async (req, res, next) => {
    try {
      const lista = await this.casosDeUso.listar({
        parcelaId: leerId(req.params.parcelaId, 'id de la parcela'),
        estado: req.query.estado || null,
      }, req.usuario);
      return exito(res, 'Informes de la parcela.', lista);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/informes?estado=emitido */
  listar = async (req, res, next) => {
    try {
      const lista = await this.casosDeUso.listar({ estado: req.query.estado || null }, req.usuario);
      return exito(res, 'Listado de informes.', lista);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/informes/:id */
  obtener = async (req, res, next) => {
    try {
      const informe = await this.casosDeUso.obtener(leerId(req.params.id, 'id del informe'), req.usuario);
      return exito(res, 'Detalle del informe.', informe);
    } catch (error) {
      return next(error);
    }
  };

  /** PUT /api/v1/informes/:id/propuesta */
  actualizarPropuesta = async (req, res, next) => {
    try {
      const informe = await this.casosDeUso.actualizarPropuesta(leerId(req.params.id, 'id del informe'), req.body || {}, req.usuario);
      return exito(res, 'Propuesta actualizada.', informe);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/informes/:id/emitir */
  emitir = async (req, res, next) => {
    try {
      const informe = await this.casosDeUso.emitir(leerId(req.params.id, 'id del informe'), req.usuario);
      return exito(res, 'Informe emitido. Ya no se puede modificar.', informe);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/informes/:id/pdf  (descarga el PDF, no JSON) */
  pdf = async (req, res, next) => {
    try {
      const { contenido, nombre } = await this.casosDeUso.pdf(leerId(req.params.id, 'id del informe'), req.usuario);
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="${nombre}"`);
      return res.send(contenido);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = InformeController;
