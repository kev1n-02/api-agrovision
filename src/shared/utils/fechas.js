// =====================================================================
// Ayudantes para fechas en formato AAAA-MM-DD (sin hora).
// =====================================================================
const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

/** true si el texto es una fecha real con formato AAAA-MM-DD (rechaza 2026-02-30). */
function esFechaValida(texto) {
  if (typeof texto !== 'string' || !FORMATO.test(texto)) return false;
  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

/** Fecha de hoy (hora local) en formato AAAA-MM-DD. */
function hoy() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

module.exports = { esFechaValida, hoy };
