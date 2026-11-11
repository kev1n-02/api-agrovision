// =====================================================================
// CAPA APPLICATION · Gestión de usuarios (solo ADMINISTRADOR)
// Usa la entidad Usuario y el repositorio del módulo auth: el usuario es
// el mismo; aquí solo están las operaciones de administración.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const Usuario = require('../../auth/domain/Usuario');

class UsuarioCasosDeUso {
  /**
   * @param {import('../../auth/domain/UsuarioRepository')} usuarioRepository
   * @param {import('../../auth/application/RegistrarUsuario')} registrarUsuario
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(usuarioRepository, registrarUsuario, bitacora) {
    this.usuarioRepository = usuarioRepository;
    this.registrarUsuario = registrarUsuario;
    this.bitacora = bitacora;
  }

  async listar(rol = null) {
    const usuarios = await this.usuarioRepository.listar({ rol: rol || null });
    return usuarios.map((u) => u.datosPublicos());
  }

  async listarRoles() {
    return this.usuarioRepository.listarRoles();
  }

  async obtener(id) {
    return (await this.buscar(id)).datosPublicos();
  }

  /** El administrador crea usuarios de cualquier rol (reutiliza RegistrarUsuario). */
  async crear(datos, actor) {
    const rol = String(datos.rol || '').trim().toUpperCase();
    if (!rol) {
      throw new AppError('Seleccione el rol del usuario.', 422, [{ campo: 'rol', mensaje: 'El rol es obligatorio.' }]);
    }
    const usuario = await this.registrarUsuario.ejecutar(datos, rol, actor.id);
    return usuario.datosPublicos();
  }

  /** Edita nombres, correo y rol. La cédula no se cambia. */
  async actualizar(id, datos, actor) {
    const actual = await this.buscar(id);
    const limpio = Usuario.validarEdicion(datos);

    const rol = datos.rol ? String(datos.rol).trim().toUpperCase() : actual.rol;
    if (id === actor.id && rol !== actual.rol) {
      throw new AppError('No puede cambiar su propio rol.', 400);
    }
    const rolId = await this.usuarioRepository.buscarRolId(rol);
    if (!rolId) {
      throw new AppError(`El rol ${rol} no existe.`, 422, [{ campo: 'rol', mensaje: 'Seleccione un rol válido.' }]);
    }
    if (await this.usuarioRepository.existeCorreo(limpio.correo, id)) {
      throw new AppError('Ya existe un usuario con ese correo.', 409, [
        { campo: 'correo', mensaje: 'Este correo ya está registrado.' },
      ]);
    }

    const usuario = await this.usuarioRepository.actualizar(id, { ...limpio, rolId }, actor.id);
    await this.registrar(actor, 'EDITAR_USUARIO', id, `Rol ${rol}`);
    return usuario.datosPublicos();
  }

  /** Un usuario inactivo ya no puede iniciar sesión. */
  async cambiarEstado(id, activo, actor) {
    if (typeof activo !== 'boolean') {
      throw new AppError('El estado no es válido.', 422, [{ campo: 'activo', mensaje: 'Debe ser true o false.' }]);
    }
    if (id === actor.id && activo === false) {
      throw new AppError('No puede desactivar su propio usuario.', 400);
    }
    await this.buscar(id);
    const usuario = await this.usuarioRepository.cambiarEstado(id, activo, actor.id);
    await this.registrar(actor, activo ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO', id);
    return usuario.datosPublicos();
  }

  async buscar(id) {
    const usuario = await this.usuarioRepository.buscarPorId(id);
    if (!usuario) {
      throw new AppError('El usuario no existe.', 404);
    }
    return usuario;
  }

  async registrar(actor, accion, usuarioId, detalle = null) {
    await this.bitacora.registrar({
      usuarioId: actor.id, accion, tabla: 'usuario', registroId: usuarioId, resultado: 'exito', detalle,
    });
  }
}

module.exports = UsuarioCasosDeUso;
