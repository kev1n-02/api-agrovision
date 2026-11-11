// =====================================================================
// CAPA INTERFACES · Controlador HTTP de administración de usuarios
// =====================================================================
const { exito } = require('../../../shared/utils/respuesta');
const { leerId } = require('../../../shared/utils/leerId');

class UsuarioController {
  /** @param {import('../application/UsuarioCasosDeUso')} casosDeUso */
  constructor(casosDeUso) {
    this.casosDeUso = casosDeUso;
  }

  /** GET /api/v1/usuarios?rol=PRODUCTOR */
  listar = async (req, res, next) => {
    try {
      return exito(res, 'Listado de usuarios.', await this.casosDeUso.listar(req.query.rol));
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/roles */
  listarRoles = async (req, res, next) => {
    try {
      return exito(res, 'Roles del sistema.', await this.casosDeUso.listarRoles());
    } catch (error) {
      return next(error);
    }
  };

  /** GET /api/v1/usuarios/:id */
  obtener = async (req, res, next) => {
    try {
      return exito(res, 'Datos del usuario.', await this.casosDeUso.obtener(leerId(req.params.id, 'id del usuario')));
    } catch (error) {
      return next(error);
    }
  };

  /** POST /api/v1/usuarios · body incluye "rol" */
  crear = async (req, res, next) => {
    try {
      const usuario = await this.casosDeUso.crear(req.body || {}, req.usuario);
      return exito(res, 'Usuario creado correctamente.', usuario, 201);
    } catch (error) {
      return next(error);
    }
  };

  /** PUT /api/v1/usuarios/:id */
  actualizar = async (req, res, next) => {
    try {
      const usuario = await this.casosDeUso.actualizar(leerId(req.params.id, 'id del usuario'), req.body || {}, req.usuario);
      return exito(res, 'Usuario actualizado correctamente.', usuario);
    } catch (error) {
      return next(error);
    }
  };

  /** PATCH /api/v1/usuarios/:id/estado · body: { "activo": false } */
  cambiarEstado = async (req, res, next) => {
    try {
      const { activo } = req.body || {};
      const usuario = await this.casosDeUso.cambiarEstado(leerId(req.params.id, 'id del usuario'), activo, req.usuario);
      return exito(res, activo ? 'Usuario activado.' : 'Usuario desactivado.', usuario);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = UsuarioController;
