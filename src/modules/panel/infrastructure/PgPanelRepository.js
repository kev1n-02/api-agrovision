// =====================================================================
// CAPA INFRASTRUCTURE · Consultas del panel con PostgreSQL
// Son consultas de conteo y resumen (count, group by).
// Filtro común: ($1::int is null or f.fin_usu_id = $1)
//   → si $1 es null, todas las fincas; si no, solo las del productor.
// =====================================================================
const PanelRepository = require('../domain/PanelRepository');

const DE_SU_FINCA = '($1::int is null or f.fin_usu_id = $1)';
// "current_date - $2" = hoy menos N días (PostgreSQL resta días a una fecha)
const EN_EL_PERIODO = 'd.dia_fecha_crea >= current_date - $2::int';

const numero = (valor) => Number(valor);

class PgPanelRepository extends PanelRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async contadores(duenoId, dias) {
    const { rows } = await this.pool.query(
      `select
         (select count(*) from finca f where f.fin_activo and ${DE_SU_FINCA}) as fincas,
         (select count(*) from parcela p join finca f on f.fin_id = p.par_fin_id
           where p.par_activo and f.fin_activo and ${DE_SU_FINCA}) as parcelas,
         (select count(*) from diagnostico d join parcela p on p.par_id = d.dia_par_id join finca f on f.fin_id = p.par_fin_id
           where d.dia_activo and ${EN_EL_PERIODO} and ${DE_SU_FINCA}) as diagnosticos_periodo,
         (select count(*) from diagnostico d join parcela p on p.par_id = d.dia_par_id join finca f on f.fin_id = p.par_fin_id
           where d.dia_activo and d.dia_estado = 'pendiente' and ${DE_SU_FINCA}) as pendientes_revision,
         (select count(*) from tratamiento t join parcela p on p.par_id = t.tra_par_id join finca f on f.fin_id = p.par_fin_id
           where t.tra_estado = 'activo' and ${DE_SU_FINCA}) as tratamientos_activos,
         (select count(*) from informe i join parcela p on p.par_id = i.inf_par_id join finca f on f.fin_id = p.par_fin_id
           where i.inf_estado = 'emitido' and ${DE_SU_FINCA}) as informes_emitidos,
         (select count(*) from informe i join parcela p on p.par_id = i.inf_par_id join finca f on f.fin_id = p.par_fin_id
           where i.inf_estado = 'borrador' and ${DE_SU_FINCA}) as informes_borrador`,
      [duenoId, dias],
    );
    const f = rows[0];
    return {
      fincas: numero(f.fincas),
      parcelas: numero(f.parcelas),
      diagnosticosPeriodo: numero(f.diagnosticos_periodo),
      pendientesRevision: numero(f.pendientes_revision),
      tratamientosActivos: numero(f.tratamientos_activos),
      informesEmitidos: numero(f.informes_emitidos),
      informesBorrador: numero(f.informes_borrador),
    };
  }

  /** Casos por enfermedad FINAL (la del técnico si revisó; si no, la del modelo). */
  async distribucionPorEnfermedad(duenoId, dias) {
    const { rows } = await this.pool.query(
      `select coalesce(ec.enf_nombre, e.enf_nombre) as enfermedad,
              coalesce(ec.enf_codigo, e.enf_codigo) as codigo,
              coalesce(ec.enf_es_sana, e.enf_es_sana) as es_sana,
              count(*) as casos
       from diagnostico d
       join enfermedad e on e.enf_id = d.dia_enf_id
       left join enfermedad ec on ec.enf_id = d.dia_enf_confirmada_id
       join parcela p on p.par_id = d.dia_par_id
       join finca f on f.fin_id = p.par_fin_id
       where d.dia_activo and ${EN_EL_PERIODO} and ${DE_SU_FINCA}
       group by 1, 2, 3
       order by casos desc, enfermedad`,
      [duenoId, dias],
    );
    return rows.map((fila) => ({ enfermedad: fila.enfermedad, codigo: fila.codigo, esSana: fila.es_sana, casos: numero(fila.casos) }));
  }

  async ultimosDiagnosticos(duenoId, cantidad) {
    const { rows } = await this.pool.query(
      `select d.dia_id, to_char(d.dia_fecha_crea, 'YYYY-MM-DD HH24:MI') as fecha,
              f.fin_nombre, p.par_codigo, d.dia_par_id,
              coalesce(ec.enf_nombre, e.enf_nombre) as enfermedad,
              coalesce(ec.enf_codigo, e.enf_codigo) as codigo, d.dia_confianza, d.dia_estado
       from diagnostico d
       join enfermedad e on e.enf_id = d.dia_enf_id
       left join enfermedad ec on ec.enf_id = d.dia_enf_confirmada_id
       join parcela p on p.par_id = d.dia_par_id
       join finca f on f.fin_id = p.par_fin_id
       where d.dia_activo and ${DE_SU_FINCA}
       order by d.dia_id desc
       limit $2`,
      [duenoId, cantidad],
    );
    return rows.map((fila) => ({
      id: fila.dia_id,
      fecha: fila.fecha,
      finca: fila.fin_nombre,
      parcelaId: fila.dia_par_id,
      parcela: fila.par_codigo,
      enfermedad: fila.enfermedad,
      codigo: fila.codigo,
      confianza: numero(fila.dia_confianza),
      estado: fila.dia_estado,
    }));
  }

  async pendientesAntiguos(duenoId, diasMinimos) {
    const { rows } = await this.pool.query(
      `select d.dia_id, f.fin_nombre, p.par_codigo, e.enf_nombre,
              (current_date - d.dia_fecha_crea::date) as dias
       from diagnostico d
       join enfermedad e on e.enf_id = d.dia_enf_id
       join parcela p on p.par_id = d.dia_par_id
       join finca f on f.fin_id = p.par_fin_id
       where d.dia_activo and d.dia_estado = 'pendiente'
         and d.dia_fecha_crea < current_date - $2::int and ${DE_SU_FINCA}
       order by dias desc
       limit 10`,
      [duenoId, diasMinimos],
    );
    return rows.map((fila) => ({ id: fila.dia_id, finca: fila.fin_nombre, parcela: fila.par_codigo, enfermedad: fila.enf_nombre, dias: numero(fila.dias) }));
  }

  /** Pendientes del periodo en los que ninguna enfermedad superó su umbral. */
  async noConcluyentes(duenoId, dias) {
    const { rows } = await this.pool.query(
      `select d.dia_id, f.fin_nombre, p.par_codigo
       from diagnostico d
       join parcela p on p.par_id = d.dia_par_id
       join finca f on f.fin_id = p.par_fin_id
       where d.dia_activo and d.dia_estado = 'pendiente' and ${EN_EL_PERIODO} and ${DE_SU_FINCA}
         and not exists (select 1 from dia_detalle x where x.det_dia_id = d.dia_id and x.det_supera_umbral)
       order by d.dia_id desc
       limit 10`,
      [duenoId, dias],
    );
    return rows.map((fila) => ({ id: fila.dia_id, finca: fila.fin_nombre, parcela: fila.par_codigo }));
  }

  /** Tratamientos activos cuya última evaluación (o su inicio) fue hace N días o más. */
  async tratamientosSinSeguimiento(duenoId, diasMinimos) {
    const { rows } = await this.pool.query(
      `select t.tra_id, e.enf_nombre, p.par_codigo, f.fin_nombre,
              current_date - coalesce(max(s.seg_fecha), t.tra_fecha_inicio) as dias
       from tratamiento t
       join enfermedad e on e.enf_id = t.tra_enf_id
       join parcela p on p.par_id = t.tra_par_id
       join finca f on f.fin_id = p.par_fin_id
       left join seguimiento s on s.seg_tra_id = t.tra_id
       where t.tra_estado = 'activo' and ${DE_SU_FINCA}
       group by t.tra_id, e.enf_nombre, p.par_codigo, f.fin_nombre, t.tra_fecha_inicio
       having current_date - coalesce(max(s.seg_fecha), t.tra_fecha_inicio) >= $2::int
       order by dias desc
       limit 10`,
      [duenoId, diasMinimos],
    );
    return rows.map((fila) => ({ id: fila.tra_id, enfermedad: fila.enf_nombre, parcela: fila.par_codigo, finca: fila.fin_nombre, dias: numero(fila.dias) }));
  }

  async usuariosPorRol() {
    const { rows } = await this.pool.query(
      `select r.rol_nombre,
              count(u.usu_id) filter (where u.usu_activo) as activos,
              count(u.usu_id) filter (where not u.usu_activo) as inactivos
       from usu_rol r
       left join usuario u on u.usu_rol_id = r.rol_id
       group by r.rol_id, r.rol_nombre
       order by r.rol_id`,
    );
    return rows.map((fila) => ({ rol: fila.rol_nombre, activos: numero(fila.activos), inactivos: numero(fila.inactivos) }));
  }
}

module.exports = PgPanelRepository;
