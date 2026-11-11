// =====================================================================
// CAPA INFRASTRUCTURE · Repositorio de parcelas con PostgreSQL
// =====================================================================
const ParcelaRepository = require('../domain/ParcelaRepository');
const Parcela = require('../domain/Parcela');

// to_char devuelve la fecha como texto 'AAAA-MM-DD', sin hora ni zona horaria.
const SELECT_PARCELA = `
  select p.par_id, p.par_fin_id, f.fin_nombre, p.par_codigo, p.par_variedad,
         p.par_superficie, p.par_numero_arboles,
         to_char(p.par_fecha_plantacion, 'YYYY-MM-DD') as par_fecha_plantacion,
         p.par_activo, p.par_fecha_crea
  from parcela p
  join finca f on f.fin_id = p.par_fin_id`;

class PgParcelaRepository extends ParcelaRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listarPorFinca(fincaId) {
    const { rows } = await this.pool.query(`${SELECT_PARCELA} where p.par_fin_id = $1 order by p.par_codigo`, [fincaId]);
    return rows.map((fila) => this.aEntidad(fila));
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_PARCELA} where p.par_id = $1`, [id]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async existeCodigo(fincaId, codigo, excluirId = null) {
    const { rows } = await this.pool.query(
      `select 1 from parcela
       where par_fin_id = $1 and par_codigo = $2 and ($3::int is null or par_id <> $3)`,
      [fincaId, codigo, excluirId],
    );
    return rows.length > 0;
  }

  async crear(fincaId, { codigo, variedad, superficie, numeroArboles, fechaPlantacion }, usuarioCreaId) {
    const { rows } = await this.pool.query(
      `insert into parcela (par_fin_id, par_codigo, par_variedad, par_superficie, par_numero_arboles,
                            par_fecha_plantacion, par_usuario_crea)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning par_id`,
      [fincaId, codigo, variedad, superficie, numeroArboles, fechaPlantacion, usuarioCreaId],
    );
    return this.buscarPorId(rows[0].par_id);
  }

  async actualizar(id, { codigo, variedad, superficie, numeroArboles, fechaPlantacion }, usuarioActId) {
    await this.pool.query(
      `update parcela
       set par_codigo = $2, par_variedad = $3, par_superficie = $4, par_numero_arboles = $5,
           par_fecha_plantacion = $6, par_usuario_act = $7, par_fecha_act = current_timestamp
       where par_id = $1`,
      [id, codigo, variedad, superficie, numeroArboles, fechaPlantacion, usuarioActId],
    );
    return this.buscarPorId(id);
  }

  async cambiarEstado(id, activo, usuarioActId) {
    await this.pool.query(
      `update parcela set par_activo = $2, par_usuario_act = $3, par_fecha_act = current_timestamp
       where par_id = $1`,
      [id, activo, usuarioActId],
    );
    return this.buscarPorId(id);
  }

  /** Convierte una fila (par_...) en una entidad Parcela. */
  aEntidad(fila) {
    return new Parcela({
      id: fila.par_id,
      fincaId: fila.par_fin_id,
      finca: fila.fin_nombre,
      codigo: fila.par_codigo,
      variedad: fila.par_variedad,
      // PostgreSQL devuelve los numeric como texto ('1500.00'); se pasan a número.
      superficie: Number(fila.par_superficie),
      numeroArboles: fila.par_numero_arboles,
      fechaPlantacion: fila.par_fecha_plantacion,
      activo: fila.par_activo,
      fechaCrea: fila.par_fecha_crea,
    });
  }
}

module.exports = PgParcelaRepository;
