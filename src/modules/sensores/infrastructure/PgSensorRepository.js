// =====================================================================
// CAPA INFRASTRUCTURE · Repositorio de sensores con PostgreSQL
// La columna sen_api_key (hash de la clave) nunca se devuelve: solo se
// informa si el sensor tiene clave (tiene_clave).
// =====================================================================
const { SensorRepository } = require('../domain/SensorRepository');
const Sensor = require('../domain/Sensor');

const SELECT_SENSOR = `
  select s.sen_id, s.sen_par_id, p.par_codigo, s.sen_codigo, s.sen_descripcion,
         s.sen_tipo, s.sen_activo, (s.sen_api_key is not null) as tiene_clave, s.sen_fecha_crea
  from sensor s
  join parcela p on p.par_id = s.sen_par_id`;

class PgSensorRepository extends SensorRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listarPorParcela(parcelaId) {
    const { rows } = await this.pool.query(`${SELECT_SENSOR} where s.sen_par_id = $1 order by s.sen_codigo`, [parcelaId]);
    return rows.map((fila) => this.aEntidad(fila));
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_SENSOR} where s.sen_id = $1`, [id]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async buscarPorClave(hashClave) {
    const { rows } = await this.pool.query(`${SELECT_SENSOR} where s.sen_api_key = $1`, [hashClave]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async existeCodigo(codigo) {
    const { rows } = await this.pool.query('select 1 from sensor where sen_codigo = $1', [codigo]);
    return rows.length > 0;
  }

  async crear({ parcelaId, codigo, descripcion, tipo, hashClave, usuarioCreaId }) {
    const { rows } = await this.pool.query(
      `insert into sensor (sen_par_id, sen_codigo, sen_descripcion, sen_tipo, sen_api_key, sen_usuario_crea)
       values ($1, $2, $3, $4, $5, $6)
       returning sen_id`,
      [parcelaId, codigo, descripcion, tipo, hashClave, usuarioCreaId],
    );
    return this.buscarPorId(rows[0].sen_id);
  }

  async guardarClave(id, hashClave, usuarioActId) {
    await this.pool.query(
      `update sensor set sen_api_key = $2, sen_usuario_act = $3, sen_fecha_act = current_timestamp
       where sen_id = $1`,
      [id, hashClave, usuarioActId],
    );
  }

  async cambiarEstado(id, activo, usuarioActId) {
    await this.pool.query(
      `update sensor set sen_activo = $2, sen_usuario_act = $3, sen_fecha_act = current_timestamp
       where sen_id = $1`,
      [id, activo, usuarioActId],
    );
    return this.buscarPorId(id);
  }

  aEntidad(fila) {
    return new Sensor({
      id: fila.sen_id,
      parcelaId: fila.sen_par_id,
      parcela: fila.par_codigo,
      codigo: fila.sen_codigo,
      descripcion: fila.sen_descripcion,
      tipo: fila.sen_tipo,
      activo: fila.sen_activo,
      tieneClave: fila.tiene_clave,
      fechaCrea: fila.sen_fecha_crea,
    });
  }
}

module.exports = PgSensorRepository;
