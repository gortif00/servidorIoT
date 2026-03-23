# Servidor API IoT

Servidor para gestionar dispositivos IoT (sensores y actuadores) con **API REST** y **broker MQTT** integrado.

Se conecta a **MongoDB Atlas** en la nube para almacenar usuarios, dispositivos y lecturas.

---

## ¿Qué hace este servidor?

Al arrancar, se levantan **3 servicios** a la vez:

```
┌─────────────────────────────────────────────────────────────┐
│                     node server.js                          │
│                                                             │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  API REST      │  │ Broker MQTT  │  │ MQTT WebSocket   │ │
│  │  puerto 3000   │  │ puerto 1883  │  │ puerto 8888      │ │
│  │                │  │              │  │ (no lo usaremos  │ │
│  │ Postman / App  │  │ Dispositivos │  │  por ahora)      │ │
│  │ web consultan  │  │ IoT envían   │  │                  │ │
│  │ datos aquí     │  │ datos aquí   │  │ Permite conectar │ │
│  │                │  │              │  │ MQTT desde un    │ │
│  │                │  │              │  │ navegador web    │ │
│  └───────┬───────┘  └──────┬───────┘  └──────────────────┘ │
│          │                 │                                │
│          └────────┬────────┘                                │
│                   ▼                                         │
│           ┌──────────────┐                                  │
│           │ MongoDB Atlas│                                  │
│           │  (la nube)   │                                  │
│           └──────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

- **API REST (puerto 3000):** Para que una app o Postman consulte datos, cree dispositivos, haga login, etc.
- **Broker MQTT (puerto 1883):** Para que los dispositivos IoT (Arduino, ESP32...) envíen lecturas de sensores.
- **MQTT WebSocket (puerto 8888):** Igual que MQTT pero sobre WebSocket. Útil para clientes web. **No lo usaremos por ahora**, pero está disponible.

---

## ¿Cómo funciona la seguridad?

### Contraseñas con hash

Las contraseñas **nunca se guardan en texto plano** en la base de datos. Cuando un usuario se registra, la contraseña se transforma con un algoritmo llamado **bcrypt** que genera un "hash" (una cadena irreversible):

```
Contraseña del usuario:   user123
Lo que se guarda en la BD: $2a$10$X7YkzR3q... (hash irreversible)
```

Ni siquiera mirando la base de datos se puede saber la contraseña original. Al hacer login, bcrypt compara el hash guardado con la contraseña que envías y verifica si coincide.

### Tokens JWT (JSON Web Token)

Algunas rutas están protegidas (crear dispositivos, borrar lecturas...). Para usarlas necesitas un **token**, que es como un "pase temporal":

```
1. Te registras         →  POST /auth/register
2. Haces login          →  POST /auth/login    →  Recibes un TOKEN
3. Usas el token        →  Lo envías en cada petición protegida
```

El token dura **30 días**. Es una cadena larga tipo:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YWRi...
```

Dentro del token va codificado (no cifrado) el ID del usuario. El servidor lo verifica con la clave secreta (`JWT_SECRET` del `.env`). Si alguien modifica el token, la verificación falla.

### ¿Cómo se usa el token en Postman?

En cada petición protegida:

1. Ve a la pestaña **Authorization**
2. En el desplegable, selecciona **Bearer Token**
3. Pega el token que obtuviste en el login

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

> Sin token → respuesta: `401 - Acceso denegado. No hay token.`
> Token inválido → respuesta: `401 - Token inválido`

---

## Tecnologías

| Qué hace | Tecnología |
|---|---|
| API REST | Express |
| Base de datos | MongoDB Atlas (Mongoose) |
| Autenticación | JWT (jsonwebtoken + bcryptjs) |
| Broker MQTT | Aedes |
| WebSocket MQTT | ws |

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd Servdior_api_IOT

# 2. Instalar dependencias
npm install

# 3. Crear el archivo .env en la raíz con tus datos
```

### Archivo `.env`

Crea un archivo `.env` en la raíz del proyecto con esta estructura:

```env
MONGODB_USER=tu_usuario_de_mongo_atlas
MONGODB_PASSWORD=tu_contraseña
MONGODB_HOST=tu_cluster.mongodb.net
MONGODB_DB=nombre_de_tu_base_de_datos

JWT_SECRET=tu_clave_secreta

MAX_READINGS_PER_DEVICE=60
```

> `MAX_READINGS_PER_DEVICE` controla cuántas lecturas se guardan por dispositivo. Cuando se supera ese número, las más antiguas se borran automáticamente.

---

## Datos de prueba (Seed)

Para empezar rápido, puedes cargar datos de ejemplo:

```bash
npm run seed
```

Esto crea automáticamente:

| Dato | Valor |
|---|---|
| **Usuario** | `nombreuser` |
| **Email** | `user@user.com` |
| **Contraseña** | `user123` |
| **Dispositivo 1** | Sensor Temperatura/Humedad (Sala principal) |
| **Dispositivo 2** | Luz de Aviso - actuador (Entrada) |
| **Lecturas** | 30 lecturas del sensor con temperatura y humedad |

---

## Arrancar el servidor

```bash
npm start
```

Al arrancar verás algo como:

```
[MQTT] Broker TCP escuchando en el puerto 1883
[MQTT] Broker WebSocket escuchando en el puerto 8888
Servidor corriendo en el puerto 3000
Conexión a MongoDB establecida
```

Se levantan **tres servicios a la vez** (explicados en la sección anterior):
- **API REST** en el puerto `3000`
- **Broker MQTT** en el puerto `1883` (TCP)
- **MQTT WebSocket** en el puerto `8888` (no lo usaremos por ahora)

---

## API REST (Postman)

La URL base es: `http://localhost:3000`

