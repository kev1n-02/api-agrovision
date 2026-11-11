// =====================================================================
// Conexión a PostgreSQL.
// Se usa un "pool": un grupo de conexiones abiertas que se reutilizan,
// en vez de abrir y cerrar una conexión en cada petición.
// =====================================================================
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/** Ejecuta una consulta simple para confirmar que la base de datos responde. */
async function probarConexion() {
  await pool.query('select 1');
  console.log(`Conectado a PostgreSQL: ${process.env.DB_NAME}`);
}

module.exports = { pool, probarConexion };
