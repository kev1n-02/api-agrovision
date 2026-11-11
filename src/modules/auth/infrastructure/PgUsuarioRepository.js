// =====================================================================
// CAPA INFRASTRUCTURE · Repositorio de usuarios con PostgreSQL
// Implementa el contrato del dominio (UsuarioRepository) usando SQL.
// Todas las consultas usan parámetros ($1, $2...) y nunca concatenan
// texto: así se evita la inyección SQL.
// =====================================================================
const UsuarioRepository = require('../domain/UsuarioRepository');
const Usuario = require('../domain/Usuario');

// Columnas que se leen siempre, con el nombre del rol (join con usu_rol).
const SELECT_USUARIO = `
  select u.usu_id, u.usu_cedula, u.usu_nombres, u.usu_correo,
         u.usu_contrasena, u.usu_activo, u.usu_fecha_crea, r.rol_nombre
  from usuario u
  join usu_rol r on r.rol_id = u.usu_rol_id`;

class PgUsuarioRepository extends UsuarioRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async buscarPorCorreo(correo) {
    const { rows } = await this.pool.query(`${SELECT_USUARIO} where u.usu_correo = $1`, [correo]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_USUARIO} where u.usu_id = $1`, [id]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async existeCorreo(correo, excluirId = null) {
    const { rows } = await this.pool.query(
      'select 1 from usuario where usu_correo = $1 and ($2::int is null or usu_id <> $2)',
      [correo, excluirId],
    );
    return rows.length > 0;
  }

  async existeCedula(cedula) {
    const { rows } = await this.pool.query('select 1 from usuario where usu_cedula = $1', [cedula]);
    return rows.length > 0;
  }

  async buscarRolId(nombreRol) {
    const { rows } = await this.pool.query('select rol_id from usu_rol where rol_nombre = $1', [nombreRol]);
    return rows[0] ? rows[0].rol_id : null;
  }

  async crear({ cedula, nombres, correo, contrasenaHash, rolId, usuarioCreaId }) {
    const { rows } = await this.pool.query(
      `insert into usuario (usu_rol_id, usu_cedula, usu_nombres, usu_correo, usu_contrasena, usu_usuario_crea)
       values ($1, $2, $3, $4, $5, $6)
       returning usu_id`,
      [rolId, cedula, nombres, correo, contrasenaHash, usuarioCreaId],
    );
    return this.buscarPorId(rows[0].usu_id);
  }

  // ---------- Administración ----------

  async listar({ rol = null } = {}) {
    const { rows } = await this.pool.query(
      `${SELECT_USUARIO} where ($1::text is null or r.rol_nombre = $1) order by u.usu_nombres`,
      [rol],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async listarRoles() {
    const { rows } = await this.pool.query('select rol_id, rol_nombre, rol_descripcion from usu_rol order by rol_id');
    return rows.map((fila) => ({ id: fila.rol_id, nombre: fila.rol_nombre, descripcion: fila.rol_descripcion }));
  }

  async actualizar(id, { nombres, correo, rolId }, usuarioActId) {
    await this.pool.query(
      `update usuario
       set usu_nombres = $2, usu_correo = $3, usu_rol_id = $4,
           usu_usuario_act = $5, usu_fecha_act = current_timestamp
       where usu_id = $1`,
      [id, nombres, correo, rolId, usuarioActId],
    );
    return this.buscarPorId(id);
  }

  async cambiarEstado(id, activo, usuarioActId) {
    await this.pool.query(
      `update usuario set usu_activo = $2, usu_usuario_act = $3, usu_fecha_act = current_timestamp
       where usu_id = $1`,
      [id, activo, usuarioActId],
    );
    return this.buscarPorId(id);
  }

  async cambiarContrasena(id, contrasenaHash) {
    await this.pool.query(
      `update usuario set usu_contrasena = $2, usu_usuario_act = $1, usu_fecha_act = current_timestamp
       where usu_id = $1`,
      [id, contrasenaHash],
    );
  }

  /** Convierte una fila de la base (usu_...) en una entidad Usuario. */
  aEntidad(fila) {
    return new Usuario({
      id: fila.usu_id,
      cedula: fila.usu_cedula,
      nombres: fila.usu_nombres,
      correo: fila.usu_correo,
      rol: fila.rol_nombre,
      activo: fila.usu_activo,
      contrasenaHash: fila.usu_contrasena,
      fechaCrea: fila.usu_fecha_crea,
    });
  }
}

module.exports = PgUsuarioRepository;
