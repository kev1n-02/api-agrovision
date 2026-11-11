// =====================================================================
// CAPA DOMAIN · Reglas para armar el contenido del informe
// Funciones puras: reciben datos ya consultados y devuelven resúmenes y
// textos. No consultan la base de datos, así se prueban fácilmente.
// =====================================================================

const DIAS_EXPOSICION = 14; // los síntomas aparecen días después de la infección
const DIA_MS = 24 * 60 * 60 * 1000;
const redondear = (n, d = 2) => (n === null || n === undefined ? null : Math.round(n * 10 ** d) / 10 ** d);

/**
 * Resumen de los diagnósticos del periodo.
 * Para contar se usa la enfermedad FINAL: la del técnico si revisó, si no la del modelo.
 */
function resumirDiagnosticos(diagnosticos) {
  const porEnfermedad = {};
  for (const d of diagnosticos) {
    const final = d.enfermedadConfirmadaId
      ? { id: d.enfermedadConfirmadaId, nombre: d.enfermedadConfirmada }
      : { id: d.enfermedadId, nombre: d.enfermedad, codigo: d.codigo };
    const clave = final.id;
    if (!porEnfermedad[clave]) {
      porEnfermedad[clave] = { enfermedadId: final.id, enfermedad: final.nombre, casos: 0, primerDiagnostico: d.fecha };
    }
    porEnfermedad[clave].casos += 1;
    if (d.fecha < porEnfermedad[clave].primerDiagnostico) porEnfermedad[clave].primerDiagnostico = d.fecha;
  }

  return {
    total: diagnosticos.length,
    revisados: diagnosticos.filter((d) => d.estado !== 'pendiente').length,
    pendientes: diagnosticos.filter((d) => d.estado === 'pendiente').length,
    noConcluyentes: diagnosticos.filter((d) => !d.concluyente).length,
    conAdvertencias: diagnosticos.filter((d) => d.advertencias && d.advertencias.length > 0).length,
    porEnfermedad: Object.values(porEnfermedad).sort((a, b) => b.casos - a.casos),
  };
}

/**
 * Enfermedad principal del periodo: la más diagnosticada que no sea "hoja sana".
 * Si no hay diagnósticos de enfermedad, se toma la del tratamiento más reciente.
 * @param {Set<number>} idsSanas  ids de enfermedades marcadas como sanas
 */
function enfermedadPrincipal(resumen, tratamientos, idsSanas) {
  const enferma = resumen.porEnfermedad.find((e) => !idsSanas.has(e.enfermedadId));
  if (enferma) return { enfermedadId: enferma.enfermedadId, enfermedad: enferma.enfermedad };
  const tratamiento = tratamientos[0];
  return tratamiento ? { enfermedadId: tratamiento.enfermedadId, enfermedad: tratamiento.enfermedad } : null;
}

/**
 * Relación clima–enfermedad (ventana de exposición).
 * Para cada enfermedad diagnosticada, revisa si en los 14 días ANTES de su
 * primer diagnóstico hubo periodos con condiciones favorables según el umbral.
 * Resultado: asociación, nunca causalidad.
 */
function relacionarClima(resumen, condiciones, hayMediciones, idsSanas) {
  if (!hayMediciones) {
    return {
      disponible: false,
      relaciones: [],
      texto: 'No se registraron mediciones ambientales en el periodo. No es posible relacionar el clima con la aparición de la enfermedad.',
    };
  }

  const relaciones = resumen.porEnfermedad
    .filter((e) => !idsSanas.has(e.enfermedadId))
    .map((e) => {
      const condicion = condiciones.find((c) => c.enfermedad === e.enfermedad);
      if (!condicion) {
        return { enfermedad: e.enfermedad, coincide: null, texto: `No hay un umbral ambiental de referencia para ${e.enfermedad}.` };
      }

      const fechaDiagnostico = Date.parse(e.primerDiagnostico.replace(' ', 'T'));
      const previos = condicion.periodos.filter((p) => {
        const fin = Date.parse(p.fin.replace(' ', 'T'));
        return fin <= fechaDiagnostico && fin >= fechaDiagnostico - DIAS_EXPOSICION * DIA_MS;
      });
      const horas = redondear(previos.reduce((total, p) => total + p.horas, 0), 1);
      const fecha = e.primerDiagnostico.slice(0, 10);

      const textoRelacion = previos.length > 0
        ? `Antes del primer diagnóstico de ${e.enfermedad} (${fecha}) se registraron ${previos.length} periodo(s) con condiciones favorables (${horas} h en total) en los ${DIAS_EXPOSICION} días previos. Es consistente con la literatura, pero indica asociación, no causalidad.`
        : `En los ${DIAS_EXPOSICION} días previos al primer diagnóstico de ${e.enfermedad} (${fecha}) no se registraron condiciones favorables según el umbral de referencia. La infección pudo originarse antes del periodo medido o por otros factores (inóculo, manejo, variedad).`;

      return { enfermedad: e.enfermedad, coincide: previos.length > 0, periodosPrevios: previos.length, horasPrevias: horas, texto: textoRelacion };
    });

  const nota = 'La humedad relativa >= 90 % se usa como aproximación a la hoja mojada; la luminosidad se registra como contexto.';
  return {
    disponible: true,
    relaciones,
    texto: [...relaciones.map((r) => r.texto), nota].join(' '),
  };
}

