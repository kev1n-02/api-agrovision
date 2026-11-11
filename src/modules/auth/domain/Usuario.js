// =====================================================================
// CAPA DOMAIN · Entidad Usuario
// Representa a un usuario y sus reglas de negocio. No sabe nada de
// Express ni de PostgreSQL: solo datos y validaciones.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const { esCedulaValida } = require('./cedula');

const texto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim());

/** Reglas de nombres y correo (se usan al crear y al editar). */
function validarNombresYCorreo({ nombres, correo }, errores) {
  if (texto(nombres).length < 3) {
    errores.push({ campo: 'nombres', mensaje: 'Los nombres deben tener al menos 3 caracteres.' });
  } else if (texto(nombres).length > 150) {
    errores.push({ campo: 'nombres', mensaje: 'Los nombres no pueden superar 150 caracteres.' });
  }
  // Formato básico: texto@texto.dominio
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(correo))) {
    errores.push({ campo: 'correo', mensaje: 'El correo no tiene un formato válido.' });
  }
}

class Usuario {
  constructor({ id, cedula, nombres, correo, rol, activo, contrasenaHash, fechaCrea }) {
    this.id = id;
    this.cedula = cedula;
    this.nombres = nombres;
    this.correo = correo;
    this.rol = rol;
    this.activo = activo;
    this.contrasenaHash = contrasenaHash;
    this.fechaCrea = fechaCrea;
  }

  /** Datos que se pueden enviar al frontend (nunca el hash de la contraseña). */
  datosPublicos() {
    return {
      id: this.id,
      cedula: this.cedula,
      nombres: this.nombres,
      correo: this.correo,
      rol: this.rol,
      activo: this.activo,
      fechaCrea: this.fechaCrea,
    };
  }

  /**
   * Regla de contraseña: mínimo 8 caracteres, con al menos una letra y un número.
   * @returns {string|null} mensaje de error, o null si es válida
   */
  static errorContrasena(contrasena) {
    const valor = contrasena === undefined || contrasena === null ? '' : String(contrasena);
    if (valor.length < 8 || !/[A-Za-z]/.test(valor) || !/\d/.test(valor)) {
      return 'La contraseña debe tener al menos 8 caracteres, con letras y números.';
    }
    return null;
  }

  /**
   * Valida los datos de un usuario nuevo y los devuelve limpios.
   * Si algo está mal, lanza un AppError 422 con un mensaje por campo,
   * para que el frontend lo muestre junto a cada input.
   */
  static validarNuevo({ cedula, nombres, correo, contrasena } = {}) {
    const errores = [];

    if (!esCedulaValida(texto(cedula))) {
      errores.push({ campo: 'cedula', mensaje: 'La cédula no es válida.' });
    }
    validarNombresYCorreo({ nombres, correo }, errores);
    const errorClave = Usuario.errorContrasena(contrasena);
    if (errorClave) errores.push({ campo: 'contrasena', mensaje: errorClave });

    if (errores.length > 0) {
      throw new AppError('Los datos enviados no son válidos.', 422, errores);
    }

    // El correo se guarda en minúsculas para que "Ana@Mail.com" y
    // "ana@mail.com" se consideren el mismo usuario.
    return {
      cedula: texto(cedula),
      nombres: texto(nombres),
      correo: texto(correo).toLowerCase(),
    };
  }

  /** Valida la edición de un usuario (la cédula no se cambia). */
  static validarEdicion({ nombres, correo } = {}) {
    const errores = [];
    validarNombresYCorreo({ nombres, correo }, errores);
    if (errores.length > 0) {
      throw new AppError('Los datos enviados no son válidos.', 422, errores);
    }
    return { nombres: texto(nombres), correo: texto(correo).toLowerCase() };
  }
}

module.exports = Usuario;
