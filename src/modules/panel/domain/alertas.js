// =====================================================================
// CAPA DOMAIN · Reglas del panel de inicio
// Funciones puras: convierten los datos consultados en alertas y en la
// enfermedad más frecuente.
// =====================================================================

// Un diagnóstico pendiente más de 7 días necesita atención del técnico.
const DIAS_PENDIENTE = 7;
// Un tratamiento activo sin evaluación en 14 días no se está siguiendo.
const DIAS_SIN_SEGUIMIENTO = 14;

/**
 * Enfermedad con más casos en el periodo, sin contar "hoja sana".
 * @param {Array<{ enfermedad: string, esSana: boolean, casos: number }>} distribucion
 */
function enfermedadMasFrecuente(distribucion) {
  const enfermas = distribucion.filter((d) => !d.esSana);
  return enfermas.length ? { enfermedad: enfermas[0].enfermedad, casos: enfermas[0].casos } : null;
}

/**
 * Arma la lista de alertas. Cada alerta indica a qué registro llevar al
 * usuario (enlace), para que el front pueda abrirlo con un clic.
 */
function armarAlertas({ pendientesAntiguos, noConcluyentes, tratamientosSinSeguimiento }) {
  const alertas = [];

  for (const d of pendientesAntiguos) {
    alertas.push({
      tipo: 'diagnostico_sin_revisar',
      nivel: 'advertencia',
      mensaje: `Diagnóstico #${d.id} (${d.enfermedad}, ${d.parcela} · ${d.finca}) sin revisar desde hace ${d.dias} días.`,
      enlace: { recurso: 'diagnostico', id: d.id },
    });
  }

  for (const d of noConcluyentes) {
    alertas.push({
      tipo: 'diagnostico_no_concluyente',
      nivel: 'informacion',
      mensaje: `Diagnóstico #${d.id} (${d.parcela} · ${d.finca}) no es concluyente: conviene tomar otra foto o revisarlo.`,
      enlace: { recurso: 'diagnostico', id: d.id },
    });
  }

  for (const t of tratamientosSinSeguimiento) {
    alertas.push({
      tipo: 'tratamiento_sin_seguimiento',
      nivel: 'advertencia',
      mensaje: `Tratamiento #${t.id} (${t.enfermedad}, ${t.parcela} · ${t.finca}) sin evaluación desde hace ${t.dias} días.`,
      enlace: { recurso: 'tratamiento', id: t.id },
    });
  }

  return alertas;
}

module.exports = { DIAS_PENDIENTE, DIAS_SIN_SEGUIMIENTO, enfermedadMasFrecuente, armarAlertas };
