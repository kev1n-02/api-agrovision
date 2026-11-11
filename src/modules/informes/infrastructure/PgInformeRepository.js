// =====================================================================
// CAPA INFRASTRUCTURE · Repositorio de informes con PostgreSQL
// El contenido completo se guarda como texto JSON en inf_contenido.
// =====================================================================
const { InformeRepository } = require('../domain/contratos');
const Informe = require('../domain/Informe');

const SELECT_INFORME = `
  select i.inf_id, i.inf_par_id, p.par_codigo, f.fin_nombre, i.inf_enf_id, e.enf_nombre,
         to_char(i.inf_fecha_inicio, 'YYYY-MM-DD') as inf_desde,
         to_char(i.inf_fecha_fin, 'YYYY-MM-DD') as inf_hasta,
         i.inf_total_diagnosticos, i.inf_temp_promedio, i.inf_humedad_promedio, i.inf_luz_promedio,
         i.inf_incidencia_inicial, i.inf_incidencia_final, i.inf_estado,
         g.usu_nombres as generado_por, to_char(i.inf_fecha_crea, 'YYYY-MM-DD HH24:MI:SS') as inf_fecha_crea,
         em.usu_nombres as emitido_por, to_char(i.inf_fecha_emision, 'YYYY-MM-DD HH24:MI:SS') as inf_fecha_emision`;

const FROM_INFORME = `
  from informe i
  join parcela p on p.par_id = i.inf_par_id
  join finca f on f.fin_id = p.par_fin_id
  join usuario g on g.usu_id = i.inf_usu_id
  left join enfermedad e on e.enf_id = i.inf_enf_id
  left join usuario em on em.usu_id = i.inf_emitido_por`;

class PgInformeRepository extends InformeRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async crear(d) {
    const { rows } = await this.pool.query(
      `insert into informe (inf_par_id, inf_usu_id, inf_enf_id, inf_fecha_inicio, inf_fecha_fin,
                            inf_total_diagnosticos, inf_temp_promedio, inf_humedad_promedio, inf_luz_promedio,
                            inf_incidencia_inicial, inf_incidencia_final, inf_analisis_clima,
                            inf_recomendaciones, inf_propuesta_mitigacion, inf_contenido)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       returning inf_id`,
      [d.parcelaId, d.usuarioId, d.enfermedadId, d.desde, d.hasta, d.totalDiagnosticos,
        d.temperaturaPromedio, d.humedadPromedio, d.luminosidadPromedio, d.incidenciaInicial, d.incidenciaFinal,
        d.analisisClima, d.recomendaciones, d.propuesta, JSON.stringify(d.contenido)],
    );
    return rows[0].inf_id;
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_INFORME}, i.inf_contenido ${FROM_INFORME} where i.inf_id = $1`, [id]);
    if (!rows[0]) return null;
    const informe = this.aEntidad(rows[0]);
    informe.contenido = rows[0].inf_contenido ? JSON.parse(rows[0].inf_contenido) : null;
    return informe;
  }

  async listar({ parcelaId = null, duenoId = null, estado = null }) {
    const { rows } = await this.pool.query(
      `${SELECT_INFORME} ${FROM_INFORME}
       where ($1::int is null or i.inf_par_id = $1)
         and ($2::int is null or f.fin_usu_id = $2)
         and ($3::text is null or i.inf_estado = $3)
       order by i.inf_id desc`,
      [parcelaId, duenoId, estado],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async actualizarContenido(id, contenido, propuestaTexto) {
    await this.pool.query(
      'update informe set inf_contenido = $2, inf_propuesta_mitigacion = $3 where inf_id = $1',
      [id, JSON.stringify(contenido), propuestaTexto],
    );
  }

  async emitir(id, usuarioId) {
    await this.pool.query(
      `update informe set inf_estado = 'emitido', inf_emitido_por = $2, inf_fecha_emision = current_timestamp
       where inf_id = $1`,
      [id, usuarioId],
    );
  }

  aEntidad(fila) {
    const numero = (valor) => (valor === null || valor === undefined ? null : Number(valor));
    return new Informe({
      id: fila.inf_id,
      parcelaId: fila.inf_par_id,
      parcela: fila.par_codigo,
      finca: fila.fin_nombre,
      enfermedadId: fila.inf_enf_id,
      enfermedad: fila.enf_nombre,
      desde: fila.inf_desde,
      hasta: fila.inf_hasta,
      totalDiagnosticos: fila.inf_total_diagnosticos,
      temperaturaPromedio: numero(fila.inf_temp_promedio),
      humedadPromedio: numero(fila.inf_humedad_promedio),
      luminosidadPromedio: numero(fila.inf_luz_promedio),
      incidenciaInicial: numero(fila.inf_incidencia_inicial),
      incidenciaFinal: numero(fila.inf_incidencia_final),
      estado: fila.inf_estado,
      generadoPor: fila.generado_por,
      fechaCrea: fila.inf_fecha_crea,
      emitidoPor: fila.emitido_por,
      fechaEmision: fila.inf_fecha_emision,
    });
  }
}

module.exports = PgInformeRepository;
