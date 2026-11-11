// =====================================================================
// CAPA DOMAIN · Entidad Sensor
// Un sensor pertenece a una parcela. Puede ser:
//   manual     → los datos se escriben en un formulario (web o APK)
//   automatico → un ESP32 envía los datos solo, con su propia clave
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

const TIPOS = ['manual', 'automatico'];

class Sensor {
  constructor({ id, parcelaId, parcela, codigo, descripcion, tipo, activo, tieneClave, fechaCrea }) {
    this.id = id;
    this.parcelaId = parcelaId;
    this.parcela = parcela;       // código de la parcela (P-01)
    this.codigo = codigo;         // ej.: SEN-P01
    this.descripcion = descripcion;
    this.tipo = tipo;
    this.activo = activo;
    this.tieneClave = tieneClave; // true si ya tiene clave de ESP32 (nunca se muestra la clave)
    this.fechaCrea = fechaCrea;
  }

  /** Valida los datos de un sensor nuevo y los devuelve limpios. */
  static validar({ codigo, descripcion, tipo } = {}) {
    const errores = [];
    const texto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim());

    if (!texto(codigo) || texto(codigo).length > 30) {
      errores.push({ campo: 'codigo', mensaje: 'Ingrese el código del sensor (máximo 30 caracteres).' });
    }
    if (texto(descripcion).length > 100) {
      errores.push({ campo: 'descripcion', mensaje: 'La descripción no puede superar 100 caracteres.' });
    }
    if (!TIPOS.includes(texto(tipo))) {
      errores.push({ campo: 'tipo', mensaje: 'El tipo debe ser "manual" o "automatico".' });
    }

    if (errores.length > 0) {
      throw new AppError('Los datos del sensor no son válidos.', 422, errores);
    }

    return {
      codigo: texto(codigo).toUpperCase(),
      descripcion: texto(descripcion) || null,
      tipo: texto(tipo),
    };
  }
}

module.exports = Sensor;
