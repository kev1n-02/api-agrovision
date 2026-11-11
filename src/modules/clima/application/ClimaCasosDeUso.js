// =====================================================================
// CAPA APPLICATION · Casos de uso de clima
//   analizarParcela  → resumen del clima y periodos favorables por enfermedad
//   listarUmbrales   → valores de referencia de la literatura
//   actualizarUmbral → el técnico ajusta o confirma un valor
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const Umbral = require('../domain/Umbral');
const { resumir, evaluarCondiciones } = require('../domain/analisisClima');

class ClimaCasosDeUso {
  /**
   * @param {import('../domain/UmbralRepository')} umbralRepository
   * @param {import('../../sensores/domain/SensorRepository').MedicionRepository} medicionRepository
   * @param {import('../../parcelas/application/AccesoParcela')} accesoParcela
   * @param {import('../../../shared/bitacora/BitacoraRepository')} bitacora
   */
  constructor(umbralRepository, medicionRepository, accesoParcela, bitacora) {
    this.umbralRepository = umbralRepository;
    this.medicionRepository = medicionRepository;
    this.accesoParcela = accesoParcela;
    this.bitacora = bitacora;
  }

  /**
   * Analiza el clima de una parcela en un rango de fechas.
   * El resultado indica ASOCIACIÓN con condiciones favorables según la
   * literatura; no demuestra que el clima haya causado una enfermedad.
   */
  async analizarParcela(parcelaId, rango, actor) {
    const { parcela } = await this.accesoParcela.verificar(parcelaId, actor, 'ver');
    const mediciones = await this.medicionRepository.listarPorParcela(parcelaId, rango.desde, rango.hasta);
    const umbrales = await this.umbralRepository.listar();

    return {
      parcela: { id: parcela.id, codigo: parcela.codigo, finca: parcela.finca },
      periodo: rango,
      resumen: resumir(mediciones),
      condiciones: mediciones.length ? evaluarCondiciones(mediciones, umbrales) : [],
      nota: 'Las condiciones favorables se calculan con umbrales de la literatura. '
        + 'Indican asociación, no causalidad. La humedad relativa ≥ 90 % se usa como aproximación a la hoja mojada.',
    };
  }

  async listarUmbrales() {
    return this.umbralRepository.listar();
  }

  /** Solo cambia los campos enviados; los demás se mantienen. */
  async actualizarUmbral(id, datos, actor) {
    const actual = await this.umbralRepository.buscarPorId(id);
    if (!actual) {
      throw new AppError('El umbral no existe.', 404);
    }

    const cambios = Umbral.validarCambios(datos);
    const enviado = (campo) => Object.prototype.hasOwnProperty.call(datos || {}, campo);
    const nuevo = {
      tempMin: enviado('tempMin') ? cambios.tempMin : actual.tempMin,
      tempMax: enviado('tempMax') ? cambios.tempMax : actual.tempMax,
      humedadMin: enviado('humedadMin') ? cambios.humedadMin : actual.humedadMin,
      horasMin: enviado('horasMin') ? cambios.horasMin : actual.horasMin,
      descripcion: cambios.descripcion ?? actual.descripcion,
      provisional: cambios.provisional ?? actual.provisional,
    };
    if (nuevo.tempMin !== null && nuevo.tempMax !== null && nuevo.tempMin > nuevo.tempMax) {
      throw new AppError('La temperatura máxima debe ser mayor o igual a la mínima.', 422, [
        { campo: 'tempMax', mensaje: 'Revise el rango de temperatura.' },
      ]);
    }

    const umbral = await this.umbralRepository.actualizar(id, nuevo, actor.id);
    await this.bitacora.registrar({
      usuarioId: actor.id, accion: 'EDITAR_UMBRAL', tabla: 'umbral_ambiental', registroId: id, resultado: 'exito',
    });
    return umbral;
  }
}

module.exports = ClimaCasosDeUso;
