// =====================================================================
// CAPA DOMAIN · Entidad Finca
// Datos de la finca y sus reglas: qué datos son válidos y quién puede
// verla o modificarla.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

class Finca {
  constructor({ id, usuarioId, propietario, nombre, provincia, canton, direccion, altitud, activo, fechaCrea }) {
    this.id = id;
    this.usuarioId = usuarioId;       // dueño de la finca (productor)
    this.propietario = propietario;   // nombre del dueño
    this.nombre = nombre;
    this.provincia = provincia;
    this.canton = canton;
    this.direccion = direccion;
    this.altitud = altitud;           // metros sobre el nivel del mar
    this.activo = activo;
    this.fechaCrea = fechaCrea;
  }

  /**
   * ADMINISTRADOR y TECNICO pueden ver todas las fincas.
   * El PRODUCTOR solo las suyas.
   * @param {{ id: number, rol: string }} actor  Usuario que hace la petición (del token)
   */
  puedeVer(actor) {
    return actor.rol === 'ADMINISTRADOR' || actor.rol === 'TECNICO' || this.usuarioId === actor.id;
  }

  /**
   * El ADMINISTRADOR puede modificar cualquier finca.
   * El PRODUCTOR solo las suyas. El TECNICO solo consulta.
   */
  puedeEditar(actor) {
    return actor.rol === 'ADMINISTRADOR' || (actor.rol === 'PRODUCTOR' && this.usuarioId === actor.id);
  }

  /**
   * Valida los datos de una finca (crear o editar) y los devuelve limpios.
   * Lanza AppError 422 con un mensaje por cada campo incorrecto.
   */
  static validar({ nombre, provincia, canton, direccion, altitud } = {}) {
    const errores = [];
    const texto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim());

    if (texto(nombre).length < 3 || texto(nombre).length > 120) {
      errores.push({ campo: 'nombre', mensaje: 'El nombre debe tener entre 3 y 120 caracteres.' });
    }
    if (!texto(provincia) || texto(provincia).length > 60) {
      errores.push({ campo: 'provincia', mensaje: 'Ingrese la provincia (máximo 60 caracteres).' });
    }
    if (!texto(canton) || texto(canton).length > 60) {
      errores.push({ campo: 'canton', mensaje: 'Ingrese el cantón (máximo 60 caracteres).' });
    }

    // La altitud es opcional; si se envía, debe ser un entero entre 0 y 6000.
    let altitudLimpia = null;
    if (texto(altitud) !== '') {
      altitudLimpia = Number(altitud);
      if (!Number.isInteger(altitudLimpia) || altitudLimpia < 0 || altitudLimpia > 6000) {
        errores.push({ campo: 'altitud', mensaje: 'La altitud debe ser un número entero entre 0 y 6000 metros.' });
      }
    }

    if (errores.length > 0) {
      throw new AppError('Los datos de la finca no son válidos.', 422, errores);
    }

    return {
      nombre: texto(nombre),
      provincia: texto(provincia),
      canton: texto(canton),
      direccion: texto(direccion) || null,
      altitud: altitudLimpia,
    };
  }
}

module.exports = Finca;
