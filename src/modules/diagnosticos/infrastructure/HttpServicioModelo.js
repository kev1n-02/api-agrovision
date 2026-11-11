// =====================================================================
// CAPA INFRASTRUCTURE · Cliente HTTP del servicio Python (FastAPI)
//
// Contrato con el servicio:
//   POST {ML_URL}/predict   (multipart/form-data, campo "imagen")
//   200 → { "modelo": "exp01_effb0_384",
//           "probabilidades": { "healthy": 0.01, "scab": 0.93, ... },
//           "umbrales":       { "healthy": 0.93, "scab": 0.61, ... },
//           "advertencias":   ["La imagen parece desenfocada.", ...],
//           "calidad":        { "brillo": 120.5, "nitidez": 80.2, "fraccion_verde": 0.85 } }
//   422 → { "detail": { "mensaje": "El archivo no es una imagen válida...", "problemas": [] } }
// El servicio es api_modelo.py, que usa codigo/inferencia.py del notebook.
//
// Usa fetch y FormData, que vienen incluidos en Node 18 o superior.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');
const { ServicioModelo } = require('../domain/contratos');

const NO_DISPONIBLE = 'El servicio de diagnóstico no está disponible. Intente nuevamente en unos minutos.';

class HttpServicioModelo extends ServicioModelo {
  /**
   * @param {string} url            Ej.: http://localhost:8000
   * @param {number} tiempoEsperaMs Tiempo máximo de espera por respuesta
   */
  constructor(url, tiempoEsperaMs = 30000) {
    super();
    this.url = String(url || '').replace(/\/$/, '');
    this.tiempoEsperaMs = tiempoEsperaMs;
  }

  async predecir(contenido, tipo) {
    const respuesta = await this.enviar(contenido, tipo);
    const cuerpo = await respuesta.json().catch(() => null);

    // El servicio rechazó la foto por calidad (borrosa, oscura, sin hoja...)
    if (respuesta.status === 422 && cuerpo && cuerpo.detail && cuerpo.detail.mensaje) {
      const problemas = Array.isArray(cuerpo.detail.problemas) ? cuerpo.detail.problemas : [];
      throw new AppError(cuerpo.detail.mensaje, 422, problemas.map((mensaje) => ({ campo: 'imagen', mensaje })));
    }

    if (!respuesta.ok || !cuerpo || typeof cuerpo.probabilidades !== 'object') {
      console.error('[MODELO] Respuesta inesperada:', respuesta.status, cuerpo);
      throw new AppError('El servicio de diagnóstico respondió con un error.', 502);
    }

    return {
      probabilidades: cuerpo.probabilidades,
      umbrales: cuerpo.umbrales || {},
      modelo: cuerpo.modelo,
      advertencias: Array.isArray(cuerpo.advertencias) ? cuerpo.advertencias.map(String) : [],
      calidad: cuerpo.calidad || null,
    };
  }

  /**
   * Envía la imagen. Si la conexión falla, reintenta UNA vez
   * (por ejemplo, si el servicio se estaba reiniciando).
   * Si se agota el tiempo de espera, no reintenta.
   */
  async enviar(contenido, tipo) {
    for (let intento = 1; intento <= 2; intento++) {
      const formulario = new FormData();
      formulario.append('imagen', new Blob([contenido], { type: tipo }), tipo === 'image/png' ? 'hoja.png' : 'hoja.jpg');
      try {
        return await fetch(`${this.url}/predict`, {
          method: 'POST',
          body: formulario,
          signal: AbortSignal.timeout(this.tiempoEsperaMs),
        });
      } catch (error) {
        const agotado = error.name === 'TimeoutError' || error.name === 'AbortError';
        if (agotado || intento === 2) {
          console.error('[MODELO] Sin respuesta:', error.message);
          throw new AppError(NO_DISPONIBLE, 503);
        }
      }
    }
    throw new AppError(NO_DISPONIBLE, 503);
  }
}

module.exports = HttpServicioModelo;
