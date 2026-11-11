// =====================================================================
// Middlewares de seguridad.
//   requiereToken      → la ruta solo funciona con un token válido
//                        y un usuario que siga activo.
//   permitirRoles(...) → además, solo para ciertos roles.
//
// Uso en una ruta:
//   router.get('/usuarios', requiereToken, permitirRoles('ADMINISTRADOR'), controller.listar);
// =====================================================================
const AppError = require('../errors/AppError');
const { verificarToken } = require('../security/token');
const { pool } = require('../../config/database');

/**
 * 1. Lee el token del encabezado "Authorization: Bearer <token>".
 * 2. Verifica la firma y la expiración.
 * 3. Consulta la base: si el usuario fue desactivado o le cambiaron el
 *    rol, se aplica de inmediato (no hay que esperar a que el token expire).
 * Deja { id, rol } en req.usuario para usarlo después.
 */
async function requiereToken(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const [tipo, token] = encabezado.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return next(new AppError('Debe iniciar sesión para acceder.', 401));
  }

  let datos;
  try {
    datos = verificarToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Su sesión expiró. Inicie sesión nuevamente.', 401));
    }
    return next(new AppError('Token inválido.', 401));
  }

  try {
    const { rows } = await pool.query(
      `select u.usu_activo, r.rol_nombre from usuario u
       join usu_rol r on r.rol_id = u.usu_rol_id where u.usu_id = $1`,
      [datos.id],
    );
    if (!rows[0] || !rows[0].usu_activo) {
      return next(new AppError('Su usuario está inactivo. Comuníquese con el administrador.', 401));
    }
    req.usuario = { id: datos.id, rol: rows[0].rol_nombre };
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Permite el acceso solo a los roles indicados.
 * Debe ir después de requiereToken.
 * @param {...string} roles  Ej.: 'ADMINISTRADOR', 'TECNICO'
 */
function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(new AppError('No tiene permiso para realizar esta acción.', 403));
    }
    return next();
  };
}

module.exports = { requiereToken, permitirRoles };
