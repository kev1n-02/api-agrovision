// =====================================================================
// CAPA INFRASTRUCTURE · Repositorio de umbrales con PostgreSQL
// =====================================================================
const UmbralRepository = require('../domain/UmbralRepository');
const Umbral = require('../domain/Umbral');

const SELECT_UMBRAL = `
  select u.umb_id, u.umb_enf_id, e.enf_nombre, e.enf_codigo,
         u.umb_temp_min, u.umb_temp_max, u.umb_humedad_min, u.umb_horas_min,
         u.umb_descripcion, u.umb_fuente, u.umb_provisional
  from umbral_ambiental u
  join enfermedad e on e.enf_id = u.umb_enf_id`;

class PgUmbralRepository extends UmbralRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listar() {
    const { rows } = await this.pool.query(`${SELECT_UMBRAL} order by e.enf_nombre`);
    return rows.map((fila) => this.aEntidad(fila));
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_UMBRAL} where u.umb_id = $1`, [id]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async actualizar(id, { tempMin, tempMax, humedadMin, horasMin, descripcion, provisional }, usuarioActId) {
    await this.pool.query(
      `update umbral_ambiental
       set umb_temp_min = $2, umb_temp_max = $3, umb_humedad_min = $4, umb_horas_min = $5,
           umb_descripcion = $6, umb_provisional = $7,
           umb_usuario_act = $8, umb_fecha_act = current_timestamp
       where umb_id = $1`,
      [id, tempMin, tempMax, humedadMin, horasMin, descripcion, provisional, usuarioActId],
    );
    return this.buscarPorId(id);
  }

  /** Los numeric llegan como texto; se pasan a número (o null). */
  aEntidad(fila) {
    const numero = (valor) => (valor === null ? null : Number(valor));
    return new Umbral({
      id: fila.umb_id,
      enfermedadId: fila.umb_enf_id,
      enfermedad: fila.enf_nombre,
      codigo: fila.enf_codigo,
      tempMin: numero(fila.umb_temp_min),
      tempMax: numero(fila.umb_temp_max),
      humedadMin: numero(fila.umb_humedad_min),
      horasMin: numero(fila.umb_horas_min),
      descripcion: fila.umb_descripcion,
      fuente: fila.umb_fuente,
      provisional: fila.umb_provisional,
    });
  }
}

module.exports = PgUmbralRepository;
