// =====================================================================
// CAPA INFRASTRUCTURE · Repositorio de catálogos con PostgreSQL
// =====================================================================
const CatalogoRepository = require('../domain/CatalogoRepository');
const Enfermedad = require('../domain/Enfermedad');
const Recomendacion = require('../domain/Recomendacion');

const SELECT_ENFERMEDAD = `
  select enf_id, enf_codigo, enf_nombre, enf_agente_causal, enf_descripcion,
         enf_condiciones_favorables, enf_es_sana
  from enfermedad`;

const SELECT_RECOMENDACION = `
  select r.rec_id, r.rec_enf_id, e.enf_nombre, r.rec_tipo, r.rec_descripcion, r.rec_fuente, r.rec_activo
  from recomendacion r
  join enfermedad e on e.enf_id = r.rec_enf_id`;

class PgCatalogoRepository extends CatalogoRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  // ---------- Enfermedades ----------

  async listarEnfermedades() {
    const { rows } = await this.pool.query(`${SELECT_ENFERMEDAD} order by enf_es_sana desc, enf_nombre`);
    return rows.map((fila) => this.aEnfermedad(fila));
  }

  async buscarEnfermedad(id) {
    const { rows } = await this.pool.query(`${SELECT_ENFERMEDAD} where enf_id = $1`, [id]);
    return rows[0] ? this.aEnfermedad(rows[0]) : null;
  }

  async actualizarEnfermedad(id, { nombre, agenteCausal, descripcion, condicionesFavorables }) {
    await this.pool.query(
      `update enfermedad
       set enf_nombre = $2, enf_agente_causal = $3, enf_descripcion = $4, enf_condiciones_favorables = $5
       where enf_id = $1`,
      [id, nombre, agenteCausal, descripcion, condicionesFavorables],
    );
    return this.buscarEnfermedad(id);
  }

  // ---------- Recomendaciones ----------

  async listarRecomendaciones(enfermedadId, soloActivas) {
    const { rows } = await this.pool.query(
      `${SELECT_RECOMENDACION}
       where r.rec_enf_id = $1 and ($2::boolean = false or r.rec_activo = true)
       order by r.rec_tipo, r.rec_id`,
      [enfermedadId, soloActivas],
    );
    return rows.map((fila) => this.aRecomendacion(fila));
  }

  async buscarRecomendacion(id) {
    const { rows } = await this.pool.query(`${SELECT_RECOMENDACION} where r.rec_id = $1`, [id]);
    return rows[0] ? this.aRecomendacion(rows[0]) : null;
  }

  async crearRecomendacion(enfermedadId, { tipo, descripcion, fuente }, usuarioCreaId) {
    const { rows } = await this.pool.query(
      `insert into recomendacion (rec_enf_id, rec_tipo, rec_descripcion, rec_fuente, rec_usuario_crea)
       values ($1, $2, $3, $4, $5)
       returning rec_id`,
      [enfermedadId, tipo, descripcion, fuente, usuarioCreaId],
    );
    return this.buscarRecomendacion(rows[0].rec_id);
  }

  async actualizarRecomendacion(id, { tipo, descripcion, fuente }, usuarioActId) {
    await this.pool.query(
      `update recomendacion
       set rec_tipo = $2, rec_descripcion = $3, rec_fuente = $4,
           rec_usuario_act = $5, rec_fecha_act = current_timestamp
       where rec_id = $1`,
      [id, tipo, descripcion, fuente, usuarioActId],
    );
    return this.buscarRecomendacion(id);
  }

  async cambiarEstadoRecomendacion(id, activo, usuarioActId) {
    await this.pool.query(
      `update recomendacion set rec_activo = $2, rec_usuario_act = $3, rec_fecha_act = current_timestamp
       where rec_id = $1`,
      [id, activo, usuarioActId],
    );
    return this.buscarRecomendacion(id);
  }

  // ---------- Modelos ----------

  async listarModelos() {
    const { rows } = await this.pool.query(
      `select mod_id, mod_nombre, mod_version, mod_arquitectura, mod_archivo, mod_metrica, mod_umbral,
              to_char(mod_fecha_entrenamiento, 'YYYY-MM-DD') as mod_fecha_entrenamiento, mod_activo
       from modelo_ia order by mod_activo desc, mod_id desc`,
    );
    const numero = (valor) => (valor === null ? null : Number(valor));
    return rows.map((fila) => ({
      id: fila.mod_id,
      nombre: fila.mod_nombre,
      version: fila.mod_version,
      arquitectura: fila.mod_arquitectura,
      archivo: fila.mod_archivo,
      metrica: numero(fila.mod_metrica),
      umbral: numero(fila.mod_umbral),
      fechaEntrenamiento: fila.mod_fecha_entrenamiento,
      activo: fila.mod_activo,
    }));
  }

  // ---------- Conversión fila → entidad ----------

  aEnfermedad(fila) {
    return new Enfermedad({
      id: fila.enf_id,
      codigo: fila.enf_codigo,
      nombre: fila.enf_nombre,
      agenteCausal: fila.enf_agente_causal,
      descripcion: fila.enf_descripcion,
      condicionesFavorables: fila.enf_condiciones_favorables,
      esSana: fila.enf_es_sana,
    });
  }

  aRecomendacion(fila) {
    return new Recomendacion({
      id: fila.rec_id,
      enfermedadId: fila.rec_enf_id,
      enfermedad: fila.enf_nombre,
      tipo: fila.rec_tipo,
      descripcion: fila.rec_descripcion,
      fuente: fila.rec_fuente,
      activo: fila.rec_activo,
    });
  }
}

module.exports = PgCatalogoRepository;
