// =====================================================================
// Error controlado de la aplicación.
// Se lanza cuando sabemos qué salió mal (dato inválido, sin permiso...)
// y queremos responder con un código HTTP y un mensaje claro.
//
// Ejemplo:
//   throw new AppError('Correo o contraseña incorrectos.', 401);
// =====================================================================
class AppError extends Error {
  /**
   * @param {string} mensaje  Mensaje que verá el usuario.
   * @param {number} estado   Código HTTP (400, 401, 403, 404, 409, 422...).
   * @param {Array<{campo: string, mensaje: string}>} errores  Detalle por campo (opcional).
   */
  constructor(mensaje, estado = 400, errores = []) {
    super(mensaje);
    this.estado = estado;
    this.errores = errores;
  }
}

module.exports = AppError;