### Autenticación

Las rutas marcadas con 🔒 requieren un **token JWT** (ver sección "¿Cómo funciona la seguridad?" más arriba). Para obtenerlo:

**1. Registrar un usuario** (o usar el del seed)

```
POST /auth/register
```
```json
{
    "name": "nombreuser",
    "email": "user@user.com",
    "password": "user123"
}
```

**2. Hacer login para obtener el token**

```
POST /auth/login
```
```json
{
    "email": "user@user.com",
    "password": "user123"
}
```

Respuesta:
```json
{
    "message": "Login exitoso",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "30 días"
}
```

**3.** Copia el token y úsalo en la pestaña **Authorization → Bearer Token** de Postman (como se explicó arriba).

---

### Dispositivos (Devices)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/devices` | ❌ | Listar todos los dispositivos |
| `GET` | `/devices/:id` | ❌ | Obtener un dispositivo por ID |
| `POST` | `/devices` | 🔒 | Crear un dispositivo |
| `PUT` | `/devices/:id` | 🔒 | Actualizar un dispositivo |
| `DELETE` | `/devices/:id` | 🔒 | Eliminar un dispositivo |

#### Ejemplo: Crear un dispositivo

```
POST /devices   🔒 (necesita token)
```
```json
{
    "name": "Sensor Temperatura/Humedad",
    "type": "sensor",
    "location": "Sala principal"
}
```

> El campo `userId` se asigna automáticamente desde el token. No hace falta enviarlo.

---

### Lecturas (Readings)

Cada lectura tiene `temperature` y `humidity`:

```json
{
    "temperature": 24.3,
    "humidity": 65.2,
    "timestamp": "2026-03-08T09:00:00.000Z"
}
```

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/readings/device/:deviceId` | ❌ | Lecturas de un dispositivo |
| `GET` | `/readings/device/:deviceId/range?start=01-03-2026&end=08-03-2026` | ❌ | Lecturas por rango de fechas |
| `POST` | `/readings` | 🔒 | Crear una lectura manualmente |
| `DELETE` | `/readings/device/:deviceId` | 🔒 | Eliminar lecturas de un dispositivo |

#### Ejemplo: Crear una lectura

```
POST /readings   🔒 (necesita token)
```
```json
{
    "deviceId": "id_del_dispositivo",
    "temperature": 25.4,
    "humidity": 60.1
}
```

#### Ejemplo: Lecturas por rango de fechas

```
GET /readings/device/ID_DEL_DEVICE/range?start=01-03-2026&end=08-03-2026
```

> Las fechas van en formato `DD-MM-YYYY`.

---

### Límite de lecturas

Solo se guardan las **últimas 60 lecturas** por dispositivo (configurable en `.env`). Cuando llega una lectura nueva y ya hay 60, se borra automáticamente la más antigua. Esto evita que la base de datos crezca sin control.

---

## Broker MQTT (Postman)

El servidor incluye un **broker MQTT** integrado. Puedes conectarte desde Postman u otro cliente MQTT.

### Conectar desde Postman

1. En Postman, crea una nueva petición de tipo **MQTT**
2. Configura la conexión:

| Campo | Valor |
|---|---|
| **Host** | `localhost` |
| **Puerto** | `1883` |

3. Haz clic en **Connect**

### Publicar un mensaje (Publish)

Para enviar una lectura a un dispositivo:

| Campo | Valor |
|---|---|
| **Topic** | `devices/{deviceId}/readings` |
| **Payload** | `{"temperature": 24.5, "humidity": 62.3}` |

Sustituye `{deviceId}` por el ID real del dispositivo (lo obtienes con `GET /devices`).

### Suscribirse (Subscribe)

Para escuchar las lecturas de un dispositivo:

| Campo | Valor |
|---|---|
| **Topic** | `devices/{deviceId}/readings` |

O para escuchar **todos** los dispositivos:

| Campo | Valor |
|---|---|
| **Topic** | `devices/+/readings` |

> El `+` es un comodín que representa cualquier deviceId.

---

## Estructura del proyecto

```
├── server.js                 ← Punto de entrada
├── config/
│   └── db.js                 ← Conexión a MongoDB Atlas
├── models/
│   ├── user.js               ← Modelo de usuario
│   ├── device.js             ← Modelo de dispositivo
│   └── reading.js            ← Modelo de lectura (con auto-limpieza)
├── controllers/
│   ├── auth.controller.js    ← Login y registro
│   ├── device.controller.js  ← CRUD de dispositivos
│   └── readings.controller.js← CRUD de lecturas
├── routes/
│   ├── auth.routes.js        ← Rutas de autenticación
│   ├── devices.routes.js     ← Rutas de dispositivos
│   └── readings.routes.js    ← Rutas de lecturas
├── middlewares/
│   └── auth.Middleware.js     ← Verificación de token JWT
├── services/
│   ├── broker.js             ← Broker MQTT (Aedes)
│   └── mqtt-handlers/        ← Handlers modulares de MQTT
│       ├── index.js           ← Dispatcher de topics
│       └── readings.handler.js← Persiste lecturas desde MQTT
├── scripts/
│   └── seed.js               ← Carga datos de prueba
└── test-mqtt/
    └── publish-readings.js   ← Test de publicación MQTT
```

---

## Resumen rápido

```bash
npm install          # Instalar dependencias
npm run seed         # Cargar datos de prueba
npm start            # Arrancar servidor (API + MQTT)
```
