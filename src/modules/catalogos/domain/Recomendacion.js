// =====================================================================
// CAPA DOMAIN · Entidad Recomendacion
// Medida de manejo para una enfermedad. Siempre lleva su fuente, para
// que el informe muestre de dónde sale cada recomendación.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

const TIPOS = ['preventiva', 'cultural', 'control', 'monitoreo'];
const texto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim());

class Recomendacion {
  constructor({ id, enfermedadId, enfermedad, tipo, descripcion, fuente, activo }) {
    this.id = id;
    this.enfermedadId = enfermedadId;
    this.enfermedad = enfermedad;
    this.tipo = tipo;
    this.descripcion = descripcion;
    this.fuente = fuente;
    this.activo = activo;
  }

  static validar({ tipo, descripcion, fuente } = {}) {
    const errores = [];
    if (!TIPOS.includes(texto(tipo))) {
      errores.push({ campo: 'tipo', mensaje: `El tipo debe ser: ${TIPOS.join(', ')}.` });
    }
    if (texto(descripcion).length < 10) {
      errores.push({ campo: 'descripcion', mensaje: 'Describa la recomendación (mínimo 10 caracteres).' });
    }
    if (texto(fuente).length < 3) {
      errores.push({ campo: 'fuente', mensaje: 'Indique la fuente de la recomendación.' });
    }
    if (errores.length > 0) {
      throw new AppError('Los datos de la recomendación no son válidos.', 422, errores);
    }
    return { tipo: texto(tipo), descripcion: texto(descripcion), fuente: texto(fuente) };
  }
}

module.exports = Recomendacion;
