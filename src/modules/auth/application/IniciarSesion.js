// =====================================================================
// CAPA APPLICATION · Caso de uso: iniciar sesión
// Pasos:
//   1. Verificar que lleguen correo y contraseña.
//   2. Buscar el usuario por correo.
//   3. Comparar la contraseña con el hash guardado (Bcrypt).
//   4. Verificar que el usuario esté activo.
//   5. Generar el token JWT y registrar el evento en la bitácora.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

class IniciarSesion {
  /**
   * @param {import('../domain/UsuarioRepository')} usuarioRepository
   * @param {{ comparar: Function }} servicioContrasena
   * @param {{ generarToken: Function }} servicioToken
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(usuarioRepository, servicioContrasena, servicioToken, bitacora) {
    this.usuarioRepository = usuarioRepository;
    this.servicioContrasena = servicioContrasena;
    this.servicioToken = servicioToken;
    this.bitacora = bitacora;
  }

  /**
   * @param {{ correo: string, contrasena: string }} credenciales
   * @param {string|null} ip  IP desde donde se intenta el login
   * @returns {Promise<{ token: string, usuario: object }>}
   */
  async ejecutar({ correo, contrasena } = {}, ip = null) {
    const errores = [];
    if (!correo) errores.push({ campo: 'correo', mensaje: 'Ingrese su correo.' });
    if (!contrasena) errores.push({ campo: 'contrasena', mensaje: 'Ingrese su contraseña.' });
    if (errores.length > 0) {
      throw new AppError('Ingrese correo y contraseña.', 400, errores);
    }

    const usuario = await this.usuarioRepository.buscarPorCorreo(String(correo).trim().toLowerCase());

    // Mismo mensaje si el correo no existe o si la contraseña es incorrecta:
    // así no se revela qué correos están registrados.
    const coincide = usuario
      ? await this.servicioContrasena.comparar(String(contrasena), usuario.contrasenaHash)
      : false;

    if (!coincide) {
      await this.bitacora.registrar({
        usuarioId: usuario ? usuario.id : null,
        accion: 'LOGIN',
        tabla: 'usuario',
        resultado: 'fallo',
        detalle: 'Credenciales incorrectas',
        ip,
      });
      throw new AppError('Correo o contraseña incorrectos.', 401);
    }

    if (!usuario.activo) {
      throw new AppError('Su usuario está inactivo. Comuníquese con el administrador.', 403);
    }

    const token = this.servicioToken.generarToken({ id: usuario.id, rol: usuario.rol });

    await this.bitacora.registrar({
      usuarioId: usuario.id,
      accion: 'LOGIN',
      tabla: 'usuario',
      registroId: usuario.id,
      resultado: 'exito',
      ip,
    });

    return { token, usuario: usuario.datosPublicos() };
  }
}

module.exports = IniciarSesion;
