// =====================================================================
// CAPA DOMAIN · Entidad Seguimiento
// Evaluación en campo: de N hojas revisadas, cuántas están afectadas y
// con qué severidad (0 = sana ... 5 = muy afectada).
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const { esFechaValida, hoy } = require('../../../shared/utils/fechas');

const texto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim());

class Seguimiento {
  constructor({ id, tratamientoId, fecha, hojasEvaluadas, hojasAfectadas, severidad, observaciones, registradoPor }) {
    this.id = id;
    this.tratamientoId = tratamientoId;
    this.fecha = fecha;
    this.hojasEvaluadas = hojasEvaluadas;
    this.hojasAfectadas = hojasAfectadas;
    this.severidad = severidad;
    this.observaciones = observaciones;
    this.registradoPor = registradoPor;
  }

  /**
   * Valida una evaluación.
   * @param {object} datos
   * @param {string} fechaInicioTratamiento  La evaluación no puede ser anterior al inicio del tratamiento.
   */
  static validar({ fecha, hojasEvaluadas, hojasAfectadas, severidad, observaciones } = {}, fechaInicioTratamiento) {
    const errores = [];
    const fechaLimpia = texto(fecha);

    if (!esFechaValida(fechaLimpia)) {
      errores.push({ campo: 'fecha', mensaje: 'Ingrese la fecha de la evaluación con el formato AAAA-MM-DD.' });
    } else if (fechaLimpia > hoy()) {
      errores.push({ campo: 'fecha', mensaje: 'La fecha de la evaluación no puede ser futura.' });
    } else if (fechaLimpia < fechaInicioTratamiento) {
      errores.push({ campo: 'fecha', mensaje: `La evaluación no puede ser anterior al inicio del tratamiento (${fechaInicioTratamiento}).` });
    }

    const evaluadas = Number(hojasEvaluadas);
    const afectadas = Number(hojasAfectadas);
    if (!Number.isInteger(evaluadas) || evaluadas <= 0) {
      errores.push({ campo: 'hojasEvaluadas', mensaje: 'Las hojas evaluadas deben ser un número entero mayor a 0.' });
    }
    if (!Number.isInteger(afectadas) || afectadas < 0) {
      errores.push({ campo: 'hojasAfectadas', mensaje: 'Las hojas afectadas deben ser un número entero (0 o más).' });
    } else if (Number.isInteger(evaluadas) && evaluadas > 0 && afectadas > evaluadas) {
      // Solo se compara si las evaluadas son válidas; si no, ya hay un mensaje para ese campo.
      errores.push({ campo: 'hojasAfectadas', mensaje: 'Las hojas afectadas no pueden ser más que las evaluadas.' });
    }

    let severidadLimpia = null;
    if (texto(severidad) !== '') {
      severidadLimpia = Number(severidad);
      if (!Number.isInteger(severidadLimpia) || severidadLimpia < 0 || severidadLimpia > 5) {
        errores.push({ campo: 'severidad', mensaje: 'La severidad debe ser un entero de 0 (sana) a 5 (muy afectada).' });
      }
    }
    if (texto(observaciones).length > 1000) {
      errores.push({ campo: 'observaciones', mensaje: 'Las observaciones no pueden superar 1000 caracteres.' });
    }

    if (errores.length > 0) {
      throw new AppError('Los datos de la evaluación no son válidos.', 422, errores);
    }

    return {
      fecha: fechaLimpia,
      hojasEvaluadas: evaluadas,
      hojasAfectadas: afectadas,
      severidad: severidadLimpia,
      observaciones: texto(observaciones) || null,
    };
  }
}

module.exports = Seguimiento;
