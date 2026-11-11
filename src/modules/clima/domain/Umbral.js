// =====================================================================
// CAPA DOMAIN · Entidad Umbral (condición de clima favorable)
// Un umbral dice qué clima favorece una enfermedad, según la literatura.
// Un valor null significa "ese criterio no se exige".
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

class Umbral {
  constructor({ id, enfermedadId, enfermedad, codigo, tempMin, tempMax, humedadMin, horasMin, descripcion, fuente, provisional }) {
    this.id = id;
    this.enfermedadId = enfermedadId;
    this.enfermedad = enfermedad;   // nombre en español
    this.codigo = codigo;           // etiqueta del modelo (scab, rust...)
    this.tempMin = tempMin;         // °C
    this.tempMax = tempMax;         // °C
    this.humedadMin = humedadMin;   // %
    this.horasMin = horasMin;       // horas seguidas
    this.descripcion = descripcion;
    this.fuente = fuente;
    this.provisional = provisional; // true = falta confirmarlo con el técnico
  }

  /**
   * ¿Esta medición cumple la condición? Si un criterio se exige y la
   * medición no trae ese dato, no cuenta (no se puede comprobar).
   */
  cumple(medicion) {
    if (this.tempMin !== null || this.tempMax !== null) {
      if (medicion.temperatura === null) return false;
      if (this.tempMin !== null && medicion.temperatura < this.tempMin) return false;
      if (this.tempMax !== null && medicion.temperatura > this.tempMax) return false;
    }
    if (this.humedadMin !== null) {
      if (medicion.humedad === null || medicion.humedad < this.humedadMin) return false;
    }
    return true;
  }

  /** Valida los cambios que envía el técnico o el administrador. */
  static validarCambios({ tempMin, tempMax, humedadMin, horasMin, descripcion, provisional } = {}) {
    const errores = [];
    const vacio = (valor) => valor === undefined || valor === null || String(valor).trim() === '';

    const numero = (valor, campo, minimo, maximo, mensaje) => {
      if (vacio(valor)) return null;
      const n = Number(valor);
      if (!Number.isFinite(n) || n < minimo || n > maximo) {
        errores.push({ campo, mensaje });
        return null;
      }
      return n;
    };

    const limpio = {
      tempMin: numero(tempMin, 'tempMin', -20, 60, 'La temperatura mínima debe estar entre -20 y 60 °C.'),
      tempMax: numero(tempMax, 'tempMax', -20, 60, 'La temperatura máxima debe estar entre -20 y 60 °C.'),
      humedadMin: numero(humedadMin, 'humedadMin', 0, 100, 'La humedad mínima debe estar entre 0 y 100 %.'),
      horasMin: numero(horasMin, 'horasMin', 0.5, 240, 'Las horas mínimas deben estar entre 0,5 y 240.'),
      descripcion: vacio(descripcion) ? null : String(descripcion).trim(),
      provisional: provisional === undefined ? null : provisional,
    };

    if (limpio.tempMin !== null && limpio.tempMax !== null && limpio.tempMin > limpio.tempMax) {
      errores.push({ campo: 'tempMax', mensaje: 'La temperatura máxima debe ser mayor o igual a la mínima.' });
    }
    if (limpio.provisional !== null && typeof limpio.provisional !== 'boolean') {
      errores.push({ campo: 'provisional', mensaje: 'Debe ser true o false.' });
    }

    if (errores.length > 0) {
      throw new AppError('Los datos del umbral no son válidos.', 422, errores);
    }
    return limpio;
  }
}

module.exports = Umbral;
