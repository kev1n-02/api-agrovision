// =====================================================================
// CAPA DOMAIN · Validación de la imagen subida
// El tipo se revisa por los primeros bytes del archivo ("firma"), no por
// el nombre ni por lo que diga el navegador: un archivo .exe renombrado a
// .jpg no tiene la firma de un JPG y se rechaza.
// =====================================================================
const AppError = require('../../../shared/errors/AppError');

const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB

/**
 * @param {Buffer} contenido
 * @returns {'image/jpeg'|'image/png'|null}
 */
function detectarTipo(contenido) {
  if (!contenido || contenido.length < 8) return null;
  // JPG empieza con FF D8 FF
  if (contenido[0] === 0xff && contenido[1] === 0xd8 && contenido[2] === 0xff) return 'image/jpeg';
  // PNG empieza con 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, i) => contenido[i] === byte)) return 'image/png';
  return null;
}

/**
 * Valida el archivo recibido (lo entrega multer en req.file).
 * @param {{ buffer: Buffer, size: number }|undefined} archivo
 * @returns {{ contenido: Buffer, tipo: string }}
 */
function validarImagen(archivo) {
  if (!archivo || !archivo.buffer || archivo.size === 0) {
    throw new AppError('Adjunte la foto de la hoja.', 400, [
      { campo: 'imagen', mensaje: 'Seleccione una imagen JPG o PNG.' },
    ]);
  }
  if (archivo.size > TAMANO_MAXIMO) {
    throw new AppError('La imagen supera el tamaño máximo de 10 MB.', 413, [
      { campo: 'imagen', mensaje: 'Reduzca el tamaño de la foto.' },
    ]);
  }
  const tipo = detectarTipo(archivo.buffer);
  if (!tipo) {
    throw new AppError('Solo se aceptan imágenes JPG o PNG.', 422, [
      { campo: 'imagen', mensaje: 'El archivo no es una imagen JPG o PNG válida.' },
    ]);
  }
  return { contenido: archivo.buffer, tipo };
}

module.exports = { detectarTipo, validarImagen, TAMANO_MAXIMO };
