// =====================================================================
// Manejo central de errores.
// Todos los errores llegan aquí (los controladores llaman a next(error)),
// así cada ruta no tiene que armar su propio mensaje de error.
// Formato: { ok: false, mensaje: '...', errores: [{ campo, mensaje }] }
// =====================================================================
const AppError = require('../errors/AppError');

/** Responde 404 cuando la ruta pedida no existe. */
function rutaNoEncontrada(req, res) {
  res.status(404).json({ ok: false, mensaje: `La ruta ${req.method} ${req.originalUrl} no existe.`, errores: [] });
}

/** Convierte cualquier error en una respuesta JSON clara. */
// eslint-disable-next-line no-unused-vars
function manejarErrores(error, req, res, next) {
  // 1. Errores que nosotros lanzamos a propósito (validaciones, permisos...)
  if (error instanceof AppError) {
    return res.status(error.estado).json({ ok: false, mensaje: error.message, errores: error.errores });
  }

  // 2. JSON mal escrito en el cuerpo de la petición
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, mensaje: 'El cuerpo de la petición no es un JSON válido.', errores: [] });
  }

  // 3. Errores al subir archivos (multer)
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ ok: false, mensaje: 'La imagen supera el tamaño máximo de 10 MB.', errores: [{ campo: 'imagen', mensaje: 'Reduzca el tamaño de la foto.' }] });
    }
    return res.status(400).json({ ok: false, mensaje: 'Envíe una sola imagen en el campo "imagen".', errores: [{ campo: 'imagen', mensaje: 'Archivo no válido.' }] });
  }

  // 4. Errores de PostgreSQL por restricciones (última barrera de la BD)
  if (error.code === '23505') {
    return res.status(409).json({ ok: false, mensaje: 'Ya existe un registro con esos datos.', errores: [] });
  }
  if (error.code === '23503') {
    return res.status(400).json({ ok: false, mensaje: 'El registro relacionado no existe.', errores: [] });
  }
  if (error.code === '23514') {
    return res.status(422).json({ ok: false, mensaje: 'Un valor está fuera del rango permitido.', errores: [] });
  }

  // 5. Error inesperado: se registra en la consola del servidor, pero al
  //    usuario no se le muestran detalles internos (SQL, rutas, etc.).
  console.error('[ERROR]', error);
  return res.status(500).json({ ok: false, mensaje: 'Ocurrió un error inesperado. Intente nuevamente.', errores: [] });
}

module.exports = { rutaNoEncontrada, manejarErrores };
