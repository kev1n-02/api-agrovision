// =====================================================================
// Punto de entrada de la API.
// 1. Carga las variables del archivo .env
// 2. Comprueba que PostgreSQL responde
// 3. Levanta el servidor en el puerto configurado
// =====================================================================

// Debe ir primero: el resto de archivos leen process.env al cargarse.
require('dotenv').config();

const app = require('./app');
const { probarConexion } = require('./config/database');

const PUERTO = process.env.PORT || 3000;

async function iniciar() {
  // Si la base de datos no responde, no tiene sentido levantar la API.
  await probarConexion();

  app.listen(PUERTO, () => {
    console.log(`API AgroVision corriendo en http://localhost:${PUERTO}/api/v1`);
  });
}

iniciar().catch((error) => {
  console.error('No se pudo iniciar la API:', error.message);
  process.exit(1);
});
