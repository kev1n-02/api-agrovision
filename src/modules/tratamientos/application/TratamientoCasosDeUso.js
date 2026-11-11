// =====================================================================
// CAPA APPLICATION · Casos de uso de tratamientos y seguimientos
//   crearDesdeDiagnostico → el técnico trata lo que detectó el modelo
//   crearEnParcela        → tratamiento sin diagnóstico previo (inspección visual)
//   obtener               → tratamiento + evaluaciones + evolución
//   listar, actualizar, cambiarEstado (cerrar / cancelar)
//   registrarSeguimiento  → nueva evaluación en campo
// Escribir: ADMINISTRADOR y TECNICO (lo controla la ruta).
// Consultar: además, el productor dueño de la finca.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const { esFechaValida, hoy } = require('../../../shared/utils/fechas');
const Tratamiento = require('../domain/Tratamiento');
const Seguimiento = require('../domain/Seguimiento');
const { calcularEvolucion } = require('../domain/evolucion');

const ESTADOS = ['activo', 'cerrado', 'cancelado'];

class TratamientoCasosDeUso {
  /**
   * @param {import('../domain/TratamientoRepository')} tratamientoRepository
   * @param {import('../../diagnosticos/domain/contratos').DiagnosticoRepository} diagnosticoRepository
   * @param {import('../../catalogos/domain/CatalogoRepository')} catalogoRepository
   * @param {import('../../parcelas/application/AccesoParcela')} accesoParcela
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(tratamientoRepository, diagnosticoRepository, catalogoRepository, accesoParcela, bitacora) {
    this.tratamientoRepository = tratamientoRepository;
    this.diagnosticoRepository = diagnosticoRepository;
    this.catalogoRepository = catalogoRepository;
    this.accesoParcela = accesoParcela;
    this.bitacora = bitacora;
  }

  /**
   * Crea el tratamiento a partir de un diagnóstico.
   * La enfermedad se toma del diagnóstico (la confirmada por el técnico).
   */
  async crearDesdeDiagnostico(diagnosticoId, datos, actor) {
    const diagnostico = await this.diagnosticoRepository.buscarPorId(diagnosticoId);
    if (!diagnostico) {
      throw new AppError('El diagnóstico no existe.', 404);
    }
    // Se trata lo que el técnico validó, no solo lo que dijo el modelo.
    if (diagnostico.estado === 'pendiente') {
      throw new AppError('Primero revise el diagnóstico (confírmelo o corríjalo) antes de crear un tratamiento.', 400);
    }
    if (await this.tratamientoRepository.existeActivoParaDiagnostico(diagnosticoId)) {
      throw new AppError('Este diagnóstico ya tiene un tratamiento activo.', 409);
    }
    return this.crear(diagnostico.parcelaId, diagnostico.enfermedadFinalId(), diagnosticoId, datos, actor);
  }

  /** Tratamiento sin diagnóstico previo: la enfermedad se indica en el body (enfermedadId). */
  async crearEnParcela(parcelaId, datos, actor) {
    const enfermedadId = Number(datos.enfermedadId);
    if (!Number.isInteger(enfermedadId) || enfermedadId <= 0) {
      throw new AppError('Seleccione la enfermedad a tratar.', 422, [{ campo: 'enfermedadId', mensaje: 'La enfermedad es obligatoria.' }]);
    }
    return this.crear(parcelaId, enfermedadId, null, datos, actor);
  }

  async crear(parcelaId, enfermedadId, diagnosticoId, datos, actor) {
    const { parcela } = await this.accesoParcela.verificar(parcelaId, actor, 'ver');
    if (!parcela.activo) {
      throw new AppError('No se pueden crear tratamientos en una parcela inactiva.', 400);
    }

    const enfermedad = await this.catalogoRepository.buscarEnfermedad(enfermedadId);
    if (!enfermedad) {
      throw new AppError('La enfermedad no existe.', 422, [{ campo: 'enfermedadId', mensaje: 'Seleccione una enfermedad del catálogo.' }]);
    }
    if (enfermedad.esSana) {
      throw new AppError('Una hoja sana no necesita tratamiento.', 422, [{ campo: 'enfermedadId', mensaje: 'Seleccione una enfermedad.' }]);
    }

    const limpio = Tratamiento.validar(datos);
    const id = await this.tratamientoRepository.crear({
      ...limpio, parcelaId, diagnosticoId, enfermedadId, responsableId: actor.id,
    });
    await this.registrar(actor, 'CREAR_TRATAMIENTO', 'tratamiento', id, enfermedad.codigo);
    return this.obtener(id, actor);
  }

  /** Tratamiento con sus evaluaciones y la evolución de la incidencia. */
  async obtener(id, actor) {
    const tratamiento = await this.buscarConPermiso(id, actor);
    const evaluaciones = await this.tratamientoRepository.listarSeguimientos(id);
    return { ...tratamiento, evaluaciones, evolucion: calcularEvolucion(evaluaciones) };
  }

