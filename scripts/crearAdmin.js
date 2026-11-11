// =====================================================================
// Crea el primer usuario ADMINISTRADOR.
// Usa el mismo caso de uso que la API, así la contraseña pasa por
// Bcrypt igual que en un registro normal.
//
// Uso (en la terminal, dentro de la carpeta api-agrovision):
//   npm run crear-admin -- 1700000019 "Kevin Yalama" admin@agrovision.com Admin2026
// =====================================================================
require('dotenv').config();

const { pool } = require('../src/config/database');
const contrasena = require('../src/shared/security/contrasena');
const BitacoraRepository = require('../src/shared/bitacora/BitacoraRepository');
const PgUsuarioRepository = require('../src/modules/auth/infrastructure/PgUsuarioRepository');
const RegistrarUsuario = require('../src/modules/auth/application/RegistrarUsuario');

async function main() {
  const [cedula, nombres, correo, clave] = process.argv.slice(2);

  if (!clave) {
    console.log('Uso: npm run crear-admin -- <cedula> "<nombres>" <correo> <contraseña>');
    process.exitCode = 1;
    return;
  }

  const registrar = new RegistrarUsuario(
    new PgUsuarioRepository(pool),
    contrasena,
    new BitacoraRepository(pool),
  );

  const usuario = await registrar.ejecutar({ cedula, nombres, correo, contrasena: clave }, 'ADMINISTRADOR');
  console.log('Administrador creado:', usuario.datosPublicos());
}

main()
  .catch((error) => {
    console.error('No se pudo crear el administrador:', error.message);
    if (error.errores && error.errores.length) console.table(error.errores);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
