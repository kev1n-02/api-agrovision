// =====================================================================
// Servicio de tokens JWT.
// El token guarda el id y el rol del usuario, firmado con JWT_SECRET.
// Si alguien modifica el token, la firma ya no coincide y se rechaza.
// =====================================================================
const jwt = require('jsonwebtoken');

/**
 * Crea un token para el usuario que inició sesión.
 * @param {{ id: number, rol: string }} datos
 */
function generarToken(datos) {
  return jwt.sign(datos, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRA || '8h' });
}

/**
 * Verifica firma y expiración. Lanza un error si el token no es válido.
 * @returns {{ id: number, rol: string }}
 */
function verificarToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { generarToken, verificarToken };
