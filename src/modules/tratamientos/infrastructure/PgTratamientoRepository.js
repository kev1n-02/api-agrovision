// =====================================================================
// CAPA INFRASTRUCTURE · Repositorio de tratamientos y seguimientos
// =====================================================================
const TratamientoRepository = require('../domain/TratamientoRepository');
const Tratamiento = require('../domain/Tratamiento');
const Seguimiento = require('../domain/Seguimiento');

const SELECT_TRATAMIENTO = `
  select t.tra_id, t.tra_par_id, p.par_codigo, f.fin_id, f.fin_nombre, t.tra_dia_id,
         t.tra_enf_id, e.enf_nombre, t.tra_usu_id, u.usu_nombres,
         t.tra_objetivo, t.tra_acciones, t.tra_producto,
         to_char(t.tra_fecha_inicio, 'YYYY-MM-DD') as tra_fecha_inicio,
         to_char(t.tra_fecha_fin, 'YYYY-MM-DD') as tra_fecha_fin,
         t.tra_estado,
         (select count(*) from seguimiento s where s.seg_tra_id = t.tra_id) as num_evaluaciones
  from tratamiento t
  join parcela p on p.par_id = t.tra_par_id
  join finca f on f.fin_id = p.par_fin_id
  join enfermedad e on e.enf_id = t.tra_enf_id
  join usuario u on u.usu_id = t.tra_usu_id`;

class PgTratamientoRepository extends TratamientoRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async crear({ parcelaId, diagnosticoId, enfermedadId, responsableId, objetivo, acciones, producto, fechaInicio, fechaFin }) {
    const { rows } = await this.pool.query(
      `insert into tratamiento (tra_par_id, tra_dia_id, tra_enf_id, tra_usu_id, tra_objetivo, tra_acciones,
                                tra_producto, tra_fecha_inicio, tra_fecha_fin, tra_usuario_crea)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $4)
       returning tra_id`,
      [parcelaId, diagnosticoId, enfermedadId, responsableId, objetivo, acciones, producto, fechaInicio, fechaFin],
    );
    return rows[0].tra_id;
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_TRATAMIENTO} where t.tra_id = $1`, [id]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async listar({ parcelaId = null, duenoId = null, estado = null }) {
    const { rows } = await this.pool.query(
      `${SELECT_TRATAMIENTO}
       where ($1::int is null or t.tra_par_id = $1)
         and ($2::int is null or f.fin_usu_id = $2)
         and ($3::text is null or t.tra_estado = $3)
       order by t.tra_id desc`,
      [parcelaId, duenoId, estado],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async actualizar(id, { objetivo, acciones, producto, fechaInicio, fechaFin }, usuarioActId) {
    await this.pool.query(
      `update tratamiento
       set tra_objetivo = $2, tra_acciones = $3, tra_producto = $4, tra_fecha_inicio = $5, tra_fecha_fin = $6,
           tra_usuario_act = $7, tra_fecha_act = current_timestamp
       where tra_id = $1`,
      [id, objetivo, acciones, producto, fechaInicio, fechaFin, usuarioActId],
    );
  }

  async cambiarEstado(id, estado, fechaFin, usuarioActId) {
    await this.pool.query(
      `update tratamiento
       set tra_estado = $2, tra_fecha_fin = $3, tra_usuario_act = $4, tra_fecha_act = current_timestamp
       where tra_id = $1`,
      [id, estado, fechaFin, usuarioActId],
    );
  }

  async existeActivoParaDiagnostico(diagnosticoId) {
    const { rows } = await this.pool.query(
      "select 1 from tratamiento where tra_dia_id = $1 and tra_estado = 'activo'",
      [diagnosticoId],
    );
    return rows.length > 0;
  }

  // ---------- Seguimientos ----------

  async listarSeguimientos(tratamientoId) {
    const { rows } = await this.pool.query(
      `select s.seg_id, s.seg_tra_id, to_char(s.seg_fecha, 'YYYY-MM-DD') as seg_fecha,
              s.seg_hojas_evaluadas, s.seg_hojas_afectadas, s.seg_severidad, s.seg_observaciones,
              u.usu_nombres
       from seguimiento s
       left join usuario u on u.usu_id = s.seg_usuario_crea
       where s.seg_tra_id = $1
       order by s.seg_fecha, s.seg_id`,
      [tratamientoId],
    );
    return rows.map((fila) => new Seguimiento({
      id: fila.seg_id,
      tratamientoId: fila.seg_tra_id,
      fecha: fila.seg_fecha,
      hojasEvaluadas: fila.seg_hojas_evaluadas,
      hojasAfectadas: fila.seg_hojas_afectadas,
      severidad: fila.seg_severidad,
      observaciones: fila.seg_observaciones,
      registradoPor: fila.usu_nombres,
    }));
  }

  async existeSeguimientoEnFecha(tratamientoId, fecha) {
    const { rows } = await this.pool.query(
      'select 1 from seguimiento where seg_tra_id = $1 and seg_fecha = $2::date',
      [tratamientoId, fecha],
    );
    return rows.length > 0;
  }

  async crearSeguimiento(tratamientoId, { fecha, hojasEvaluadas, hojasAfectadas, severidad, observaciones }, usuarioCreaId) {
    const { rows } = await this.pool.query(
      `insert into seguimiento (seg_tra_id, seg_fecha, seg_hojas_evaluadas, seg_hojas_afectadas,
                                seg_severidad, seg_observaciones, seg_usuario_crea)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning seg_id`,
      [tratamientoId, fecha, hojasEvaluadas, hojasAfectadas, severidad, observaciones, usuarioCreaId],
    );
    return rows[0].seg_id;
  }

  aEntidad(fila) {
    return new Tratamiento({
      id: fila.tra_id,
      parcelaId: fila.tra_par_id,
      parcela: fila.par_codigo,
      fincaId: fila.fin_id,
      finca: fila.fin_nombre,
      diagnosticoId: fila.tra_dia_id,
      enfermedadId: fila.tra_enf_id,
      enfermedad: fila.enf_nombre,
      responsableId: fila.tra_usu_id,
      responsable: fila.usu_nombres,
      objetivo: fila.tra_objetivo,
      acciones: fila.tra_acciones,
      producto: fila.tra_producto,
      fechaInicio: fila.tra_fecha_inicio,
      fechaFin: fila.tra_fecha_fin,
      estado: fila.tra_estado,
      numEvaluaciones: Number(fila.num_evaluaciones),
    });
  }
}

module.exports = PgTratamientoRepository;
