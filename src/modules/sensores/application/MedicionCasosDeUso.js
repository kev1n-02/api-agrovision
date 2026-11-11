// =====================================================================
// CAPA APPLICATION · Casos de uso de mediciones
//   registrarManual      → una persona escribe los valores (con token)
//   registrarDesdeSensor → el ESP32 envía los valores (con su clave)
//   listar               → historial de un sensor por rango de fechas
// Las dos formas de registrar usan la misma validación (Medicion.validar).
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const Medicion = require('../domain/Medicion');

class MedicionCasosDeUso {
  /**
   * @param {import('../domain/SensorRepository').MedicionRepository} medicionRepository
   * @param {import('./SensorCasosDeUso')} sensores  Para buscar el sensor y verificar permisos
   * @param {import('../domain/SensorRepository').SensorRepository} sensorRepository
   * @param {{ hashear: Function }} servicioClave
   */
  constructor(medicionRepository, sensores, sensorRepository, servicioClave) {
    this.medicionRepository = medicionRepository;
    this.sensores = sensores;
    this.sensorRepository = sensorRepository;
    this.servicioClave = servicioClave;
  }

  async registrarManual(sensorId, datos, actor) {
    const sensor = await this.sensores.buscarConPermiso(sensorId, actor, 'editar');
    if (!sensor.activo) {
      throw new AppError('El sensor está inactivo.', 400);
    }
    const limpio = Medicion.validar(datos);
    return this.guardar(sensor.id, limpio, 'manual', actor.id);
  }

  /**
   * Ruta del ESP32: no usa token de usuario, usa la clave del sensor
   * (encabezado x-api-key). Se busca el sensor por el hash de esa clave.
   */
  async registrarDesdeSensor(clave, datos) {
    if (!clave) {
      throw new AppError('Falta la clave del sensor (encabezado x-api-key).', 401);
    }
    const sensor = await this.sensorRepository.buscarPorClave(this.servicioClave.hashear(clave));
    if (!sensor || !sensor.activo) {
      throw new AppError('Clave de sensor inválida o sensor inactivo.', 401);
    }
    const limpio = Medicion.validar(datos);
    return this.guardar(sensor.id, limpio, 'sensor', null);
  }

  async listar(sensorId, rango, actor) {
    await this.sensores.buscarConPermiso(sensorId, actor, 'ver');
    return this.medicionRepository.listarPorSensor(sensorId, rango.desde, rango.hasta);
  }

  /** Guarda la medición evitando duplicados (mismo sensor, misma fecha y hora). */
  async guardar(sensorId, limpio, origen, usuarioCreaId) {
    if (limpio.fecha && await this.medicionRepository.existe(sensorId, limpio.fecha)) {
      throw new AppError('Ya existe una medición de este sensor en esa fecha y hora.', 409, [
        { campo: 'fecha', mensaje: 'Medición duplicada.' },
      ]);
    }
    return this.medicionRepository.crear({ ...limpio, sensorId, origen, usuarioCreaId });
  }
}

module.exports = MedicionCasosDeUso;
