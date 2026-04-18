require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const broker = require('./services/broker');
const { startDevicePresenceMonitor } = require('./services/device-presence');
const authRoutes = require('./routes/auth.routes');
const deviceRoutes = require('./routes/devices.routes');
const readingRoutes = require('./routes/readings.routes');
const chatWithCohere = require('./services/cohereIA');
const fs = require('fs');
const path = require('path');

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

function mountApiRoutes(prefix = '') {
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/devices`, deviceRoutes);
    app.use(`${prefix}/readings`, readingRoutes);
    app.get(`${prefix}/test`, (req, res) => res.json({ msg: 'El API REST funciona!' }));
}

// Compatibilidad: rutas actuales y rutas bajo /api
mountApiRoutes('');
mountApiRoutes('/api');

// Conectar a la base de datos
connectDB();

async function bootstrap() {
    await broker.startBroker();

    const mqttTopics = [
        'devices/+/register',
        'devices/+/reading',
        'devices/+/readings',
        'devices/+/temperatura',
        'devices/+/humedad',
    ];

    mqttTopics.forEach((topic) => broker.subscribe(topic));
    startDevicePresenceMonitor();

    // Lógica de suscripción para el juego de IA
    broker.handleMessages('cohere/IAGame', async function (msg, clientId) {
        console.log(`Mensaje recibido de ${clientId} en cohere/IAGame: ${msg}`);
        let cohereMessage;
        // Añadimos una variable para indicar si queremos resetear este hilo de conversación
        let esReinicio = false;

        if (msg === '1' || msg === '2') {
            cohereMessage = "se elige la opción " + msg + " con la contestacion muy breve de persona y encerrada condando sobre ella y dame dos opciones muy breves";
        } else if (msg === '3') {
            console.log('reinicia el juego');
            cohereMessage = fs.readFileSync(path.join(__dirname, './services/gameOrigin.txt'), 'utf8');
            esReinicio = true; // Marcamos a true para que la IA olvide lo anterior
        }

        if (cohereMessage) {
            // Ahora pasamos el clientId para mantener la sesión y el booleano esReinicio
            const response = await chatWithCohere(cohereMessage, clientId, esReinicio);

            // Formateamos quitando tildes y partiendo lineas
            const textoFormateado = formatearTexto(response, 45);

            console.log(`Respuesta de Cohere a cohere/IAGameResponse: \n${textoFormateado}`);
            broker.publish('cohere/IAGameResponse', textoFormateado);
        }
    });

    app.listen(port, () => console.log(`Servidor corriendo en el puerto ${port}`));
}

bootstrap().catch((error) => {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
});

// Función para formatear el texto
function formatearTexto(texto, maxLineLength) {
    let lineas = texto.split('\n');
    let textoFormateado = '';

    lineas.forEach((linea) => {
        let palabras = linea.split(' ');
        let lineaActual = '';

        palabras.forEach((palabra) => {
            if ((lineaActual + palabra).length > maxLineLength) {
                textoFormateado += lineaActual.trim() + '\n';
                lineaActual = palabra + ' ';
            } else {
                lineaActual += palabra + ' ';
            }
        });

        if (lineaActual) {
            textoFormateado += lineaActual.trim() + '\n';
        }
    });

    return textoFormateado.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
