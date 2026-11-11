// =====================================================================
// Claves de los sensores automáticos (ESP32).
// La clave es aleatoria y larga (48 caracteres), así que basta guardar su
// hash SHA-256: no se puede adivinar ni sacar la clave desde el hash.
// (Para contraseñas de personas se usa Bcrypt, porque suelen ser cortas.)
// =====================================================================
const crypto = require('crypto');

/** Calcula el hash SHA-256 de una clave (64 caracteres hexadecimales). */
function hashear(clave) {
  return crypto.createHash('sha256').update(String(clave)).digest('hex');
}

/**
 * Genera una clave nueva.
 * @returns {{ clave: string, hash: string }}  La clave se muestra UNA vez; en la BD va el hash.
 */
function generar() {
  const clave = crypto.randomBytes(24).toString('hex');
  return { clave, hash: hashear(clave) };
}

module.exports = { generar, hashear };
