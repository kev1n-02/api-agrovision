// =====================================================================
// CAPA INTERFACES · Controlador HTTP de clima y umbrales
// =====================================================================
const { exito } = require('../../../shared/utils/respuesta');
const { leerId } = require('../../../shared/utils/leerId');
const { leerRango } = require('../../../shared/utils/rangoFechas');

class ClimaController {
  /** @param {import('../application/ClimaCasosDeUso')} casosDeUso */
  constructor(casosDeUso) {
    this.casosDeUso = casosDeUso;
  }

  /** GET /api/v1/parcelas/:parcelaId/clima?desde=AAAA-MM-DD&hasta=AAAA-MM-DD */
  analizar = async (req, res, next) => {
    try {
      const rango = leerRango(req.query.desde, req.query.hasta, 14);
      const analisis = await this.casosDeUso.analizarParcela(leerId(req.params.parcelaId, 'id de la parcela'), rango, req.usuario);
      return exito(res, 'Análisis de clima de la parcela.', analisis);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/umbrales */
  listarUmbrales = async (req, res, next) => {
    try {
      return exito(res, 'Umbrales ambientales de referencia.', await this.casosDeUso.listarUmbrales());
    } catch (error) {
      return next(error);
    }
  };

  /** PUT /api/v1/umbrales/:id */
  actualizarUmbral = async (req, res, next) => {
    try {
      const umbral = await this.casosDeUso.actualizarUmbral(leerId(req.params.id, 'id del umbral'), req.body || {}, req.usuario);
      return exito(res, 'Umbral actualizado correctamente.', umbral);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = ClimaController;
