// =====================================================================
// CAPA DOMAIN · Entidad Tratamiento
// Plan de manejo que el técnico define para una enfermedad en una parcela.
// Estados:
//   activo    → en curso: se pueden registrar seguimientos
//   cerrado   → terminó (se evalúa su resultado en el informe)
//   cancelado → se suspendió
// Un tratamiento cerrado o cancelado ya no se modifica: queda como historial.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const { esFechaValida } = require('../../../shared/utils/fechas');

const texto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim());

class Tratamiento {
  constructor(datos) {
    this.id = datos.id;
    this.parcelaId = datos.parcelaId;
    this.parcela = datos.parcela;
    this.fincaId = datos.fincaId;
    this.finca = datos.finca;
    this.diagnosticoId = datos.diagnosticoId;   // diagnóstico que lo originó (opcional)
    this.enfermedadId = datos.enfermedadId;
    this.enfermedad = datos.enfermedad;
    this.responsableId = datos.responsableId;   // técnico responsable
    this.responsable = datos.responsable;
    this.objetivo = datos.objetivo;
    this.acciones = datos.acciones;             // ej.: poda sanitaria, retiro de hojarasca
    this.producto = datos.producto;             // solo productos autorizados (opcional)
    this.fechaInicio = datos.fechaInicio;       // 'AAAA-MM-DD'
    this.fechaFin = datos.fechaFin;
    this.estado = datos.estado;
    this.numEvaluaciones = datos.numEvaluaciones; // cantidad de seguimientos registrados
  }

  estaActivo() {
    return this.estado === 'activo';
  }

  /** Valida los datos del plan (crear o editar) y los devuelve limpios. */
  static validar({ objetivo, acciones, producto, fechaInicio, fechaFin } = {}) {
    const errores = [];

    if (texto(objetivo).length < 5) {
      errores.push({ campo: 'objetivo', mensaje: 'Describa el objetivo del tratamiento (mínimo 5 caracteres).' });
    }
    if (texto(acciones).length < 5) {
      errores.push({ campo: 'acciones', mensaje: 'Describa las acciones a realizar (mínimo 5 caracteres).' });
    }
    if (texto(producto).length > 120) {
      errores.push({ campo: 'producto', mensaje: 'El producto no puede superar 120 caracteres.' });
    }
    if (!esFechaValida(texto(fechaInicio))) {
      errores.push({ campo: 'fechaInicio', mensaje: 'Ingrese la fecha de inicio con el formato AAAA-MM-DD.' });
    }
    if (texto(fechaFin) !== '') {
      if (!esFechaValida(texto(fechaFin))) {
        errores.push({ campo: 'fechaFin', mensaje: 'La fecha de fin debe tener el formato AAAA-MM-DD.' });
      } else if (esFechaValida(texto(fechaInicio)) && texto(fechaFin) < texto(fechaInicio)) {
        // Con el formato AAAA-MM-DD, comparar como texto equivale a comparar fechas.
        errores.push({ campo: 'fechaFin', mensaje: 'La fecha de fin no puede ser anterior a la de inicio.' });
      }
    }

    if (errores.length > 0) {
      throw new AppError('Los datos del tratamiento no son válidos.', 422, errores);
    }

    return {
      objetivo: texto(objetivo),
      acciones: texto(acciones),
      producto: texto(producto) || null,
      fechaInicio: texto(fechaInicio),
      fechaFin: texto(fechaFin) || null,
    };
  }
}

module.exports = Tratamiento;
