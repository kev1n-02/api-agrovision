// =====================================================================
// Validación de cédula ecuatoriana (regla de negocio pura, sin Express
// ni PostgreSQL). La base solo revisa que tenga 10 caracteres; aquí se
// valida que sea una cédula real con su dígito verificador.
//
// Algoritmo (módulo 10):
//   1. Debe tener 10 dígitos.
//   2. Los dos primeros = provincia (01 a 24, o 30 para extranjeros).
//   3. El tercer dígito debe ser menor a 6 (personas naturales).
//   4. Los 9 primeros dígitos se multiplican por 2,1,2,1,2,1,2,1,2;
//      si un producto es mayor a 9 se le resta 9; se suman todos.
//   5. Dígito verificador = (10 - suma % 10) % 10
//      y debe ser igual al décimo dígito.
// =====================================================================

/**
 * @param {string} cedula
 * @returns {boolean}
 */
function esCedulaValida(cedula) {
  if (typeof cedula !== 'string' || !/^\d{10}$/.test(cedula)) return false;

  const provincia = Number(cedula.substring(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;

  if (Number(cedula[2]) >= 6) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let producto = Number(cedula[i]) * coeficientes[i];
    if (producto > 9) producto -= 9;
    suma += producto;
  }

  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]);
}

module.exports = { esCedulaValida };
