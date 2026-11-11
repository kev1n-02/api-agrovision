# API AgroVision Apple

API REST en Node.js + Express con Clean Architecture. Base de datos: PostgreSQL (`db_agrovision`).

## 1. Instalar

Requisitos: Node.js 18 o superior y la base `db_agrovision` creada con los scripts 01 y 02.

```bash
cd api-agrovision
npm install
```

## 2. Configurar

Copiar `.env.example` como `.env` y cambiar `DB_PASSWORD` (la contraseña de PostgreSQL que usas en DBeaver) y `JWT_SECRET` (una frase larga que nadie conozca).

## 3. Crear el primer administrador

```bash
npm run crear-admin -- 1700000019 "Kevin Yalama" admin@agrovision.com Admin2026
```

Orden de los datos: cédula, nombres, correo y contraseña. La cédula debe ser válida y la contraseña debe tener mínimo 8 caracteres, con letras y números.

## 4. Levantar la API

```bash
npm run dev
```

Debe mostrar `Conectado a PostgreSQL: db_agrovision` y `API AgroVision corriendo en http://localhost:3000/api/v1`.

## 5. Rutas disponibles

| Método | Ruta | Token | Descripción |
| --- | --- | --- | --- |
| GET | /api/v1/health | No | Comprueba que la API responde |
| POST | /api/v1/auth/login | No | Inicia sesión y devuelve el token |
| POST | /api/v1/auth/registro | No | Registra un usuario PRODUCTOR |
| GET | /api/v1/auth/perfil | Sí | Datos del usuario conectado |
| GET | /api/v1/fincas | Sí | Productor: sus fincas · Admin y Técnico: todas |
| GET | /api/v1/fincas/:id | Sí | Una finca |
| POST | /api/v1/fincas | Sí (Admin, Productor) | Crear finca |
| PUT | /api/v1/fincas/:id | Sí (Admin, dueño) | Editar finca |
| PATCH | /api/v1/fincas/:id/estado | Sí (Admin, dueño) | Activar o desactivar (`{"activo": false}`) |
| GET | /api/v1/fincas/:fincaId/parcelas | Sí | Parcelas de una finca |
| POST | /api/v1/fincas/:fincaId/parcelas | Sí (Admin, dueño) | Crear parcela |
| GET | /api/v1/parcelas/:id | Sí | Una parcela |
| PUT | /api/v1/parcelas/:id | Sí (Admin, dueño) | Editar parcela |
| PATCH | /api/v1/parcelas/:id/estado | Sí (Admin, dueño) | Activar o desactivar |

| GET | /api/v1/parcelas/:parcelaId/sensores | Sí | Sensores de una parcela |
| POST | /api/v1/parcelas/:parcelaId/sensores | Sí (Admin, dueño) | Crear sensor (`manual` o `automatico`) |
| POST | /api/v1/sensores/:id/regenerar-clave | Sí (Admin, dueño) | Nueva clave del ESP32 |
| PATCH | /api/v1/sensores/:id/estado | Sí (Admin, dueño) | Activar o desactivar |
| GET | /api/v1/sensores/:id/mediciones?desde=&hasta= | Sí | Historial (AAAA-MM-DD; por defecto últimos 7 días) |
| POST | /api/v1/sensores/:id/mediciones | Sí (Admin, dueño) | Registro manual |
| POST | /api/v1/ingesta/mediciones | Clave `x-api-key` | Datos enviados por el ESP32 |
| GET | /api/v1/parcelas/:parcelaId/clima?desde=&hasta= | Sí | Resumen del clima y periodos favorables por enfermedad |
| GET | /api/v1/umbrales | Sí | Umbrales ambientales de la literatura |
| PUT | /api/v1/umbrales/:id | Sí (Admin, Técnico) | Ajustar o confirmar un umbral |

