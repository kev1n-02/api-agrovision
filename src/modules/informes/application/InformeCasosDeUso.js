// =====================================================================
// CAPA APPLICATION · Casos de uso de informes
//   generar             → reúne todo el periodo y guarda un borrador
//   obtener / listar    → el productor solo ve informes emitidos
//   actualizarPropuesta → el técnico ajusta el estudio de mitigación
//   emitir              → versión final, ya no cambia
//   pdf                 → descarga
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const { esFechaValida } = require('../../../shared/utils/fechas');
const { leerRango } = require('../../../shared/utils/rangoFechas');
const { resumir, evaluarCondiciones } = require('../../clima/domain/analisisClima');
const { calcularEvolucion } = require('../../tratamientos/domain/evolucion');
const Informe = require('../domain/Informe');
const {
  DIAS_EXPOSICION, resumirDiagnosticos, enfermedadPrincipal, relacionarClima,
  proponerEstudio, propuestaEnTexto, recomendacionesEnTexto,
} = require('../domain/contenidoInforme');

const AVISO = 'Informe orientativo. Los diagnósticos los genera un modelo de inteligencia artificial y no reemplazan '
  + 'la evaluación de un ingeniero agrónomo. Las recomendaciones no constituyen una prescripción fitosanitaria. '
  + 'La relación con el clima indica asociación, no causalidad.';

/** Resta días a una fecha AAAA-MM-DD. */
function restarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

class InformeCasosDeUso {
  /**
   * Recibe un objeto con todas las dependencias, porque el informe usa datos de varios módulos.
   * @param {object} deps
   */
  constructor({
    informeRepository, accesoParcela, diagnosticoRepository, catalogoRepository,
    tratamientoRepository, medicionRepository, umbralRepository, generadorPdf, bitacora,
  }) {
    this.informeRepository = informeRepository;
    this.accesoParcela = accesoParcela;
    this.diagnosticoRepository = diagnosticoRepository;
    this.catalogoRepository = catalogoRepository;
    this.tratamientoRepository = tratamientoRepository;
    this.medicionRepository = medicionRepository;
    this.umbralRepository = umbralRepository;
    this.generadorPdf = generadorPdf;
    this.bitacora = bitacora;
  }

