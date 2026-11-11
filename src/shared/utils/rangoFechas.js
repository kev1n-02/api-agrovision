// =====================================================================
// Lee un rango de fechas de la URL: ?desde=2026-11-01&hasta=2026-11-10
// Si no se envía, usa los últimos N días. Máximo 366 días por consulta
// para no traer demasiados datos de una vez.
// =====================================================================
const AppError = require('../errors/AppError');

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Fecha local en formato AAAA-MM-DD. */
function aTexto(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * @param {string|undefined} desde
 * @param {string|undefined} hasta
 * @param {number} diasPorDefecto
 * @returns {{ desde: string, hasta: string }}
 */
function leerRango(desde, hasta, diasPorDefecto = 7) {
  const hoy = new Date();
  const finTexto = hasta || aTexto(hoy);
  const inicioTexto = desde || aTexto(new Date(hoy.getTime() - (diasPorDefecto - 1) * DIA_MS));

  const errores = [];
  if (!FORMATO.test(inicioTexto) || Number.isNaN(Date.parse(inicioTexto))) {
    errores.push({ campo: 'desde', mensaje: 'La fecha debe tener el formato AAAA-MM-DD.' });
  }
  if (!FORMATO.test(finTexto) || Number.isNaN(Date.parse(finTexto))) {
    errores.push({ campo: 'hasta', mensaje: 'La fecha debe tener el formato AAAA-MM-DD.' });
  }
  if (errores.length > 0) {
    throw new AppError('El rango de fechas no es válido.', 400, errores);
  }

  const dias = (Date.parse(finTexto) - Date.parse(inicioTexto)) / DIA_MS;
  if (dias < 0) {
    throw new AppError('La fecha "desde" debe ser anterior o igual a "hasta".', 400);
  }
  if (dias > 366) {
    throw new AppError('El rango máximo es de 366 días.', 400);
  }

  return { desde: inicioTexto, hasta: finTexto };
}

module.exports = { leerRango };
