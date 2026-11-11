// =====================================================================
// CAPA DOMAIN · Interpretar la respuesta del modelo
// El modelo devuelve una probabilidad por enfermedad (0 a 1). Cada
// enfermedad tiene su propio umbral (umbrales.json): si la probabilidad
// lo supera, la enfermedad se considera DETECTADA.
//
// Reglas:
//   - Enfermedad principal = la detectada con mayor probabilidad.
//   - Si ninguna supera su umbral, la principal es la de mayor
//     probabilidad, pero el resultado se marca como NO concluyente.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

const UMBRAL_POR_DEFECTO = 0.5;

/**
 * @param {Object<string, number>} probabilidades  { scab: 0.93, rust: 0.02, ... }
 * @param {Object<string, number>} umbrales        { scab: 0.61, rust: 0.82, ... }
 * @param {Array<{ id: number, codigo: string, nombre: string }>} enfermedades  Catálogo de la BD
 */
function interpretarPrediccion(probabilidades, umbrales, enfermedades) {
  const detalle = enfermedades.map((enfermedad) => {
    const probabilidad = Number(probabilidades[enfermedad.codigo]);
    if (!Number.isFinite(probabilidad) || probabilidad < 0 || probabilidad > 1) {
      // El modelo y el catálogo no coinciden: es un error de configuración.
      throw new AppError(`El modelo no devolvió una probabilidad válida para "${enfermedad.codigo}".`, 502);
    }
    const umbral = Number.isFinite(Number(umbrales[enfermedad.codigo])) ? Number(umbrales[enfermedad.codigo]) : UMBRAL_POR_DEFECTO;
    return {
      enfermedadId: enfermedad.id,
      codigo: enfermedad.codigo,
      nombre: enfermedad.nombre,
      probabilidad: Math.round(probabilidad * 10000) / 10000,
      umbral,
      detectada: probabilidad >= umbral,
    };
  });

  // De mayor a menor probabilidad, para mostrar y elegir la principal.
  detalle.sort((a, b) => b.probabilidad - a.probabilidad);
  const detectadas = detalle.filter((d) => d.detectada);
  const principal = detectadas[0] || detalle[0];

  return {
    principal,
    concluyente: detectadas.length > 0,
    detectadas: detectadas.map((d) => d.codigo),
    detalle,
  };
}

module.exports = { interpretarPrediccion, UMBRAL_POR_DEFECTO };