  /** Genera el informe de una parcela para el periodo [desde, hasta] y lo guarda como borrador. */
  async generar(parcelaId, { desde, hasta } = {}, actor) {
    if (!esFechaValida(String(desde || '')) || !esFechaValida(String(hasta || ''))) {
      throw new AppError('Indique el periodo del informe.', 422, [
        { campo: 'desde', mensaje: 'Fecha de inicio con formato AAAA-MM-DD.' },
        { campo: 'hasta', mensaje: 'Fecha de fin con formato AAAA-MM-DD.' },
      ]);
    }
    const periodo = leerRango(desde, hasta); // valida que desde <= hasta y máximo 366 días
    const { parcela, finca } = await this.accesoParcela.verificar(parcelaId, actor, 'ver');

    // ---------- 1. Diagnósticos del periodo ----------
    const diagnosticos = await this.diagnosticoRepository.listar({ parcelaId, desde: periodo.desde, hasta: periodo.hasta });
    const enfermedades = await this.catalogoRepository.listarEnfermedades();
    const idsSanas = new Set(enfermedades.filter((e) => e.esSana).map((e) => e.id));
    const resumenDiagnosticos = resumirDiagnosticos(diagnosticos);

    // ---------- 2. Tratamientos que estuvieron vigentes en el periodo ----------
    const todos = await this.tratamientoRepository.listar({ parcelaId });
    const vigentes = todos.filter((t) => t.fechaInicio <= periodo.hasta && (!t.fechaFin || t.fechaFin >= periodo.desde));
    const tratamientos = [];
    for (const t of vigentes) {
      const evaluaciones = (await this.tratamientoRepository.listarSeguimientos(t.id)).filter((e) => e.fecha <= periodo.hasta);
      tratamientos.push({
        id: t.id, enfermedadId: t.enfermedadId, enfermedad: t.enfermedad, objetivo: t.objetivo, acciones: t.acciones,
        producto: t.producto, fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, estado: t.estado, responsable: t.responsable,
        evaluaciones: evaluaciones.map((e) => ({ fecha: e.fecha, hojasEvaluadas: e.hojasEvaluadas, hojasAfectadas: e.hojasAfectadas, severidad: e.severidad })),
        evolucion: calcularEvolucion(evaluaciones),
      });
    }

    // ---------- 3. Enfermedad principal y sus recomendaciones ----------
    const principal = enfermedadPrincipal(resumenDiagnosticos, tratamientos, idsSanas);
    const idsEnfermas = new Set(resumenDiagnosticos.porEnfermedad.map((e) => e.enfermedadId).filter((id) => !idsSanas.has(id)));
    if (principal) idsEnfermas.add(principal.enfermedadId);
    const recomendaciones = [];
    for (const id of idsEnfermas) {
      const lista = await this.catalogoRepository.listarRecomendaciones(id, true);
      recomendaciones.push(...lista.map((r) => ({ enfermedadId: r.enfermedadId, enfermedad: r.enfermedad, tipo: r.tipo, descripcion: r.descripcion, fuente: r.fuente })));
    }

    // ---------- 4. Clima ----------
    // Se consultan también los 14 días ANTERIORES al periodo, porque la infección
    // ocurre días antes de que aparezcan los síntomas.
    const desdeClima = restarDias(periodo.desde, DIAS_EXPOSICION);
    const mediciones = await this.medicionRepository.listarPorParcela(parcelaId, desdeClima, periodo.hasta);
    const umbrales = await this.listarUmbrales();
    const condiciones = mediciones.length ? evaluarCondiciones(mediciones, umbrales) : [];
    const resumenClima = resumir(mediciones.filter((m) => m.fecha >= periodo.desde));
    const relacion = relacionarClima(resumenDiagnosticos, condiciones, mediciones.length > 0, idsSanas);

    // ---------- 5. Propuesta de estudio de mitigación ----------
    const propuesta = proponerEstudio(principal, tratamientos, recomendaciones, parcela.codigo);

    // ---------- Contenido completo ("foto" de los datos) ----------
    const contenido = {
      identificacion: {
        finca: finca.nombre, provincia: finca.provincia, canton: finca.canton, propietario: finca.propietario,
        parcela: parcela.codigo, variedad: parcela.variedad, superficie: parcela.superficie, numeroArboles: parcela.numeroArboles,
        periodo, generadoPor: actor.id,
      },
      diagnosticos: {
        resumen: resumenDiagnosticos,
        lista: diagnosticos.map((d) => ({
          id: d.id, fecha: d.fecha, enfermedad: d.enfermedad, confianza: d.confianza, concluyente: d.concluyente,
          estado: d.estado, enfermedadConfirmada: d.enfermedadConfirmada, advertencias: d.advertencias,
        })),
      },
      enfermedadPrincipal: principal,
      recomendaciones,
      tratamientos,
      clima: {
        resumen: resumenClima,
        ventanaConsultada: { desde: desdeClima, hasta: periodo.hasta },
        condiciones: condiciones.map((c) => ({ enfermedad: c.enfermedad, favorable: c.favorable, horasFavorables: c.horasFavorables, periodos: c.periodos.length, umbral: c.umbral })),
        relacion,
      },
      propuesta,
      aviso: AVISO,
    };

    // Tratamiento de la enfermedad principal con más evaluaciones: da la incidencia inicial y final.
    const conDatos = principal
      ? tratamientos.filter((t) => t.enfermedadId === principal.enfermedadId).sort((a, b) => b.evolucion.evaluaciones - a.evolucion.evaluaciones)[0]
      : null;

    const id = await this.informeRepository.crear({
      parcelaId,
      usuarioId: actor.id,
      enfermedadId: principal ? principal.enfermedadId : null,
      desde: periodo.desde,
      hasta: periodo.hasta,
      totalDiagnosticos: resumenDiagnosticos.total,
      temperaturaPromedio: resumenClima.temperatura.promedio,
      humedadPromedio: resumenClima.humedad.promedio,
      luminosidadPromedio: resumenClima.luminosidad.promedio,
      incidenciaInicial: conDatos ? conDatos.evolucion.lineaBase : null,
      incidenciaFinal: conDatos ? conDatos.evolucion.actual : null,
      analisisClima: relacion.texto,
      recomendaciones: recomendacionesEnTexto(recomendaciones),
      propuesta: propuestaEnTexto(propuesta),
      contenido,
    });

    await this.registrar(actor, 'GENERAR_INFORME', id, `${periodo.desde} a ${periodo.hasta}`);
    return this.obtener(id, actor);
  }

