// =====================================================================
// CAPA DOMAIN · Entidad Enfermedad
// Es una de las clases que reconoce el modelo. El código (scab, rust...)
// NO se edita, porque debe coincidir con la salida del modelo.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

const texto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim());

class Enfermedad {
  constructor({ id, codigo, nombre, agenteCausal, descripcion, condicionesFavorables, esSana }) {
    this.id = id;
    this.codigo = codigo;
    this.nombre = nombre;
    this.agenteCausal = agenteCausal;
    this.descripcion = descripcion;
    this.condicionesFavorables = condicionesFavorables;
    this.esSana = esSana;
  }

  /** Valida la edición de los textos descriptivos. */
  static validarEdicion({ nombre, agenteCausal, descripcion, condicionesFavorables } = {}) {
    const errores = [];
    if (texto(nombre).length < 3 || texto(nombre).length > 80) {
      errores.push({ campo: 'nombre', mensaje: 'El nombre debe tener entre 3 y 80 caracteres.' });
    }
    if (texto(agenteCausal).length > 120) {
      errores.push({ campo: 'agenteCausal', mensaje: 'El agente causal no puede superar 120 caracteres.' });
    }
    if (errores.length > 0) {
      throw new AppError('Los datos de la enfermedad no son válidos.', 422, errores);
    }
    return {
      nombre: texto(nombre),
      agenteCausal: texto(agenteCausal) || null,
      descripcion: texto(descripcion) || null,
      condicionesFavorables: texto(condicionesFavorables) || null,
    };
  }
}

module.exports = Enfermedad;
