// =====================================================================
// CAPA DOMAIN · Evolución de la enfermedad durante el tratamiento
// Función pura: recibe los seguimientos y calcula la incidencia.
//
//   Incidencia (%) = hojas afectadas / hojas evaluadas × 100
//
// La primera evaluación es la LÍNEA BASE; se compara con la última.
// Solo se habla de tendencia con al menos 2 evaluaciones: con una sola
// no hay con qué comparar.
// =====================================================================

const redondear = (n) => Math.round(n * 100) / 100;

/**
 * @param {Array} seguimientos  Ordenados por fecha (el más antiguo primero)
 */
function calcularEvolucion(seguimientos) {
  const puntos = seguimientos.map((s) => ({
    fecha: s.fecha,
    incidencia: redondear((s.hojasAfectadas / s.hojasEvaluadas) * 100),
    severidad: s.severidad,
  }));

  if (puntos.length < 2) {
    return {
      evaluaciones: puntos.length,
      lineaBase: puntos[0] ? puntos[0].incidencia : null,
      actual: puntos[0] ? puntos[0].incidencia : null,
      variacionPuntos: null,
      variacionPorcentual: null,
      tendencia: 'sin datos suficientes',
      puntos,
    };
  }

  const base = puntos[0].incidencia;
  const actual = puntos[puntos.length - 1].incidencia;
  const variacionPuntos = redondear(actual - base);

  let tendencia = 'sin cambio';
  if (variacionPuntos < 0) tendencia = 'disminuye';
  if (variacionPuntos > 0) tendencia = 'aumenta';

  return {
    evaluaciones: puntos.length,
    lineaBase: base,
    actual,
    variacionPuntos,                       // ej.: -20 = bajó 20 puntos porcentuales
    variacionPorcentual: base > 0 ? redondear((variacionPuntos / base) * 100) : null, // ej.: -50 = bajó a la mitad
    tendencia,
    puntos,
  };
}

module.exports = { calcularEvolucion };
