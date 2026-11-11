// =====================================================================
// Configuración de Express: middlewares globales y rutas de cada módulo.
// Cada módulo nuevo (fincas, parcelas, diagnósticos...) se registra aquí.
// =====================================================================
const express = require('express');
const cors = require('cors');

const authRoutes = require('./modules/auth/interfaces/auth.routes');
const fincaRoutes = require('./modules/fincas/interfaces/finca.routes');
const parcelaRoutes = require('./modules/parcelas/interfaces/parcela.routes');
const sensorRoutes = require('./modules/sensores/interfaces/sensor.routes');
const climaRoutes = require('./modules/clima/interfaces/clima.routes');
const usuarioRoutes = require('./modules/usuarios/interfaces/usuario.routes');
const catalogoRoutes = require('./modules/catalogos/interfaces/catalogo.routes');
const auditoriaRoutes = require('./modules/auditoria/interfaces/auditoria.routes');
const diagnosticoRoutes = require('./modules/diagnosticos/interfaces/diagnostico.routes');
const tratamientoRoutes = require('./modules/tratamientos/interfaces/tratamiento.routes');
const informeRoutes = require('./modules/informes/interfaces/informe.routes');
const panelRoutes = require('./modules/panel/interfaces/panel.routes');
const { rutaNoEncontrada, manejarErrores } = require('./shared/middlewares/errores.middleware');

const app = express();

// Solo los frontends listados en .env pueden llamar a la API desde el navegador.
const origenesPermitidos = (process.env.CORS_ORIGENES || '').split(',').map((o) => o.trim());
app.use(cors({ origin: origenesPermitidos }));

// Convierte el cuerpo JSON de las peticiones en un objeto (req.body).
app.use(express.json({ limit: '1mb' }));

// Ruta para comprobar que la API está viva.
app.get('/api/v1/health', (req, res) => {
  res.json({ ok: true, mensaje: 'API AgroVision funcionando', data: null });
});

// ---------- Rutas de los módulos ----------
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/fincas', fincaRoutes);
app.use('/api/v1', parcelaRoutes); // /fincas/:fincaId/parcelas y /parcelas/:id
app.use('/api/v1', sensorRoutes);  // sensores, mediciones e ingesta del ESP32
app.use('/api/v1', climaRoutes);   // análisis de clima y umbrales
app.use('/api/v1', usuarioRoutes); // administración de usuarios y roles
app.use('/api/v1', catalogoRoutes); // enfermedades, recomendaciones y modelos
app.use('/api/v1', auditoriaRoutes); // consulta de la bitácora
app.use('/api/v1', diagnosticoRoutes); // diagnósticos con IA
app.use('/api/v1', tratamientoRoutes); // tratamientos y seguimientos
app.use('/api/v1', informeRoutes);     // informes fitosanitarios y PDF
app.use('/api/v1', panelRoutes);       // panel de inicio (tarjetas y alertas)

// Siempre al final: ruta inexistente y manejo central de errores.
app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
