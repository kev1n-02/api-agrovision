// =====================================================================
// CAPA INFRASTRUCTURE · Guarda las fotos en una carpeta del servidor
// La carpeta (UPLOADS_DIR) NO es pública: las fotos solo se ven a través
// de la API, que verifica el token y los permisos.
// Cada archivo recibe un nombre aleatorio (UUID): el nombre original
// del usuario no se usa, así no se pueden sobrescribir archivos.
// =====================================================================
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { AlmacenImagenes } = require('../domain/contratos');

const EXTENSIONES = { 'image/jpeg': '.jpg', 'image/png': '.png' };

class AlmacenImagenesDisco extends AlmacenImagenes {
  /** @param {string} directorio  Carpeta base, por ejemplo 'uploads' */
  constructor(directorio) {
    super();
    this.directorio = path.resolve(directorio);
  }

  async guardar(contenido, tipo) {
    const ruta = `diagnosticos/${crypto.randomUUID()}${EXTENSIONES[tipo] || ''}`;
    const destino = this.rutaCompleta(ruta);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, contenido);
    const hash = crypto.createHash('sha256').update(contenido).digest('hex');
    return { ruta, hash };
  }

  async leer(ruta) {
    return fs.readFile(this.rutaCompleta(ruta));
  }

  async eliminar(ruta) {
    await fs.unlink(this.rutaCompleta(ruta)).catch(() => {});
  }

  /** Evita salir de la carpeta base (por ejemplo con '../'). */
  rutaCompleta(ruta) {
    const completa = path.resolve(this.directorio, ruta);
    if (!completa.startsWith(this.directorio + path.sep)) {
      throw new Error('Ruta de imagen no permitida.');
    }
    return completa;
  }
}

module.exports = AlmacenImagenesDisco;
