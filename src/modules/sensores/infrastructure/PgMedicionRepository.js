// =====================================================================
// CAPA INFRASTRUCTURE · Repositorio de mediciones con PostgreSQL
// La fecha se devuelve como texto 'AAAA-MM-DD HH:MM:SS' (hora local),
// así no cambia por la zona horaria al convertirla a JSON.
// =====================================================================
const { MedicionRepository } = require('../domain/SensorRepository');
const Medicion = require('../domain/Medicion');

const SELECT_MEDICION = `
  select m.med_id, m.med_sen_id, to_char(m.med_fecha, 'YYYY-MM-DD HH24:MI:SS') as med_fecha,
         m.med_temperatura, m.med_humedad, m.med_luminosidad, m.med_origen
  from medicion m`;

// "hasta" incluye todo ese día: fecha < hasta + 1 día.
const FILTRO_FECHAS = `m.med_fecha >= $2::date and m.med_fecha < ($3::date + 1)`;

class PgMedicionRepository extends MedicionRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listarPorSensor(sensorId, desde, hasta) {
    const { rows } = await this.pool.query(
      `${SELECT_MEDICION} where m.med_sen_id = $1 and ${FILTRO_FECHAS} order by m.med_fecha`,
      [sensorId, desde, hasta],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async listarPorParcela(parcelaId, desde, hasta) {
    const { rows } = await this.pool.query(
      `${SELECT_MEDICION}
       join sensor s on s.sen_id = m.med_sen_id
       where s.sen_par_id = $1 and ${FILTRO_FECHAS}
       order by m.med_fecha`,
      [parcelaId, desde, hasta],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async existe(sensorId, fecha) {
    const { rows } = await this.pool.query(
      'select 1 from medicion where med_sen_id = $1 and med_fecha = $2::timestamp',
      [sensorId, fecha],
    );
    return rows.length > 0;
  }

  async crear({ sensorId, fecha, temperatura, humedad, luminosidad, origen, usuarioCreaId }) {
    // Si no llega fecha, se usa la hora actual del servidor de base de datos.
    const { rows } = await this.pool.query(
      `insert into medicion (med_sen_id, med_fecha, med_temperatura, med_humedad, med_luminosidad, med_origen, med_usuario_crea)
       values ($1, coalesce($2::timestamp, date_trunc('second', localtimestamp)), $3, $4, $5, $6, $7)
       returning med_id`,
      [sensorId, fecha, temperatura, humedad, luminosidad, origen, usuarioCreaId],
    );
    const resultado = await this.pool.query(`${SELECT_MEDICION} where m.med_id = $1`, [rows[0].med_id]);
    return this.aEntidad(resultado.rows[0]);
  }

  /** PostgreSQL devuelve los numeric como texto; se pasan a número. */
  aEntidad(fila) {
    const numero = (valor) => (valor === null ? null : Number(valor));
    return new Medicion({
      id: fila.med_id,
      sensorId: fila.med_sen_id,
      fecha: fila.med_fecha,
      temperatura: numero(fila.med_temperatura),
      humedad: numero(fila.med_humedad),
      luminosidad: numero(fila.med_luminosidad),
      origen: fila.med_origen,
    });
  }
}

module.exports = PgMedicionRepository;