/**
 * Propuesta inicial del estudio de mitigación, armada con los datos.
 * Los valores sugeridos (meta, frecuencia, duración) son editables por el técnico.
 */
function proponerEstudio(principal, tratamientos, recomendaciones, parcela) {
  if (!principal) {
    return {
      enfermedad: null,
      hipotesis: 'No se detectaron enfermedades en el periodo; se propone mantener el monitoreo preventivo.',
      intervencion: 'Monitoreo periódico de hojas y registro de condiciones ambientales.',
      indicador: 'Incidencia (% de hojas afectadas)',
      lineaBase: null,
      meta: null,
      resultado: null,
      comparacion: 'No aplica.',
      frecuencia: 'Mensual (ajustable por el técnico)',
      duracion: 'Una temporada de cultivo (ajustable)',
      observaciones: null,
      editadoPorTecnico: false,
    };
  }

  // Tratamiento de esa enfermedad con más evaluaciones: es el que tiene más datos.
  const delaEnfermedad = tratamientos
    .filter((t) => t.enfermedadId === principal.enfermedadId)
    .sort((a, b) => b.evolucion.evaluaciones - a.evolucion.evaluaciones);
  const tratamiento = delaEnfermedad[0] || null;

  const acciones = tratamiento
    ? tratamiento.acciones
    : recomendaciones.filter((r) => r.enfermedadId === principal.enfermedadId).map((r) => r.descripcion).join('; ')
      || 'Medidas de manejo cultural recomendadas para la enfermedad.';

  const evolucion = tratamiento ? tratamiento.evolucion : null;
  const lineaBase = evolucion ? evolucion.lineaBase : null;

  return {
    enfermedad: principal.enfermedad,
    hipotesis: `Aplicar las medidas de manejo (${acciones}) reduce la incidencia de ${principal.enfermedad} en la parcela ${parcela}.`,
    intervencion: acciones,
    indicador: 'Incidencia (% de hojas afectadas); también severidad (0-5)',
    lineaBase,
    // Propuesta inicial: reducir la incidencia a la mitad. El técnico la ajusta.
    meta: lineaBase !== null ? redondear(lineaBase / 2) : null,
    resultado: evolucion && evolucion.evaluaciones >= 2
      ? { incidenciaActual: evolucion.actual, variacionPuntos: evolucion.variacionPuntos, variacionPorcentual: evolucion.variacionPorcentual, tendencia: evolucion.tendencia }
      : null,
    comparacion: 'Antes y después en la misma parcela; si es posible, comparar con una parcela testigo sin intervención.',
    frecuencia: 'Semanal (ajustable por el técnico)',
    duracion: '8 semanas (ajustable por el técnico)',
    observaciones: null,
    editadoPorTecnico: false,
  };
}

/** Propuesta en una línea de texto (para la columna inf_propuesta_mitigacion). */
function propuestaEnTexto(p) {
  const partes = [`Hipótesis: ${p.hipotesis}`, `Indicador: ${p.indicador}`];
  if (p.lineaBase !== null) partes.push(`Línea base: ${p.lineaBase} %`);
  if (p.meta !== null) partes.push(`Meta: ${p.meta} %`);
  if (p.resultado) partes.push(`Resultado medido: ${p.resultado.incidenciaActual} % (${p.resultado.tendencia})`);
  return partes.join(' | ');
}

/** Recomendaciones en texto (para la columna inf_recomendaciones). */
function recomendacionesEnTexto(recomendaciones) {
  return recomendaciones.map((r) => `${r.enfermedad} [${r.tipo}]: ${r.descripcion} (Fuente: ${r.fuente})`).join('\n') || null;
}

module.exports = {
  DIAS_EXPOSICION,
  resumirDiagnosticos,
  enfermedadPrincipal,
  relacionarClima,
  proponerEstudio,
  propuestaEnTexto,
  recomendacionesEnTexto,
};
