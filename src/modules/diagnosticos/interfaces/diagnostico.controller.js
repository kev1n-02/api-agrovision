// =====================================================================
// CAPA INTERFACES · Controlador HTTP de diagnósticos
// =====================================================================
const { exito } = require('../../../shared/utils/respuesta');
const { leerId } = require('../../../shared/utils/leerId');
const { leerRango } = require('../../../shared/utils/rangoFechas');

class DiagnosticoController {
  /** @param {import('../application/DiagnosticoCasosDeUso')} casosDeUso */
  constructor(casosDeUso) {
    this.casosDeUso = casosDeUso;
  }

  /** POST /api/v1/parcelas/:parcelaId/diagnosticos  (form-data, campo "imagen") */
  crear = async (req, res, next) => {
    try {
      const diagnostico = await this.casosDeUso.crear(leerId(req.params.parcelaId, 'id de la parcela'), req.file, req.usuario);
      let mensaje = diagnostico.concluyente
        ? `Diagnóstico registrado: ${diagnostico.enfermedad}.`
        : 'Diagnóstico registrado, pero no es concluyente: ninguna enfermedad superó su umbral. Tome otra foto o pida revisión al técnico.';
      if (diagnostico.advertencias.length > 0) {
        mensaje += ' Revise las advertencias sobre la calidad de la foto.';
      }
      return exito(res, mensaje, diagnostico, 201);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/parcelas/:parcelaId/diagnosticos?desde=&hasta=&estado= */
  listarPorParcela = async (req, res, next) => {
    try {
      const lista = await this.casosDeUso.listar({
        parcelaId: leerId(req.params.parcelaId, 'id de la parcela'),
        estado: req.query.estado || null,
        rango: leerRango(req.query.desde, req.query.hasta, 90),
      }, req.usuario);
      return exito(res, 'Diagnósticos de la parcela.', lista);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/diagnosticos?estado=pendiente&desde=&hasta= */
  listar = async (req, res, next) => {
    try {
      const lista = await this.casosDeUso.listar({
        estado: req.query.estado || null,
        rango: leerRango(req.query.desde, req.query.hasta, 90),
      }, req.usuario);
      return exito(res, 'Historial de diagnósticos.', lista);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/diagnosticos/:id */
  obtener = async (req, res, next) => {
    try {
      const diagnostico = await this.casosDeUso.obtener(leerId(req.params.id, 'id del diagnóstico'), req.usuario);
      return exito(res, 'Detalle del diagnóstico.', diagnostico);
    } catch (error) {
      return next(error);
    }
  };

  /** PATCH /api/v1/diagnosticos/:id/revision · body: { estado, enfermedadId?, observaciones? } */
  revisar = async (req, res, next) => {
    try {
      const diagnostico = await this.casosDeUso.revisar(leerId(req.params.id, 'id del diagnóstico'), req.body || {}, req.usuario);
      return exito(res, `Diagnóstico ${diagnostico.estado}.`, diagnostico);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/diagnosticos/:id/imagen  (devuelve la foto, no JSON) */
  imagen = async (req, res, next) => {
    try {
      const { contenido, tipo } = await this.casosDeUso.imagen(leerId(req.params.id, 'id del diagnóstico'), req.usuario);
      res.set('Content-Type', tipo);
      res.set('Cache-Control', 'private, max-age=3600');
      return res.send(contenido);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = DiagnosticoController;
