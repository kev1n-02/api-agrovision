// =====================================================================
// Servicio de contraseñas con Bcrypt.
// AQUÍ se hace el hash, dentro de la API. La base de datos solo guarda
// el resultado en usu_contrasena.
// Se usa bcryptjs (misma función que bcrypt, pero sin compilar nada en
// Windows).
// =====================================================================
const bcrypt = require('bcryptjs');

// Costo 12 = 2^12 rondas. Más alto es más seguro pero más lento.
const COSTO = 12;

/** Convierte la contraseña en un hash irreversible. */
async function hashear(contrasena) {
  return bcrypt.hash(contrasena, COSTO);
}

/** Compara la contraseña escrita con el hash guardado. Devuelve true o false. */
async function comparar(contrasena, hashGuardado) {
  return bcrypt.compare(contrasena, hashGuardado);
}

module.exports = { hashear, comparar };