| PATCH | /api/v1/auth/contrasena | Sí | Cambiar la contraseña propia (`actual`, `nueva`) |
| GET | /api/v1/roles | Sí (Admin) | Roles para los formularios |
| GET | /api/v1/usuarios?rol= | Sí (Admin) | Listar usuarios |
| GET | /api/v1/usuarios/:id | Sí (Admin) | Un usuario |
| POST | /api/v1/usuarios | Sí (Admin) | Crear usuario con cualquier rol (`rol` en el body) |
| PUT | /api/v1/usuarios/:id | Sí (Admin) | Editar nombres, correo y rol |
| PATCH | /api/v1/usuarios/:id/estado | Sí (Admin) | Activar o desactivar |
| GET | /api/v1/enfermedades | Sí | Catálogo de enfermedades |
| GET | /api/v1/enfermedades/:id | Sí | Enfermedad con sus recomendaciones |
| PUT | /api/v1/enfermedades/:id | Sí (Admin, Técnico) | Editar textos (el código no cambia) |
| GET | /api/v1/enfermedades/:id/recomendaciones | Sí | Recomendaciones |
| POST | /api/v1/enfermedades/:id/recomendaciones | Sí (Admin, Técnico) | Crear recomendación |
| PUT | /api/v1/recomendaciones/:id | Sí (Admin, Técnico) | Editar recomendación |
| PATCH | /api/v1/recomendaciones/:id/estado | Sí (Admin, Técnico) | Activar o desactivar |
| GET | /api/v1/modelos | Sí | Modelos de IA registrados |
| GET | /api/v1/bitacora?desde=&hasta=&usuarioId=&accion=&pagina=&tamano= | Sí (Admin) | Consultar la bitácora (por defecto 30 días, 50 por página) |

| POST | /api/v1/parcelas/:parcelaId/diagnosticos | Sí | Subir foto (form-data, campo `imagen`, JPG/PNG, máx. 10 MB) y diagnosticar |
| GET | /api/v1/parcelas/:parcelaId/diagnosticos?desde=&hasta=&estado= | Sí | Historial de una parcela (por defecto 90 días) |
| GET | /api/v1/diagnosticos?estado=pendiente | Sí | Historial general (productor: sus fincas; técnico y admin: todos) |
| GET | /api/v1/diagnosticos/:id | Sí | Detalle: probabilidades por enfermedad + recomendaciones |
| GET | /api/v1/diagnosticos/:id/imagen | Sí | La foto (verifica que no fue modificada) |
| PATCH | /api/v1/diagnosticos/:id/revision | Sí (Admin, Técnico) | Confirmar o corregir (`estado`, `enfermedadId`, `observaciones`) |

Los diagnósticos requieren ejecutar `06_diagnosticos.sql` y tener levantado el servicio Python del modelo (`ML_URL` en `.env`). Sin el servicio, la API responde 503 "El servicio de diagnóstico no está disponible".

Las rutas de sensores y clima requieren ejecutar antes `05_sensores_umbrales.sql` en la base.

Seguridad: en cada petición con token, la API comprueba en la base que el usuario siga activo y usa su rol actual. Si el administrador lo desactiva, su sesión deja de funcionar de inmediato.

Permisos: el PRODUCTOR solo ve y modifica lo suyo; el TECNICO consulta todo pero no modifica; el ADMINISTRADOR hace todo.

## 6. Estructura (Clean Architecture)

```text
src/
├── server.js                  Punto de entrada
├── app.js                     Express, CORS y registro de rutas
├── config/database.js         Conexión a PostgreSQL (pool)
├── shared/                    Lo que usan todos los módulos
│   ├── errors/AppError.js
│   ├── utils/respuesta.js
│   ├── security/              Bcrypt (contrasena.js) y JWT (token.js)
│   ├── middlewares/           requiereToken, permitirRoles, manejo de errores
│   └── bitacora/              Registro de acciones en la tabla bitacora
└── modules/
    ├── fincas/                (misma estructura: domain, application, infrastructure, interfaces)
    ├── parcelas/              (incluye AccesoParcela: permisos que usan otros módulos)
    ├── sensores/              (sensores, mediciones e ingesta del ESP32)
    ├── clima/                 (umbrales y análisis de condiciones favorables)
    ├── usuarios/              (administración; usa la entidad Usuario de auth)
    ├── catalogos/             (enfermedades, recomendaciones y modelos)
    ├── auditoria/             (consulta de la bitácora)
    ├── diagnosticos/          (foto → modelo de IA → resultado → revisión del técnico)
    └── auth/
        ├── domain/            Entidad Usuario, validación de cédula, contrato del repositorio
        ├── application/       Casos de uso: IniciarSesion, RegistrarUsuario, ObtenerPerfil
        ├── infrastructure/    PgUsuarioRepository (SQL)
        └── interfaces/        Controlador y rutas HTTP
```

Regla: `domain` y `application` no importan Express ni `pg`. Reciben sus dependencias por el constructor, y se arman en `interfaces/auth.routes.js`.
