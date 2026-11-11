// =====================================================================
// CAPA DOMAIN · Análisis del clima de una parcela
// Funciones puras: reciben mediciones y umbrales y devuelven resultados.
// No consultan la base de datos, así se pueden probar fácilmente.
// =====================================================================

const HORA_MS = 60 * 60 * 1000;
// Si entre dos lecturas pasan más de 1 hora, faltan datos: el periodo
// se corta, porque no sabemos qué pasó en ese hueco.
const HUECO_MAXIMO_HORAS = 1;

const redondear = (n, decimales = 1) => Math.round(n * 10 ** decimales) / 10 ** decimales;
const momento = (fecha) => Date.parse(fecha.replace(' ', 'T'));

/** Promedio, mínimo y máximo de una variable (ignora los valores vacíos). */
function estadistica(mediciones, variable) {
  const valores = mediciones.map((m) => m[variable]).filter((v) => v !== null);
  if (valores.length === 0) return { promedio: null, minimo: null, maximo: null, lecturas: 0 };
  const suma = valores.reduce((total, v) => total + v, 0);
  return {
    promedio: redondear(suma / valores.length, 2),
    minimo: Math.min(...valores),
    maximo: Math.max(...valores),
    lecturas: valores.length,
  };
}

/** Resumen del periodo: temperatura, humedad y luminosidad. */
function resumir(mediciones) {
  return {
    lecturas: mediciones.length,
    primera: mediciones.length ? mediciones[0].fecha : null,
    ultima: mediciones.length ? mediciones[mediciones.length - 1].fecha : null,
    temperatura: estadistica(mediciones, 'temperatura'),
    humedad: estadistica(mediciones, 'humedad'),
    luminosidad: estadistica(mediciones, 'luminosidad'),
  };
}

/**
 * Busca los periodos en que se cumplió el umbral de forma continua.
 * Un periodo dura desde la primera hasta la última lectura que cumple
 * sin interrupción. Solo se cuenta si dura al menos horasMin.
 *
 * @param {Array} mediciones  Ordenadas por fecha
 * @param {import('./Umbral')} umbral
 * @returns {Array<{ inicio: string, fin: string, horas: number }>}
 */
function buscarPeriodos(mediciones, umbral) {
  const periodos = [];
  let inicio = null;   // primera lectura del periodo actual
  let ultima = null;   // última lectura que cumplió

  const cerrar = () => {
    if (inicio) {
      const horas = (momento(ultima.fecha) - momento(inicio.fecha)) / HORA_MS;
      if (horas >= (umbral.horasMin || 0)) {
        periodos.push({ inicio: inicio.fecha, fin: ultima.fecha, horas: redondear(horas) });
      }
    }
    inicio = null;
    ultima = null;
  };

  for (const medicion of mediciones) {
    if (!umbral.cumple(medicion)) {
      cerrar();
      continue;
    }
    const hueco = ultima ? (momento(medicion.fecha) - momento(ultima.fecha)) / HORA_MS : 0;
    if (hueco > HUECO_MAXIMO_HORAS) cerrar();
    if (!inicio) inicio = medicion;
    ultima = medicion;
  }
  cerrar();

  return periodos;
}

/**
 * Evalúa todos los umbrales con las mediciones de una parcela.
 * @returns {Array} una fila por enfermedad, con sus periodos favorables.
 */
function evaluarCondiciones(mediciones, umbrales) {
  return umbrales.map((umbral) => {
    const periodos = buscarPeriodos(mediciones, umbral);
    return {
      enfermedad: umbral.enfermedad,
      codigo: umbral.codigo,
      favorable: periodos.length > 0,
      horasFavorables: redondear(periodos.reduce((total, p) => total + p.horas, 0)),
      periodos,
      umbral: {
        tempMin: umbral.tempMin,
        tempMax: umbral.tempMax,
        humedadMin: umbral.humedadMin,
        horasMin: umbral.horasMin,
        provisional: umbral.provisional,
        fuente: umbral.fuente,
      },
    };
  });
}

module.exports = { resumir, buscarPeriodos, evaluarCondiciones, HUECO_MAXIMO_HORAS };