  /**
   * Con parcelaId: los de esa parcela.
   * Sin parcelaId: el productor ve los de sus fincas; técnico y admin, todos.
   */
  async listar({ parcelaId = null, estado = null }, actor) {
    if (estado && !ESTADOS.includes(estado)) {
      throw new AppError('El estado debe ser activo, cerrado o cancelado.', 400);
    }
    if (parcelaId) {
      await this.accesoParcela.verificar(parcelaId, actor, 'ver');
    }
    return this.tratamientoRepository.listar({
      parcelaId,
      duenoId: !parcelaId && actor.rol === 'PRODUCTOR' ? actor.id : null,
      estado,
    });
  }

  async actualizar(id, datos, actor) {
    const tratamiento = await this.buscarActivo(id, actor);
    const limpio = Tratamiento.validar(datos);

    // No se puede mover el inicio después de evaluaciones ya registradas.
    const evaluaciones = await this.tratamientoRepository.listarSeguimientos(id);
    if (evaluaciones.length > 0 && limpio.fechaInicio > evaluaciones[0].fecha) {
      throw new AppError('La fecha de inicio no puede ser posterior a la primera evaluación.', 422, [
        { campo: 'fechaInicio', mensaje: `Ya hay una evaluación del ${evaluaciones[0].fecha}.` },
      ]);
    }

    await this.tratamientoRepository.actualizar(tratamiento.id, limpio, actor.id);
    await this.registrar(actor, 'EDITAR_TRATAMIENTO', 'tratamiento', id);
    return this.obtener(id, actor);
  }

  /** Cerrar (terminó) o cancelar (se suspendió). Después ya no se modifica. */
  async cambiarEstado(id, { estado, fechaFin } = {}, actor) {
    if (!['cerrado', 'cancelado'].includes(estado)) {
      throw new AppError('El estado debe ser "cerrado" o "cancelado".', 422, [{ campo: 'estado', mensaje: 'Estado no válido.' }]);
    }
    const tratamiento = await this.buscarActivo(id, actor);

    const fin = fechaFin ? String(fechaFin).trim() : hoy();
    if (!esFechaValida(fin) || fin < tratamiento.fechaInicio) {
      throw new AppError('La fecha de fin no es válida.', 422, [
        { campo: 'fechaFin', mensaje: `Use AAAA-MM-DD, igual o posterior al ${tratamiento.fechaInicio}.` },
      ]);
    }

    // Sin evaluaciones no se puede saber si el tratamiento funcionó.
    if (estado === 'cerrado' && tratamiento.numEvaluaciones === 0) {
      throw new AppError('Registre al menos una evaluación antes de cerrar el tratamiento.', 400);
    }

    await this.tratamientoRepository.cambiarEstado(id, estado, fin, actor.id);
    await this.registrar(actor, estado === 'cerrado' ? 'CERRAR_TRATAMIENTO' : 'CANCELAR_TRATAMIENTO', 'tratamiento', id);
    return this.obtener(id, actor);
  }

  /** Nueva evaluación en campo. Una por fecha. */
  async registrarSeguimiento(id, datos, actor) {
    const tratamiento = await this.buscarActivo(id, actor);
    const limpio = Seguimiento.validar(datos, tratamiento.fechaInicio);

    if (await this.tratamientoRepository.existeSeguimientoEnFecha(id, limpio.fecha)) {
      throw new AppError('Ya existe una evaluación en esa fecha para este tratamiento.', 409, [
        { campo: 'fecha', mensaje: 'Elija otra fecha o revise la evaluación registrada.' },
      ]);
    }

    const seguimientoId = await this.tratamientoRepository.crearSeguimiento(id, limpio, actor.id);
    await this.registrar(actor, 'CREAR_SEGUIMIENTO', 'seguimiento', seguimientoId);
    return this.obtener(id, actor);
  }

  // ---------- Ayudantes ----------

  async buscarConPermiso(id, actor) {
    const tratamiento = await this.tratamientoRepository.buscarPorId(id);
    if (!tratamiento) {
      throw new AppError('El tratamiento no existe.', 404);
    }
    await this.accesoParcela.verificar(tratamiento.parcelaId, actor, 'ver');
    return tratamiento;
  }

  async buscarActivo(id, actor) {
    const tratamiento = await this.buscarConPermiso(id, actor);
    if (!tratamiento.estaActivo()) {
      throw new AppError(`El tratamiento está ${tratamiento.estado}: ya no se puede modificar.`, 400);
    }
    return tratamiento;
  }

  async registrar(actor, accion, tabla, registroId, detalle = null) {
    await this.bitacora.registrar({ usuarioId: actor.id, accion, tabla, registroId, resultado: 'exito', detalle });
  }
}

module.exports = TratamientoCasosDeUso;
