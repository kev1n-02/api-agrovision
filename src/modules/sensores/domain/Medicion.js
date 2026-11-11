// =====================================================================
// CAPA DOMAIN · Entidad Medicion
// Una lectura de clima: temperatura (°C), humedad relativa (%) y
// luminosidad (lux), con fecha y hora.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

// Acepta 2026-11-10T08:15, 2026-11-10 08:15 o con segundos (08:15:00).
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;
// Se toleran 5 minutos de diferencia de reloj entre el dispositivo y el servidor.
const TOLERANCIA_FUTURO_MS = 5 * 60 * 1000;

class Medicion {
  constructor({ id, sensorId, fecha, temperatura, humedad, luminosidad, origen }) {
    this.id = id;
    this.sensorId = sensorId;
    this.fecha = fecha;             // 'AAAA-MM-DD HH:MM:SS' (hora local)
    this.temperatura = temperatura; // °C
    this.humedad = humedad;         // %
    this.luminosidad = luminosidad; // lux
    this.origen = origen;           // manual | sensor | prueba
  }

  /**
   * Valida una lectura y la devuelve limpia.
   * La fecha es opcional: si no llega, la base pone la hora actual.
   */
  static validar({ fecha, temperatura, humedad, luminosidad } = {}) {
    const errores = [];
    const vacio = (valor) => valor === undefined || valor === null || String(valor).trim() === '';

    // Convierte a número y revisa el rango. Devuelve null si no se envió.
    const numero = (valor, campo, minimo, maximo, mensaje) => {
      if (vacio(valor)) return null;
      const n = Number(valor);
      if (!Number.isFinite(n) || n < minimo || n > maximo) {
        errores.push({ campo, mensaje });
        return null;
      }
      return n;
    };

    const temp = numero(temperatura, 'temperatura', -20, 60, 'La temperatura debe estar entre -20 y 60 °C.');
    const hum = numero(humedad, 'humedad', 0, 100, 'La humedad debe estar entre 0 y 100 %.');
    const luz = numero(luminosidad, 'luminosidad', 0, 200000, 'La luminosidad debe estar entre 0 y 200 000 lux.');

    if (vacio(temperatura) && vacio(humedad) && vacio(luminosidad)) {
      errores.push({ campo: 'temperatura', mensaje: 'Envíe al menos un valor: temperatura, humedad o luminosidad.' });
    }

    let fechaLimpia = null;
    if (!vacio(fecha)) {
      const texto = String(fecha).trim();
      const momento = Date.parse(texto.replace(' ', 'T'));
      if (!FORMATO_FECHA.test(texto) || Number.isNaN(momento)) {
        errores.push({ campo: 'fecha', mensaje: 'La fecha debe tener el formato AAAA-MM-DD HH:MM.' });
      } else if (momento > Date.now() + TOLERANCIA_FUTURO_MS) {
        errores.push({ campo: 'fecha', mensaje: 'La fecha de la medición no puede ser futura.' });
      } else {
        fechaLimpia = texto.replace('T', ' ');
        if (fechaLimpia.length === 16) fechaLimpia += ':00';
      }
    }

    if (errores.length > 0) {
      throw new AppError('Los datos de la medición no son válidos.', 422, errores);
    }

    return { fecha: fechaLimpia, temperatura: temp, humedad: hum, luminosidad: luz };
  }
}

module.exports = Medicion;
