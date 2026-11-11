// =====================================================================
// CAPA INFRASTRUCTURE · Repositorio de fincas con PostgreSQL
// =====================================================================
const FincaRepository = require('../domain/FincaRepository');
const Finca = require('../domain/Finca');

// Se trae también el nombre del dueño (join con usuario).
const SELECT_FINCA = `
  select f.fin_id, f.fin_usu_id, u.usu_nombres as propietario, f.fin_nombre,
         f.fin_provincia, f.fin_canton, f.fin_direccion, f.fin_altitud,
         f.fin_activo, f.fin_fecha_crea
  from finca f
  join usuario u on u.usu_id = f.fin_usu_id`;

class PgFincaRepository extends FincaRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listar({ usuarioId = null } = {}) {
    // ($1::int is null or ...) = si no se envía usuarioId, trae todas.
    const { rows } = await this.pool.query(
      `${SELECT_FINCA} where ($1::int is null or f.fin_usu_id = $1) order by f.fin_nombre`,
      [usuarioId],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_FINCA} where f.fin_id = $1`, [id]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async rolDeUsuario(usuarioId) {
    const { rows } = await this.pool.query(
      `select r.rol_nombre from usuario u join usu_rol r on r.rol_id = u.usu_rol_id
       where u.usu_id = $1 and u.usu_activo = true`,
      [usuarioId],
    );
    return rows[0] ? rows[0].rol_nombre : null;
  }

  async crear({ usuarioId, nombre, provincia, canton, direccion, altitud, usuarioCreaId }) {
    const { rows } = await this.pool.query(
      `insert into finca (fin_usu_id, fin_nombre, fin_provincia, fin_canton, fin_direccion, fin_altitud, fin_usuario_crea)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning fin_id`,
      [usuarioId, nombre, provincia, canton, direccion, altitud, usuarioCreaId],
    );
    return this.buscarPorId(rows[0].fin_id);
  }

  async actualizar(id, { nombre, provincia, canton, direccion, altitud }, usuarioActId) {
    await this.pool.query(
      `update finca
       set fin_nombre = $2, fin_provincia = $3, fin_canton = $4, fin_direccion = $5, fin_altitud = $6,
           fin_usuario_act = $7, fin_fecha_act = current_timestamp
       where fin_id = $1`,
      [id, nombre, provincia, canton, direccion, altitud, usuarioActId],
    );
    return this.buscarPorId(id);
  }

  async cambiarEstado(id, activo, usuarioActId) {
    await this.pool.query(
      `update finca set fin_activo = $2, fin_usuario_act = $3, fin_fecha_act = current_timestamp
       where fin_id = $1`,
      [id, activo, usuarioActId],
    );
    return this.buscarPorId(id);
  }

  /** Convierte una fila (fin_...) en una entidad Finca. */
  aEntidad(fila) {
    return new Finca({
      id: fila.fin_id,
      usuarioId: fila.fin_usu_id,
      propietario: fila.propietario,
      nombre: fila.fin_nombre,
      provincia: fila.fin_provincia,
      canton: fila.fin_canton,
      direccion: fila.fin_direccion,
      altitud: fila.fin_altitud,
      activo: fila.fin_activo,
      fechaCrea: fila.fin_fecha_crea,
    });
  }
}

module.exports = PgFincaRepository;
