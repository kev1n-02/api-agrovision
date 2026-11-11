// =====================================================================
// CAPA APPLICATION · Casos de uso de sensores
// Listar, crear, activar/desactivar y regenerar la clave del ESP32.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const Sensor = require('../domain/Sensor');

class SensorCasosDeUso {
  /**
   * @param {import('../domain/SensorRepository').SensorRepository} sensorRepository
   * @param {import('../../parcelas/application/AccesoParcela')} accesoParcela
   * @param {{ generar: Function }} servicioClave
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(sensorRepository, accesoParcela, servicioClave, bitacora) {
    this.sensorRepository = sensorRepository;
    this.accesoParcela = accesoParcela;
    this.servicioClave = servicioClave;
    this.bitacora = bitacora;
  }

  async listarPorParcela(parcelaId, actor) {
    await this.accesoParcela.verificar(parcelaId, actor, 'ver');
    return this.sensorRepository.listarPorParcela(parcelaId);
  }

  /**
   * Crea un sensor. Si es automático, genera su clave.
   * @returns {Promise<{ sensor: Sensor, clave: string|null }>}
   *   La clave se devuelve SOLO aquí; después no se puede volver a ver.
   */
  async crear(parcelaId, datos, actor) {
    const { parcela } = await this.accesoParcela.verificar(parcelaId, actor, 'editar');
    if (!parcela.activo) {
      throw new AppError('No se pueden agregar sensores a una parcela inactiva.', 400);
    }

    const limpio = Sensor.validar(datos);
    if (await this.sensorRepository.existeCodigo(limpio.codigo)) {
      throw new AppError('Ya existe un sensor con ese código.', 409, [
        { campo: 'codigo', mensaje: `El código ${limpio.codigo} ya está en uso.` },
      ]);
    }

    const nuevaClave = limpio.tipo === 'automatico' ? this.servicioClave.generar() : null;

    const sensor = await this.sensorRepository.crear({
      ...limpio,
      parcelaId,
      hashClave: nuevaClave ? nuevaClave.hash : null,
      usuarioCreaId: actor.id,
    });
    await this.registrar(actor, 'CREAR_SENSOR', sensor.id);

    return { sensor, clave: nuevaClave ? nuevaClave.clave : null };
  }

  /** Genera una clave nueva (por ejemplo, si se perdió o se robó el ESP32). */
  async regenerarClave(sensorId, actor) {
    const sensor = await this.buscarConPermiso(sensorId, actor, 'editar');
    if (sensor.tipo !== 'automatico') {
      throw new AppError('Solo los sensores automáticos usan clave.', 400);
    }
    const nuevaClave = this.servicioClave.generar();
    await this.sensorRepository.guardarClave(sensorId, nuevaClave.hash, actor.id);
    await this.registrar(actor, 'REGENERAR_CLAVE_SENSOR', sensorId);
    return { sensor: await this.sensorRepository.buscarPorId(sensorId), clave: nuevaClave.clave };
  }

  /** Un sensor inactivo no puede enviar ni recibir mediciones. */
  async cambiarEstado(sensorId, activo, actor) {
    if (typeof activo !== 'boolean') {
      throw new AppError('El estado no es válido.', 422, [{ campo: 'activo', mensaje: 'Debe ser true o false.' }]);
    }
    await this.buscarConPermiso(sensorId, actor, 'editar');
    const sensor = await this.sensorRepository.cambiarEstado(sensorId, activo, actor.id);
    await this.registrar(actor, activo ? 'ACTIVAR_SENSOR' : 'DESACTIVAR_SENSOR', sensorId);
    return sensor;
  }

  async buscarConPermiso(sensorId, actor, accion) {
    const sensor = await this.sensorRepository.buscarPorId(sensorId);
    if (!sensor) {
      throw new AppError('El sensor no existe.', 404);
    }
    await this.accesoParcela.verificar(sensor.parcelaId, actor, accion);
    return sensor;
  }

  async registrar(actor, accion, sensorId) {
    await this.bitacora.registrar({
      usuarioId: actor.id, accion, tabla: 'sensor', registroId: sensorId, resultado: 'exito',
    });
  }
}

module.exports = SensorCasosDeUso;
