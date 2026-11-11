// =====================================================================
// CAPA APPLICATION · Casos de uso de diagnósticos
//   crear    → foto → validar → modelo → guardar
//   obtener  → diagnóstico + probabilidades + recomendaciones
//   listar   → historial con filtros
//   revisar  → el técnico confirma o corrige al modelo
//   imagen   → devuelve la foto (verificando que no fue alterada)
// =====================================================================
const crypto = require('crypto');
const AppError = require('../../../shared/errors/AppError');
const Diagnostico = require('../domain/Diagnostico');
const { validarImagen, detectarTipo } = require('../domain/imagen');
const { interpretarPrediccion } = require('../domain/interpretarPrediccion');

const ESTADOS = ['pendiente', 'confirmado', 'corregido'];
const AVISO = 'Diagnóstico orientativo generado por un modelo de inteligencia artificial. '
  + 'No reemplaza la evaluación de un ingeniero agrónomo.';

class DiagnosticoCasosDeUso {
  /**
   * @param {import('../domain/contratos').DiagnosticoRepository} diagnosticoRepository
   * @param {import('../domain/contratos').ServicioModelo} servicioModelo
   * @param {import('../domain/contratos').AlmacenImagenes} almacen
   * @param {import('../../parcelas/application/AccesoParcela')} accesoParcela
   * @param {import('../../catalogos/domain/CatalogoRepository')} catalogoRepository  Para las recomendaciones
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(diagnosticoRepository, servicioModelo, almacen, accesoParcela, catalogoRepository, bitacora) {
    this.diagnosticoRepository = diagnosticoRepository;
    this.servicioModelo = servicioModelo;
    this.almacen = almacen;
    this.accesoParcela = accesoParcela;
    this.catalogoRepository = catalogoRepository;
    this.bitacora = bitacora;
  }

  /**
   * Crea un diagnóstico a partir de la foto de una hoja.
   * El técnico también puede diagnosticar en las fincas que visita.
   */
  async crear(parcelaId, archivo, actor) {
    // 1. Permiso sobre la parcela (rechazar antes de llamar al modelo, que es lo más costoso)
    const accion = actor.rol === 'TECNICO' ? 'ver' : 'editar';
    const { parcela } = await this.accesoParcela.verificar(parcelaId, actor, accion);
    if (!parcela.activo) {
      throw new AppError('No se pueden registrar diagnósticos en una parcela inactiva.', 400);
    }

    // 2. Validar la imagen (tipo real y tamaño)
    const { contenido, tipo } = validarImagen(archivo);

    // 3. Modelo activo registrado en la base
    const modelo = await this.diagnosticoRepository.modeloActivo();
    if (!modelo) {
      throw new AppError('No hay un modelo de IA activo configurado.', 503);
    }

    // 4. Predicción del servicio Python (puede rechazar la foto por calidad)
    const prediccion = await this.servicioModelo.predecir(contenido, tipo);

    // 5. Interpretar: enfermedad principal y detectadas según los umbrales
    const enfermedades = await this.diagnosticoRepository.enfermedades();
    const resultado = interpretarPrediccion(prediccion.probabilidades, prediccion.umbrales, enfermedades);

    // 6. Guardar la foto y luego el diagnóstico. Si falla la base, se borra la foto.
    const imagen = await this.almacen.guardar(contenido, tipo);
    let id;
    try {
      id = await this.diagnosticoRepository.crear(
        {
          parcelaId,
          modeloId: modelo.id,
          usuarioId: actor.id,
          imagenRuta: imagen.ruta,
          imagenHash: imagen.hash,
          enfermedadId: resultado.principal.enfermedadId,
          confianza: resultado.principal.probabilidad,
          // Advertencias de calidad del modelo (foto desenfocada, oscura, poca hoja...)
          advertencias: prediccion.advertencias || [],
        },
        resultado.detalle,
      );
    } catch (error) {
      await this.almacen.eliminar(imagen.ruta);
      throw error;
    }

    await this.bitacora.registrar({
      usuarioId: actor.id,
      accion: 'CREAR_DIAGNOSTICO',
      tabla: 'diagnostico',
      registroId: id,
      resultado: 'exito',
      detalle: `${resultado.principal.codigo} ${resultado.principal.probabilidad}`,
    });

    const diagnostico = await this.obtener(id, actor);
    // Las medidas de calidad solo se muestran al crear (no se guardan).
    return { ...diagnostico, calidad: prediccion.calidad || null };
  }

  /** Diagnóstico completo, con las recomendaciones de la enfermedad final. */
  async obtener(id, actor) {
    const diagnostico = await this.buscarConPermiso(id, actor);
    const recomendaciones = await this.catalogoRepository.listarRecomendaciones(diagnostico.enfermedadFinalId(), true);
    return { ...diagnostico, recomendaciones, aviso: AVISO };
  }

  /**
   * Historial. Con parcelaId: los de esa parcela.
   * Sin parcelaId: el productor ve los de sus fincas; técnico y admin, todos.
   */
  async listar({ parcelaId = null, estado = null, rango }, actor) {
    if (estado && !ESTADOS.includes(estado)) {
      throw new AppError('El estado debe ser pendiente, confirmado o corregido.', 400);
    }
    if (parcelaId) {
      await this.accesoParcela.verificar(parcelaId, actor, 'ver');
    }
    return this.diagnosticoRepository.listar({
      parcelaId,
      duenoId: !parcelaId && actor.rol === 'PRODUCTOR' ? actor.id : null,
      estado,
      desde: rango.desde,
      hasta: rango.hasta,
    });
  }

  /** El técnico confirma o corrige el resultado del modelo. */
  async revisar(id, datos, actor) {
    const diagnostico = await this.buscarConPermiso(id, actor);
    const limpio = Diagnostico.validarRevision(datos, diagnostico.enfermedadId);

    const enfermedades = await this.diagnosticoRepository.enfermedades();
    if (!enfermedades.some((e) => e.id === limpio.enfermedadConfirmadaId)) {
      throw new AppError('La enfermedad seleccionada no existe.', 422, [
        { campo: 'enfermedadId', mensaje: 'Seleccione una enfermedad del catálogo.' },
      ]);
    }

    await this.diagnosticoRepository.revisar(id, limpio, actor.id);
    await this.bitacora.registrar({
      usuarioId: actor.id, accion: 'REVISAR_DIAGNOSTICO', tabla: 'diagnostico', registroId: id, resultado: 'exito', detalle: limpio.estado,
    });
    return this.obtener(id, actor);
  }

  /** Devuelve la foto. Si su huella SHA-256 no coincide, fue alterada. */
  async imagen(id, actor) {
    await this.buscarConPermiso(id, actor);
    const { ruta, hash } = await this.diagnosticoRepository.datosImagen(id);
    let contenido;
    try {
      contenido = await this.almacen.leer(ruta);
    } catch (error) {
      throw new AppError('No se encontró la imagen del diagnóstico.', 404);
    }
    if (hash && crypto.createHash('sha256').update(contenido).digest('hex') !== hash) {
      throw new AppError('La imagen no coincide con la registrada: pudo haber sido modificada.', 409);
    }
    return { contenido, tipo: detectarTipo(contenido) || 'application/octet-stream' };
  }

  async buscarConPermiso(id, actor) {
    const diagnostico = await this.diagnosticoRepository.buscarPorId(id);
    if (!diagnostico) {
      throw new AppError('El diagnóstico no existe.', 404);
    }
    await this.accesoParcela.verificar(diagnostico.parcelaId, actor, 'ver');
    return diagnostico;
  }
}

module.exports = DiagnosticoCasosDeUso;