  async obtener(id, actor) {
    return this.buscarConPermiso(id, actor);
  }

  /** El productor solo ve informes emitidos de sus fincas. */
  async listar({ parcelaId = null, estado = null }, actor) {
    if (estado && !['borrador', 'emitido'].includes(estado)) {
      throw new AppError('El estado debe ser borrador o emitido.', 400);
    }
    if (parcelaId) {
      await this.accesoParcela.verificar(parcelaId, actor, 'ver');
    }
    const esProductor = actor.rol === 'PRODUCTOR';
    return this.informeRepository.listar({
      parcelaId,
      duenoId: !parcelaId && esProductor ? actor.id : null,
      estado: esProductor ? 'emitido' : estado,
    });
  }

  /** El técnico ajusta la propuesta de estudio mientras el informe es borrador. */
  async actualizarPropuesta(id, datos, actor) {
    const informe = await this.buscarBorrador(id, actor);
    const cambios = Informe.validarPropuesta(datos);
    const propuesta = { ...informe.contenido.propuesta, ...cambios, editadoPorTecnico: true };
    const contenido = { ...informe.contenido, propuesta };
    await this.informeRepository.actualizarContenido(id, contenido, propuestaEnTexto(propuesta));
    await this.registrar(actor, 'EDITAR_PROPUESTA_INFORME', id);
    return this.obtener(id, actor);
  }

  /** Versión final: desde aquí no cambia y la puede ver el productor. */
  async emitir(id, actor) {
    await this.buscarBorrador(id, actor);
    await this.informeRepository.emitir(id, actor.id);
    await this.registrar(actor, 'EMITIR_INFORME', id);
    return this.obtener(id, actor);
  }

  /** @returns {Promise<{ contenido: Buffer, nombre: string }>} */
  async pdf(id, actor) {
    const informe = await this.buscarConPermiso(id, actor);
    const contenido = await this.generadorPdf.generar(informe.contenido, {
      id: informe.id, estado: informe.estado, fechaCrea: informe.fechaCrea, fechaEmision: informe.fechaEmision,
      generadoPor: informe.generadoPor, emitidoPor: informe.emitidoPor,
    });
    return { contenido, nombre: `informe-${informe.id}-${informe.parcela}-${informe.hasta}.pdf` };
  }

  // ---------- Ayudantes ----------

  async buscarConPermiso(id, actor) {
    const informe = await this.informeRepository.buscarPorId(id);
    if (!informe) {
      throw new AppError('El informe no existe.', 404);
    }
    await this.accesoParcela.verificar(informe.parcelaId, actor, 'ver');
    if (actor.rol === 'PRODUCTOR' && !informe.estaEmitido()) {
      throw new AppError('El informe todavía no ha sido emitido por el técnico.', 403);
    }
    return informe;
  }

  async buscarBorrador(id, actor) {
    const informe = await this.buscarConPermiso(id, actor);
    if (informe.estaEmitido()) {
      throw new AppError('El informe ya fue emitido: no se puede modificar. Genere uno nuevo si necesita cambios.', 400);
    }
    return informe;
  }

  /**
   * Umbrales de clima. Si todavía no se ejecutó el script 05 (sensores),
   * la tabla no existe: el informe se genera igual, sin análisis de umbrales.
   */
  async listarUmbrales() {
    try {
      return await this.umbralRepository.listar();
    } catch (error) {
      if (error.code === '42P01') return []; // 42P01 = la tabla no existe
      throw error;
    }
  }

  async registrar(actor, accion, informeId, detalle = null) {
    await this.bitacora.registrar({ usuarioId: actor.id, accion, tabla: 'informe', registroId: informeId, resultado: 'exito', detalle });
  }
}

module.exports = InformeCasosDeUso;
