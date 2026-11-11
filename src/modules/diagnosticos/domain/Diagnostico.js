// =====================================================================
// CAPA DOMAIN · Entidad Diagnostico
// Cabecera del diagnóstico (como una venta). El detalle (dia_detalle)
// guarda la probabilidad de cada enfermedad (como ven_detalle).
//
// Estados:
//   pendiente  → lo hizo el modelo; falta que lo revise un técnico
//   confirmado → el técnico está de acuerdo con el modelo
//   corregido  → el técnico indicó otra enfermedad
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

const ESTADOS_REVISION = ['confirmado', 'corregido'];

class Diagnostico {
  constructor(datos) {
    this.id = datos.id;
    this.parcelaId = datos.parcelaId;
    this.parcela = datos.parcela;             // código de la parcela
    this.fincaId = datos.fincaId;
    this.finca = datos.finca;                 // nombre de la finca
    this.modelo = datos.modelo;               // 'ProyectoPlantasIA v1.0'
    this.usuarioId = datos.usuarioId;
    this.usuario = datos.usuario;             // quien tomó la foto
    this.enfermedadId = datos.enfermedadId;   // principal según el modelo
    this.enfermedad = datos.enfermedad;
    this.codigo = datos.codigo;
    this.confianza = datos.confianza;         // 0 a 1
    this.concluyente = datos.concluyente;     // ¿alguna superó su umbral?
    this.estado = datos.estado;
    this.enfermedadConfirmadaId = datos.enfermedadConfirmadaId;
    this.enfermedadConfirmada = datos.enfermedadConfirmada;
    this.revisadoPor = datos.revisadoPor;
    this.fechaRevision = datos.fechaRevision;
    this.observaciones = datos.observaciones;
    this.advertencias = datos.advertencias || []; // calidad de la foto según el modelo
    this.fecha = datos.fecha;
    this.detalle = datos.detalle || [];       // probabilidad por enfermedad
  }

  /**
   * Enfermedad que vale para el informe: la del técnico si ya revisó,
   * si no, la del modelo.
   */
  enfermedadFinalId() {
    return this.enfermedadConfirmadaId || this.enfermedadId;
  }

  /** Valida la revisión del técnico. */
  static validarRevision({ estado, enfermedadId, observaciones } = {}, enfermedadDelModeloId) {
    const errores = [];
    if (!ESTADOS_REVISION.includes(estado)) {
      errores.push({ campo: 'estado', mensaje: 'El estado debe ser "confirmado" o "corregido".' });
    }

    let enfermedadConfirmadaId = enfermedadDelModeloId;
    if (estado === 'corregido') {
      enfermedadConfirmadaId = Number(enfermedadId);
      if (!Number.isInteger(enfermedadConfirmadaId) || enfermedadConfirmadaId <= 0) {
        errores.push({ campo: 'enfermedadId', mensaje: 'Seleccione la enfermedad correcta.' });
      } else if (enfermedadConfirmadaId === enfermedadDelModeloId) {
        errores.push({ campo: 'enfermedadId', mensaje: 'Si la enfermedad es la misma del modelo, use "confirmado".' });
      }
    }

    const texto = observaciones === undefined || observaciones === null ? '' : String(observaciones).trim();
    if (texto.length > 1000) {
      errores.push({ campo: 'observaciones', mensaje: 'Las observaciones no pueden superar 1000 caracteres.' });
    }

    if (errores.length > 0) {
      throw new AppError('La revisión no es válida.', 422, errores);
    }
    return { estado, enfermedadConfirmadaId, observaciones: texto || null };
  }
}

module.exports = Diagnostico;
