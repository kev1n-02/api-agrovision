// =====================================================================
// CAPA APPLICATION · Caso de uso: registrar un usuario
// Pasos:
//   1. Validar los datos con las reglas del dominio.
//   2. Verificar que el correo y la cédula no estén registrados.
//   3. Buscar el rol.
//   4. Hashear la contraseña con Bcrypt.
//   5. Guardar el usuario.
// Recibe sus dependencias por el constructor, así no conoce PostgreSQL.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const Usuario = require('../domain/Usuario');

class RegistrarUsuario {
  /**
   * @param {import('../domain/UsuarioRepository')} usuarioRepository
   * @param {{ hashear: Function }} servicioContrasena
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(usuarioRepository, servicioContrasena, bitacora) {
    this.usuarioRepository = usuarioRepository;
    this.servicioContrasena = servicioContrasena;
    this.bitacora = bitacora;
  }

  /**
   * @param {object} datos  { cedula, nombres, correo, contrasena }
   * @param {string} nombreRol  'PRODUCTOR' por defecto
   * @param {number|null} usuarioCreaId  Quién lo registra (null si es autoregistro)
   * @returns {Promise<Usuario>}
   */
  async ejecutar(datos, nombreRol = 'PRODUCTOR', usuarioCreaId = null) {
    const limpio = Usuario.validarNuevo(datos);

    if (await this.usuarioRepository.existeCorreo(limpio.correo)) {
      throw new AppError('Ya existe un usuario con ese correo.', 409, [
        { campo: 'correo', mensaje: 'Este correo ya está registrado.' },
      ]);
    }

    if (await this.usuarioRepository.existeCedula(limpio.cedula)) {
      throw new AppError('Ya existe un usuario con esa cédula.', 409, [
        { campo: 'cedula', mensaje: 'Esta cédula ya está registrada.' },
      ]);
    }

    const rolId = await this.usuarioRepository.buscarRolId(nombreRol);
    if (!rolId) {
      throw new AppError(`El rol ${nombreRol} no existe.`, 400);
    }

    // La contraseña se convierte en hash ANTES de llegar a la base de datos.
    const contrasenaHash = await this.servicioContrasena.hashear(datos.contrasena);

    const usuario = await this.usuarioRepository.crear({
      ...limpio,
      contrasenaHash,
      rolId,
      usuarioCreaId,
    });

    await this.bitacora.registrar({
      usuarioId: usuarioCreaId ?? usuario.id,
      accion: 'REGISTRO_USUARIO',
      tabla: 'usuario',
      registroId: usuario.id,
      resultado: 'exito',
      detalle: `Rol ${nombreRol}`,
    });

    return usuario;
  }
}

module.exports = RegistrarUsuario;
