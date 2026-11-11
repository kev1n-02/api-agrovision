// =====================================================================
// CAPA INTERFACES · Controlador HTTP de sensores y mediciones
// =====================================================================
const { exito } = require('../../../shared/utils/respuesta');
const { leerId } = require('../../../shared/utils/leerId');
const { leerRango } = require('../../../shared/utils/rangoFechas');

class SensorController {
  /**
   * @param {import('../application/SensorCasosDeUso')} sensores
   * @param {import('../application/MedicionCasosDeUso')} mediciones
   */
  constructor(sensores, mediciones) {
    this.sensores = sensores;
    this.mediciones = mediciones;
  }

  /** GET /api/v1/parcelas/:parcelaId/sensores */
  listar = async (req, res, next) => {
    try {
      const lista = await this.sensores.listarPorParcela(leerId(req.params.parcelaId, 'id de la parcela'), req.usuario);
      return exito(res, 'Sensores de la parcela.', lista);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/parcelas/:parcelaId/sensores */
  crear = async (req, res, next) => {
    try {
      const resultado = await this.sensores.crear(leerId(req.params.parcelaId, 'id de la parcela'), req.body || {}, req.usuario);
      const mensaje = resultado.clave
        ? 'Sensor registrado. Guarde la clave: no se volverá a mostrar.'
        : 'Sensor registrado correctamente.';
      return exito(res, mensaje, resultado, 201);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/sensores/:id/regenerar-clave */
  regenerarClave = async (req, res, next) => {
    try {
      const resultado = await this.sensores.regenerarClave(leerId(req.params.id, 'id del sensor'), req.usuario);
      return exito(res, 'Clave nueva generada. La anterior ya no funciona. Guarde esta clave: no se volverá a mostrar.', resultado);
    } catch (error) {
      return next(error);
    }
  };

  /** PATCH /api/v1/sensores/:id/estado  · body: { "activo": false } */
  cambiarEstado = async (req, res, next) => {
    try {
      const { activo } = req.body || {};
      const sensor = await this.sensores.cambiarEstado(leerId(req.params.id, 'id del sensor'), activo, req.usuario);
      return exito(res, activo ? 'Sensor activado.' : 'Sensor desactivado.', sensor);
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/sensores/:id/mediciones?desde=AAAA-MM-DD&hasta=AAAA-MM-DD */
  listarMediciones = async (req, res, next) => {
    try {
      const rango = leerRango(req.query.desde, req.query.hasta);
      const lista = await this.mediciones.listar(leerId(req.params.id, 'id del sensor'), rango, req.usuario);
      return exito(res, `Mediciones del ${rango.desde} al ${rango.hasta}.`, lista);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/sensores/:id/mediciones  (registro manual, con token) */
  registrarManual = async (req, res, next) => {
    try {
      const medicion = await this.mediciones.registrarManual(leerId(req.params.id, 'id del sensor'), req.body || {}, req.usuario);
      return exito(res, 'Medición registrada correctamente.', medicion, 201);
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/ingesta/mediciones  (ESP32, con encabezado x-api-key) */
  ingesta = async (req, res, next) => {
    try {
      const medicion = await this.mediciones.registrarDesdeSensor(req.headers['x-api-key'], req.body || {});
      return exito(res, 'Medición recibida.', { id: medicion.id, fecha: medicion.fecha }, 201);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = SensorController;
