// =====================================================================
// Convierte un id que llega en la URL (texto) en número entero.
// Ej.: /fincas/5 → 5. Si llega /fincas/abc, responde 400.
// =====================================================================
const AppError = require('../errors/AppError');

/**
 * @param {string|number} valor
 * @param {string} nombre  Para el mensaje de error (ej.: 'id de la finca')
 * @returns {number}
 */
function leerId(valor, nombre = 'id') {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`El ${nombre} no es válido.`, 400);
  }
  return id;
}

module.exports = { leerId };
