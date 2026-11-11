// =====================================================================
// CAPA DOMAIN · Entidad Parcela
// Una parcela es un lote dentro de una finca, con su variedad de manzano.
// Los permisos se toman de su finca: quien puede ver o editar la finca,
// puede ver o editar sus parcelas.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

class Parcela {
  constructor({ id, fincaId, finca, codigo, variedad, superficie, numeroArboles, fechaPlantacion, activo, fechaCrea }) {
    this.id = id;
    this.fincaId = fincaId;
    this.finca = finca;                     // nombre de la finca
    this.codigo = codigo;                   // ej.: P-01
    this.variedad = variedad;               // ej.: Gala
    this.superficie = superficie;           // metros cuadrados
    this.numeroArboles = numeroArboles;
    this.fechaPlantacion = fechaPlantacion; // 'AAAA-MM-DD' o null
    this.activo = activo;
    this.fechaCrea = fechaCrea;
  }

  /**
   * Valida los datos de una parcela (crear o editar) y los devuelve limpios.
   * Lanza AppError 422 con un mensaje por cada campo incorrecto.
   */
  static validar({ codigo, variedad, superficie, numeroArboles, fechaPlantacion } = {}) {
    const errores = [];
    const texto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim());

    if (!texto(codigo) || texto(codigo).length > 20) {
      errores.push({ campo: 'codigo', mensaje: 'Ingrese el código de la parcela (máximo 20 caracteres).' });
    }
    if (!texto(variedad) || texto(variedad).length > 80) {
      errores.push({ campo: 'variedad', mensaje: 'Ingrese la variedad de manzano (máximo 80 caracteres).' });
    }

    const superficieNum = Number(superficie);
    if (texto(superficie) === '' || !Number.isFinite(superficieNum) || superficieNum <= 0) {
      errores.push({ campo: 'superficie', mensaje: 'La superficie debe ser un número mayor a 0 (en m²).' });
    }

    // Número de árboles: opcional; si se envía, entero mayor a 0.
    let arboles = null;
    if (texto(numeroArboles) !== '') {
      arboles = Number(numeroArboles);
      if (!Number.isInteger(arboles) || arboles <= 0) {
        errores.push({ campo: 'numeroArboles', mensaje: 'El número de árboles debe ser un entero mayor a 0.' });
      }
    }

    // Fecha de plantación: opcional; formato AAAA-MM-DD y no futura.
    let fecha = null;
    if (texto(fechaPlantacion) !== '') {
      fecha = texto(fechaPlantacion);
      const valida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(Date.parse(fecha));
      if (!valida) {
        errores.push({ campo: 'fechaPlantacion', mensaje: 'La fecha debe tener el formato AAAA-MM-DD.' });
      } else if (new Date(fecha) > new Date()) {
        errores.push({ campo: 'fechaPlantacion', mensaje: 'La fecha de plantación no puede ser futura.' });
      }
    }

    if (errores.length > 0) {
      throw new AppError('Los datos de la parcela no son válidos.', 422, errores);
    }

    return {
      codigo: texto(codigo).toUpperCase(), // 'p-01' se guarda como 'P-01'
      variedad: texto(variedad),
      superficie: superficieNum,
      numeroArboles: arboles,
      fechaPlantacion: fecha,
    };
  }
}

module.exports = Parcela;
