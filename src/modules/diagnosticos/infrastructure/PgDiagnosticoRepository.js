// =====================================================================
// CAPA INFRASTRUCTURE · Repositorio de diagnósticos con PostgreSQL
// La cabecera y el detalle se guardan en UNA transacción: o se guarda
// todo, o no se guarda nada (igual que una venta con su detalle).
// =====================================================================
const { DiagnosticoRepository } = require('../domain/contratos');
const Diagnostico = require('../domain/Diagnostico');

const SELECT_DIAGNOSTICO = `
  select d.dia_id, d.dia_par_id, p.par_codigo, f.fin_id, f.fin_nombre,
         m.mod_nombre || ' v' || m.mod_version as modelo,
         d.dia_usu_id, u.usu_nombres,
         d.dia_enf_id, e.enf_nombre, e.enf_codigo, d.dia_confianza, d.dia_estado,
         d.dia_enf_confirmada_id, ec.enf_nombre as enf_confirmada,
         rv.usu_nombres as revisor,
         to_char(d.dia_fecha_revision, 'YYYY-MM-DD HH24:MI:SS') as dia_fecha_revision,
         d.dia_observaciones, d.dia_advertencias,
         to_char(d.dia_fecha_crea, 'YYYY-MM-DD HH24:MI:SS') as dia_fecha,
         exists (select 1 from dia_detalle x where x.det_dia_id = d.dia_id and x.det_supera_umbral) as concluyente
  from diagnostico d
  join parcela p on p.par_id = d.dia_par_id
  join finca f on f.fin_id = p.par_fin_id
  join modelo_ia m on m.mod_id = d.dia_mod_id
  join usuario u on u.usu_id = d.dia_usu_id
  join enfermedad e on e.enf_id = d.dia_enf_id
  left join enfermedad ec on ec.enf_id = d.dia_enf_confirmada_id
  left join usuario rv on rv.usu_id = d.dia_revisado_por`;

class PgDiagnosticoRepository extends DiagnosticoRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async modeloActivo() {
    const { rows } = await this.pool.query(
      'select mod_id, mod_nombre, mod_version from modelo_ia where mod_activo = true limit 1',
    );
    return rows[0] ? { id: rows[0].mod_id, nombre: rows[0].mod_nombre, version: rows[0].mod_version } : null;
  }

  async enfermedades() {
    const { rows } = await this.pool.query('select enf_id, enf_codigo, enf_nombre from enfermedad order by enf_id');
    return rows.map((fila) => ({ id: fila.enf_id, codigo: fila.enf_codigo, nombre: fila.enf_nombre }));
  }

  async crear(cabecera, detalle) {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('begin');

      const { rows } = await cliente.query(
        `insert into diagnostico (dia_par_id, dia_mod_id, dia_usu_id, dia_imagen_ruta, dia_imagen_hash,
                                  dia_enf_id, dia_confianza, dia_advertencias)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning dia_id`,
        [cabecera.parcelaId, cabecera.modeloId, cabecera.usuarioId, cabecera.imagenRuta,
          cabecera.imagenHash, cabecera.enfermedadId, cabecera.confianza,
          // Se guardan en un solo texto separado por " | " (null si no hay)
          cabecera.advertencias && cabecera.advertencias.length ? cabecera.advertencias.join(' | ') : null],
      );
      const id = rows[0].dia_id;

      // Una fila por enfermedad con su probabilidad.
      for (const fila of detalle) {
        await cliente.query(
          `insert into dia_detalle (det_dia_id, det_enf_id, det_probabilidad, det_supera_umbral)
           values ($1, $2, $3, $4)`,
          [id, fila.enfermedadId, fila.probabilidad, fila.detectada],
        );
      }

      await cliente.query('commit');
      return id;
    } catch (error) {
      await cliente.query('rollback');
      throw error;
    } finally {
      cliente.release(); // devuelve la conexión al pool
    }
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_DIAGNOSTICO} where d.dia_id = $1 and d.dia_activo = true`, [id]);
    if (!rows[0]) return null;

    const detalle = await this.pool.query(
      `select x.det_enf_id, e.enf_codigo, e.enf_nombre, x.det_probabilidad, x.det_supera_umbral
       from dia_detalle x join enfermedad e on e.enf_id = x.det_enf_id
       where x.det_dia_id = $1
       order by x.det_probabilidad desc`,
      [id],
    );
    const diagnostico = this.aEntidad(rows[0]);
    diagnostico.detalle = detalle.rows.map((fila) => ({
      enfermedadId: fila.det_enf_id,
      codigo: fila.enf_codigo,
      nombre: fila.enf_nombre,
      probabilidad: Number(fila.det_probabilidad),
      detectada: fila.det_supera_umbral,
    }));
    return diagnostico;
  }

  async listar({ parcelaId = null, duenoId = null, estado = null, desde, hasta }) {
    const { rows } = await this.pool.query(
      `${SELECT_DIAGNOSTICO}
       where d.dia_activo = true
         and ($1::int is null or d.dia_par_id = $1)
         and ($2::int is null or f.fin_usu_id = $2)
         and ($3::text is null or d.dia_estado = $3)
         and d.dia_fecha_crea >= $4::date and d.dia_fecha_crea < ($5::date + 1)
       order by d.dia_id desc
       limit 500`,
      [parcelaId, duenoId, estado, desde, hasta],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async revisar(id, { estado, enfermedadConfirmadaId, observaciones }, revisadoPor) {
    await this.pool.query(
      `update diagnostico
       set dia_estado = $2, dia_enf_confirmada_id = $3, dia_observaciones = $4,
           dia_revisado_por = $5, dia_fecha_revision = current_timestamp
       where dia_id = $1`,
      [id, estado, enfermedadConfirmadaId, observaciones, revisadoPor],
    );
  }

  async datosImagen(id) {
    const { rows } = await this.pool.query('select dia_imagen_ruta, dia_imagen_hash from diagnostico where dia_id = $1', [id]);
    return { ruta: rows[0].dia_imagen_ruta, hash: rows[0].dia_imagen_hash ? rows[0].dia_imagen_hash.trim() : null };
  }

  aEntidad(fila) {
    return new Diagnostico({
      id: fila.dia_id,
      parcelaId: fila.dia_par_id,
      parcela: fila.par_codigo,
      fincaId: fila.fin_id,
      finca: fila.fin_nombre,
      modelo: fila.modelo,
      usuarioId: fila.dia_usu_id,
      usuario: fila.usu_nombres,
      enfermedadId: fila.dia_enf_id,
      enfermedad: fila.enf_nombre,
      codigo: fila.enf_codigo,
      confianza: Number(fila.dia_confianza),
      concluyente: fila.concluyente,
      estado: fila.dia_estado,
      enfermedadConfirmadaId: fila.dia_enf_confirmada_id,
      enfermedadConfirmada: fila.enf_confirmada,
      revisadoPor: fila.revisor,
      fechaRevision: fila.dia_fecha_revision,
      observaciones: fila.dia_observaciones,
      advertencias: fila.dia_advertencias ? fila.dia_advertencias.split(' | ') : [],
      fecha: fila.dia_fecha,
    });
  }
}

module.exports = PgDiagnosticoRepository;
