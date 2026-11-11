// =====================================================================
// CAPA INFRASTRUCTURE · PDF del informe con pdfkit
// Dibuja el contenido guardado del informe (no consulta la base).
// =====================================================================
const PDFDocument = require('pdfkit');
const { GeneradorPdf } = require('../domain/contratos');

const VERDE = '#1f5130';
const GRIS = '#555555';
const LINEA = '#c8c8c8';
const FONDO_CABECERA = '#e8efe9';

/**
 * Las fuentes estándar del PDF (Helvetica) no tienen algunos símbolos.
 * Se reemplazan por equivalentes y se quitan los que no se pueden dibujar.
 */
function limpiar(valor) {
  return String(valor === null || valor === undefined ? '—' : valor)
    .replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/→/g, '->')
    .replace(/[^\x20-\x7E\xA0-\xFF\n‘’“”–—•…€]/g, '');
}

const numero = (n, decimales = 2) => (n === null || n === undefined
  ? '—'
  : Number(n).toLocaleString('es-EC', { maximumFractionDigits: decimales }));
const porcentaje = (n) => (n === null || n === undefined ? '—' : `${numero(n)} %`);

class PdfKitInforme extends GeneradorPdf {
  async generar(contenido, cabecera) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: { Title: `Informe fitosanitario ${cabecera.id}`, Author: 'AgroVision Apple' },
      });
      const partes = [];
      doc.on('data', (parte) => partes.push(parte));
      doc.on('end', () => resolve(Buffer.concat(partes)));
      doc.on('error', reject);
      try {
        this.dibujar(doc, contenido, cabecera);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Contenido
  // ---------------------------------------------------------------------
  dibujar(doc, c, cab) {
    const id = c.identificacion;

    // Título
    doc.font('Helvetica-Bold').fontSize(18).fillColor(VERDE).text('Informe fitosanitario');
    doc.font('Helvetica').fontSize(10).fillColor(GRIS)
      .text(limpiar(`AgroVision Apple · Informe N.º ${cab.id} · ${id.finca}, parcela ${id.parcela} · ${id.periodo.desde} al ${id.periodo.hasta}`));
    if (cab.estado !== 'emitido') {
      doc.moveDown(0.3).font('Helvetica-Bold').fontSize(10).fillColor('#b3261e').text('BORRADOR: no es la versión final del informe.');
    }

    // 1. Identificación
    this.seccion(doc, 1, 'Identificación');
    this.fila(doc, 'Finca', `${id.finca} (${id.canton}, ${id.provincia})`);
    this.fila(doc, 'Propietario', id.propietario);
    this.fila(doc, 'Parcela', `${id.parcela} · variedad ${id.variedad} · ${numero(id.superficie)} m²${id.numeroArboles ? ` · ${id.numeroArboles} árboles` : ''}`);
    this.fila(doc, 'Periodo evaluado', `${id.periodo.desde} al ${id.periodo.hasta}`);
    this.fila(doc, 'Enfermedad principal', c.enfermedadPrincipal ? c.enfermedadPrincipal.enfermedad : 'Ninguna detectada');

    // 2. Diagnósticos
    const r = c.diagnosticos.resumen;
    this.seccion(doc, 2, 'Diagnósticos del periodo');
    if (r.total === 0) {
      this.parrafo(doc, 'No se registraron diagnósticos en el periodo.');
    } else {
      this.parrafo(doc, `${r.total} diagnóstico(s): ${r.revisados} revisado(s) por el técnico, ${r.pendientes} pendiente(s), `
        + `${r.noConcluyentes} no concluyente(s), ${r.conAdvertencias} con advertencias de calidad de la foto.`);
      this.parrafo(doc, `Casos por enfermedad: ${r.porEnfermedad.map((e) => `${e.enfermedad} (${e.casos})`).join(', ')}.`);
      this.tabla(doc, [
        { titulo: 'Fecha', ancho: 90 },
        { titulo: 'Resultado del modelo', ancho: 120 },
        { titulo: 'Confianza', ancho: 65 },
        { titulo: 'Revisión del técnico', ancho: 120 },
        { titulo: 'Advertencias', ancho: 100 },
      ], c.diagnosticos.lista.map((d) => [
        d.fecha.slice(0, 16),
        `${d.enfermedad}${d.concluyente ? '' : ' (no concluyente)'}`,
        porcentaje(d.confianza * 100),
        d.estado === 'pendiente' ? 'Pendiente' : `${d.estado === 'confirmado' ? 'Confirmado' : 'Corregido'}: ${d.enfermedadConfirmada || d.enfermedad}`,
        d.advertencias.length ? d.advertencias.join(' ') : 'Ninguna',
      ]));
    }

    // 3. Recomendaciones
    this.seccion(doc, 3, 'Recomendaciones de manejo');
    if (c.recomendaciones.length === 0) {
      this.parrafo(doc, 'No hay recomendaciones registradas para las enfermedades del periodo.');
    } else {
      for (const rec of c.recomendaciones) {
        this.parrafo(doc, `• ${rec.enfermedad} [${rec.tipo}]: ${rec.descripcion} (Fuente: ${rec.fuente})`);
      }
    }

    // 4. Tratamientos
    this.seccion(doc, 4, 'Tratamientos y evolución');
    if (c.tratamientos.length === 0) {
      this.parrafo(doc, 'No hubo tratamientos vigentes en el periodo.');
    }
    for (const t of c.tratamientos) {
      this.asegurarEspacio(doc, 90);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(VERDE).text(limpiar(`${t.enfermedad} · ${t.estado}`));
      doc.moveDown(0.2);
      this.fila(doc, 'Objetivo', t.objetivo);
      this.fila(doc, 'Acciones', t.acciones);
      this.fila(doc, 'Producto', t.producto || 'Ninguno');
      this.fila(doc, 'Fechas', `${t.fechaInicio} al ${t.fechaFin || 'en curso'} · responsable: ${t.responsable}`);
      if (t.evaluaciones.length > 0) {
        this.tabla(doc, [
          { titulo: 'Fecha', ancho: 100 },
          { titulo: 'Hojas evaluadas', ancho: 95 },
          { titulo: 'Hojas afectadas', ancho: 95 },
          { titulo: 'Incidencia', ancho: 95 },
          { titulo: 'Severidad (0-5)', ancho: 110 },
        ], t.evaluaciones.map((e) => [
          e.fecha, String(e.hojasEvaluadas), String(e.hojasAfectadas),
          porcentaje((e.hojasAfectadas / e.hojasEvaluadas) * 100), e.severidad === null ? '—' : String(e.severidad),
        ]));
      }
      const ev = t.evolucion;
      this.parrafo(doc, ev.evaluaciones < 2
        ? 'Evolución: se necesitan al menos 2 evaluaciones para comparar.'
        : `Evolución: incidencia de ${porcentaje(ev.lineaBase)} a ${porcentaje(ev.actual)} `
          + `(${numero(ev.variacionPuntos)} puntos${ev.variacionPorcentual === null ? '' : `, ${numero(ev.variacionPorcentual)} %`}). Tendencia: ${ev.tendencia}.`);
      doc.moveDown(0.4);
    }

    // 5. Clima
    const clima = c.clima;
    this.seccion(doc, 5, 'Condiciones ambientales y relación con la enfermedad');
    if (clima.resumen.lecturas === 0) {
      this.parrafo(doc, 'No se registraron mediciones de temperatura, humedad ni luminosidad en el periodo.');
    } else {
      const v = (s, unidad) => `${numero(s.promedio)} ${unidad} (mín. ${numero(s.minimo)}, máx. ${numero(s.maximo)})`;
      this.fila(doc, 'Lecturas', `${clima.resumen.lecturas} entre ${clima.resumen.primera} y ${clima.resumen.ultima}`);
      this.fila(doc, 'Temperatura', v(clima.resumen.temperatura, '°C'));
      this.fila(doc, 'Humedad relativa', v(clima.resumen.humedad, '%'));
      this.fila(doc, 'Luminosidad', v(clima.resumen.luminosidad, 'lux'));
      if (clima.condiciones.length > 0) {
        this.parrafo(doc, 'Condiciones favorables según la literatura (se incluyen los 14 días previos al periodo):');
        this.tabla(doc, [
          { titulo: 'Enfermedad', ancho: 170 },
          { titulo: '¿Hubo condiciones favorables?', ancho: 150 },
          { titulo: 'Horas', ancho: 80 },
          { titulo: 'Periodos', ancho: 95 },
        ], clima.condiciones.map((x) => [x.enfermedad, x.favorable ? 'Sí' : 'No', numero(x.horasFavorables, 1), String(x.periodos)]));
      }
    }
    this.parrafo(doc, clima.relacion.texto);

    // 6. Propuesta de estudio
    const p = c.propuesta;
    this.seccion(doc, 6, 'Propuesta de estudio de mitigación');
    if (p.editadoPorTecnico) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(GRIS).text('Propuesta revisada y ajustada por el técnico.');
      doc.moveDown(0.3);
    }
    this.fila(doc, 'Hipótesis', p.hipotesis);
    this.fila(doc, 'Intervención', p.intervencion);
    this.fila(doc, 'Indicador', p.indicador);
    this.fila(doc, 'Línea base', p.lineaBase === null ? 'Por medir' : porcentaje(p.lineaBase));
    this.fila(doc, 'Meta', p.meta === null ? 'Por definir' : `incidencia de ${porcentaje(p.meta)} o menos`);
    this.fila(doc, 'Resultado medido', p.resultado
      ? `${porcentaje(p.resultado.incidenciaActual)} (${p.resultado.tendencia}, ${numero(p.resultado.variacionPuntos)} puntos)`
      : 'Aún no medido: se necesitan al menos 2 evaluaciones.');
    this.fila(doc, 'Comparación', p.comparacion);
    this.fila(doc, 'Frecuencia', p.frecuencia);
    this.fila(doc, 'Duración', p.duracion);
    if (p.observaciones) this.fila(doc, 'Observaciones', p.observaciones);

    // Aviso y firma
    doc.moveDown(1);
    this.asegurarEspacio(doc, 80);
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GRIS).text(limpiar(c.aviso));
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(8.5).fillColor(GRIS).text(limpiar(
      `Generado por ${cab.generadoPor} el ${cab.fechaCrea}.`
      + (cab.estado === 'emitido' ? ` Emitido por ${cab.emitidoPor} el ${cab.fechaEmision}.` : ' Pendiente de emisión.'),
    ));
  }

  // ---------------------------------------------------------------------
  // Ayudantes de dibujo
  // ---------------------------------------------------------------------

  /** Si no queda espacio en la página, pasa a una nueva. */
  asegurarEspacio(doc, alto) {
    if (doc.y + alto > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
  }

  anchoUtil(doc) {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  seccion(doc, numeroSeccion, titulo) {
    this.asegurarEspacio(doc, 70);
    doc.moveDown(0.9);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(VERDE).text(limpiar(`${numeroSeccion}. ${titulo}`), doc.page.margins.left);
    const y = doc.y + 2;
    doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + this.anchoUtil(doc), y)
      .lineWidth(0.6).strokeColor(LINEA).stroke();
    doc.moveDown(0.5);
  }

  /** "Clave: valor" en una línea (el valor puede ocupar varias líneas). */
  fila(doc, clave, valor) {
    this.asegurarEspacio(doc, 20);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(`${limpiar(clave)}: `, doc.page.margins.left, doc.y, { continued: true })
      .font('Helvetica').text(limpiar(valor));
    doc.moveDown(0.15);
  }

  parrafo(doc, texto) {
    this.asegurarEspacio(doc, 24);
    doc.font('Helvetica').fontSize(10).fillColor('#000000').text(limpiar(texto), doc.page.margins.left, doc.y, { width: this.anchoUtil(doc) });
    doc.moveDown(0.3);
  }

  /**
   * Tabla simple: una fila de cabecera con fondo y filas de texto.
   * @param {Array<{ titulo: string, ancho: number }>} columnas  (los anchos suman ~495)
   * @param {Array<Array<string>>} filas
   */
  tabla(doc, columnas, filas) {
    const izquierda = doc.page.margins.left;
    const relleno = 4;

    const dibujarFila = (celdas, esCabecera) => {
      doc.font(esCabecera ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
      const alto = Math.max(...celdas.map((t, i) => doc.heightOfString(limpiar(t), { width: columnas[i].ancho - relleno * 2 }))) + relleno * 2;
      this.asegurarEspacio(doc, alto);
      const y = doc.y;
      if (esCabecera) {
        doc.rect(izquierda, y, columnas.reduce((s, c) => s + c.ancho, 0), alto).fill(FONDO_CABECERA);
      }
      let x = izquierda;
      celdas.forEach((t, i) => {
        doc.fillColor(esCabecera ? VERDE : '#000000').text(limpiar(t), x + relleno, y + relleno, { width: columnas[i].ancho - relleno * 2 });
        x += columnas[i].ancho;
      });
      const abajo = y + alto;
      doc.moveTo(izquierda, abajo).lineTo(x, abajo).lineWidth(0.4).strokeColor(LINEA).stroke();
      doc.x = izquierda;
      doc.y = abajo;
    };

    doc.moveDown(0.2);
    dibujarFila(columnas.map((c) => c.titulo), true);
    filas.forEach((f) => dibujarFila(f, false));
    doc.moveDown(0.5);
  }
}

module.exports = PdfKitInforme;
