// =====================================================================
// Formato único de respuesta exitosa. Todas las respuestas de la API
// tienen la misma forma, así la web y la APK las leen igual:
//   { ok: true, mensaje: '...', data: {...} }
// Las respuestas de error las arma errores.middleware.js.
// =====================================================================

/**
 * Envía una respuesta exitosa.
 * @param {import('express').Response} res
 * @param {string} mensaje
 * @param {*} data
 * @param {number} estado  200 por defecto; 201 cuando se crea algo.
 */
function exito(res, mensaje, data = null, estado = 200) {
  return res.status(estado).json({ ok: true, mensaje, data });
}

module.exports = { exito };
