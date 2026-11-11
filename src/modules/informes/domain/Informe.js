// =====================================================================
// CAPA DOMAIN · Entidad Informe
// Estados:
//   borrador → el técnico lo revisa y puede ajustar la propuesta de estudio
//   emitido  → versión final: ya no cambia y la puede ver el productor
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

const texto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim());

class Informe {
  constructor(datos) {
    this.id = datos.id;
    this.parcelaId = datos.parcelaId;
    this.parcela = datos.parcela;
    this.finca = datos.finca;
    this.enfermedadId = datos.enfermedadId;       // enfermedad principal del periodo
    this.enfermedad = datos.enfermedad;
    this.desde = datos.desde;
    this.hasta = datos.hasta;
    this.totalDiagnosticos = datos.totalDiagnosticos;
    this.temperaturaPromedio = datos.temperaturaPromedio;
    this.humedadPromedio = datos.humedadPromedio;
    this.luminosidadPromedio = datos.luminosidadPromedio;
    this.incidenciaInicial = datos.incidenciaInicial;
    this.incidenciaFinal = datos.incidenciaFinal;
    this.estado = datos.estado;
    this.generadoPor = datos.generadoPor;
    this.fechaCrea = datos.fechaCrea;
    this.emitidoPor = datos.emitidoPor;
    this.fechaEmision = datos.fechaEmision;
    this.contenido = datos.contenido;             // solo en el detalle
  }

  estaEmitido() {
    return this.estado === 'emitido';
  }

  /**
   * Valida los cambios del técnico a la propuesta de estudio.
   * Solo se cambian los campos enviados; la línea base y el resultado
   * medido NO se editan: salen de los datos.
   */
  static validarPropuesta(datos = {}) {
    const errores = [];
    const cambios = {};
    const enviado = (campo) => Object.prototype.hasOwnProperty.call(datos, campo);

    const textoEntre = (campo, minimo, maximo, mensaje) => {
      if (!enviado(campo)) return;
      const valor = texto(datos[campo]);
      if (valor.length < minimo || valor.length > maximo) errores.push({ campo, mensaje });
      else cambios[campo] = valor;
    };

    textoEntre('hipotesis', 10, 600, 'La hipótesis debe tener entre 10 y 600 caracteres.');
    textoEntre('intervencion', 5, 1000, 'La intervención debe tener entre 5 y 1000 caracteres.');
    textoEntre('indicador', 3, 150, 'El indicador debe tener entre 3 y 150 caracteres.');
    textoEntre('comparacion', 5, 400, 'La comparación debe tener entre 5 y 400 caracteres.');
    textoEntre('frecuencia', 3, 150, 'La frecuencia debe tener entre 3 y 150 caracteres.');
    textoEntre('duracion', 3, 150, 'La duración debe tener entre 3 y 150 caracteres.');

    if (enviado('meta')) {
      const meta = Number(datos.meta);
      if (texto(datos.meta) === '' || !Number.isFinite(meta) || meta < 0 || meta > 100) {
        errores.push({ campo: 'meta', mensaje: 'La meta debe ser una incidencia entre 0 y 100 %.' });
      } else {
        cambios.meta = meta;
      }
    }
    if (enviado('observaciones')) {
      const valor = texto(datos.observaciones);
      if (valor.length > 1000) errores.push({ campo: 'observaciones', mensaje: 'Máximo 1000 caracteres.' });
      else cambios.observaciones = valor || null;
    }

    if (errores.length > 0) {
      throw new AppError('La propuesta no es válida.', 422, errores);
    }
    if (Object.keys(cambios).length === 0) {
      throw new AppError('No se envió ningún cambio para la propuesta.', 400);
    }
    return cambios;
  }
}

module.exports = Informe;
