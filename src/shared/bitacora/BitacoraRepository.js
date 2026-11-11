// =====================================================================
// Registro de acciones en la tabla bitacora (auditoría).
// Si falla el registro, NO se detiene la operación principal: solo se
// muestra un aviso en la consola. Nunca se guardan contraseñas ni tokens.
// =====================================================================
class BitacoraRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * @param {object} evento
   * @param {number|null} evento.usuarioId
   * @param {string} evento.accion       Ej.: 'LOGIN', 'REGISTRO_USUARIO'
   * @param {string} evento.tabla        Tabla afectada
   * @param {number|null} evento.registroId
   * @param {'exito'|'fallo'} evento.resultado
   * @param {string|null} evento.detalle
   * @param {string|null} evento.ip
   */
  async registrar({ usuarioId = null, accion, tabla, registroId = null, resultado, detalle = null, ip = null }) {
    try {
      await this.pool.query(
        `insert into bitacora (bit_usu_id, bit_accion, bit_tabla, bit_registro_id, bit_resultado, bit_detalle, bit_ip)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [usuarioId, accion, tabla, registroId, resultado, detalle, ip],
      );
    } catch (error) {
      console.error('No se pudo registrar en la bitácora:', error.message);
    }
  }

  /**
   * Consulta la bitácora con filtros y paginación (los más recientes primero).
   * count(*) over () devuelve el total de registros encontrados en cada fila,
   * así se sabe cuántas páginas hay sin hacer otra consulta.
   * @returns {Promise<{ total: number, registros: Array }>}
   */
  async listar({ desde, hasta, usuarioId = null, accion = null, limite, desplazamiento }) {
    const { rows } = await this.pool.query(
      `select b.bit_id, b.bit_usu_id, u.usu_nombres, b.bit_accion, b.bit_tabla, b.bit_registro_id,
              b.bit_resultado, b.bit_detalle, b.bit_ip,
              to_char(b.bit_fecha, 'YYYY-MM-DD HH24:MI:SS') as bit_fecha,
              count(*) over () as total
       from bitacora b
       left join usuario u on u.usu_id = b.bit_usu_id
       where b.bit_fecha >= $1::date and b.bit_fecha < ($2::date + 1)
         and ($3::int is null or b.bit_usu_id = $3)
         and ($4::text is null or b.bit_accion = $4)
       order by b.bit_id desc
       limit $5 offset $6`,
      [desde, hasta, usuarioId, accion, limite, desplazamiento],
    );
    return {
      total: rows.length ? Number(rows[0].total) : 0,
      registros: rows.map((fila) => ({
        id: fila.bit_id,
        usuarioId: fila.bit_usu_id,
        usuario: fila.usu_nombres,
        accion: fila.bit_accion,
        tabla: fila.bit_tabla,
        registroId: fila.bit_registro_id,
        resultado: fila.bit_resultado,
        detalle: fila.bit_detalle,
        ip: fila.bit_ip,
        fecha: fila.bit_fecha,
      })),
    };
  }
}

module.exports = BitacoraRepository;
