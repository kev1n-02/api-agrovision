// =====================================================================
// CAPA APPLICATION · Casos de uso de fincas
// Cada método es un caso de uso: listar, obtener, crear, actualizar y
// cambiar estado. Aquí se aplican los permisos y se registra la bitácora.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const { leerId } = require('../../../shared/utils/leerId');
const Finca = require('../domain/Finca');

class FincaCasosDeUso {
  /**
   * @param {import('../domain/FincaRepository')} fincaRepository
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(fincaRepository, bitacora) {
    this.fincaRepository = fincaRepository;
    this.bitacora = bitacora;
  }

  /** El PRODUCTOR ve solo sus fincas; ADMINISTRADOR y TECNICO ven todas. */
  async listar(actor) {
    const usuarioId = actor.rol === 'PRODUCTOR' ? actor.id : null;
    return this.fincaRepository.listar({ usuarioId });
  }

  async obtener(id, actor) {
    return this.buscarConPermiso(id, actor, 'ver');
  }

  /**
   * El PRODUCTOR crea fincas a su nombre.
   * El ADMINISTRADOR puede enviar propietarioId para crearla a nombre de un productor.
   */
  async crear(datos, actor) {
    const limpio = Finca.validar(datos);

    let propietarioId = actor.id;
    if (actor.rol === 'ADMINISTRADOR' && datos.propietarioId) {
      propietarioId = leerId(datos.propietarioId, 'propietario');
      const rol = await this.fincaRepository.rolDeUsuario(propietarioId);
      if (rol !== 'PRODUCTOR') {
        throw new AppError('El propietario debe ser un usuario PRODUCTOR activo.', 422, [
          { campo: 'propietarioId', mensaje: 'Seleccione un productor válido.' },
        ]);
      }
    }

    const finca = await this.fincaRepository.crear({ ...limpio, usuarioId: propietarioId, usuarioCreaId: actor.id });
    await this.registrar(actor, 'CREAR_FINCA', finca.id);
    return finca;
  }

  async actualizar(id, datos, actor) {
    await this.buscarConPermiso(id, actor, 'editar');
    const limpio = Finca.validar(datos);
    const finca = await this.fincaRepository.actualizar(id, limpio, actor.id);
    await this.registrar(actor, 'EDITAR_FINCA', id);
    return finca;
  }

  /** Borrado lógico: activo = false. No se elimina el registro. */
  async cambiarEstado(id, activo, actor) {
    if (typeof activo !== 'boolean') {
      throw new AppError('El estado no es válido.', 422, [{ campo: 'activo', mensaje: 'Debe ser true o false.' }]);
    }
    await this.buscarConPermiso(id, actor, 'editar');
    const finca = await this.fincaRepository.cambiarEstado(id, activo, actor.id);
    await this.registrar(actor, activo ? 'ACTIVAR_FINCA' : 'DESACTIVAR_FINCA', id);
    return finca;
  }

  /** Busca la finca y verifica que el usuario tenga permiso. */
  async buscarConPermiso(id, actor, accion) {
    const finca = await this.fincaRepository.buscarPorId(id);
    if (!finca) {
      throw new AppError('La finca no existe.', 404);
    }
    const permitido = accion === 'ver' ? finca.puedeVer(actor) : finca.puedeEditar(actor);
    if (!permitido) {
      throw new AppError('No tiene permiso para acceder a esta finca.', 403);
    }
    return finca;
  }

  async registrar(actor, accion, fincaId) {
    await this.bitacora.registrar({
      usuarioId: actor.id, accion, tabla: 'finca', registroId: fincaId, resultado: 'exito',
    });
  }
}

module.exports = FincaCasosDeUso;
