const net = require('node:net');
const http = require('node:http');
const { Aedes } = require('aedes');
const { WebSocketServer, createWebSocketStream } = require('ws');
const { dispatch } = require('./mqtt-handlers');

async function startBroker() {
    const MQTT_PORT = Number.parseInt(process.env.MQTT_PORT || '1883', 10);
    const WS_PORT   = Number.parseInt(process.env.MQTT_WS_PORT || '8888', 10);

    const MQTT_USERNAME = process.env.MQTT_USERNAME || 'datosiot';
    const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'datosiot@2026';

    const aedes = await Aedes.createBroker();

    aedes.authenticate = (client, username, password, callback) => {
        const expectedUsername = MQTT_USERNAME;
        const expectedPassword = MQTT_PASSWORD;
        
        const passedPassword = password ? password.toString() : null;
        
        if (username === expectedUsername && passedPassword === expectedPassword) {
            callback(null, true);
        } else {
            console.log(`[MQTT] Intento de conexión fallido: ${username}`);
            const error = new Error('Autenticación fallida');
            error.returnCode = 4;
            callback(error, null);
        }
    };

    const mqttServer = net.createServer(aedes.handle);
    const httpServer = http.createServer();
    const wss = new WebSocketServer({ server: httpServer });

    mqttServer.listen(MQTT_PORT, () =>
        console.log(`[MQTT] Broker TCP escuchando en el puerto ${MQTT_PORT}`)
    );

    wss.on('connection', (websocket, req) => {
        const stream = createWebSocketStream(websocket);
        aedes.handle(stream, req);
    });

    httpServer.listen(WS_PORT, () =>
        console.log(`[MQTT] Broker WebSocket escuchando en el puerto ${WS_PORT}`)
    );

    aedes.on('client', (client) =>
        console.log(`[MQTT] Cliente conectado    → ${client ? client.id : 'desconocido'}`)
    );

    aedes.on('clientDisconnect', (client) =>
        console.log(`[MQTT] Cliente desconectado → ${client ? client.id : 'desconocido'}`)
    );

    aedes.on('publish', (packet, client) => {
        if (!client) return;
        const topic = packet.topic;
        const payload = packet.payload?.toString?.() ?? '';
        console.log(`[MQTT] Mensaje en ${topic}: ${payload}`);
        dispatch(topic, packet.payload);

        // Si hay una función registrada para manejar mensajes, la llamamos
        if (typeof aedes._handleMessagesCallback === 'function') {
            aedes._handleMessagesCallback(topic, payload, client.id);
        }
    });

    aedes.on('subscribe', (subscriptions, client) => {
        if (!client) return;
        subscriptions.forEach((s) =>
            console.log(`[MQTT] Suscripción: ${client.id} -> ${s.topic}`)
        );
    });

    function stopBroker() {
        wss.close();
        httpServer.close();
        mqttServer.close(() => aedes.close());
    }

    // Funciones añadidas para publicar, suscribir y manejar mensajes personalizados
    function publish(topic, message) {
        aedes.publish({ topic: topic, payload: Buffer.from(message) });
    }

    function subscribe(topic) {
        aedes.subscribe(topic, function () {
            console.log(`[MQTT] Módulo interno suscrito a: ${topic}`);
        });
    }

    // Guardamos el callback dinámicamente en aedes para usarlo en el evento 'publish'
    function handleMessages(topicToListen, callback) {
        const oldCallback = aedes._handleMessagesCallback;
        
        aedes._handleMessagesCallback = (topic, payload, clientId) => {
            // Ejecutamos callbacks previos si había (por si hay múltiples)
            if (oldCallback) oldCallback(topic, payload, clientId);
            
            // Si coincide el topic, disparamos
            if (topic === topicToListen) {
                callback(payload, clientId);
            }
        };
    }

    // Devuelve todos los métodos para que estén accesibles desde 'server.js'
    return { stopBroker, ports: { mqtt: MQTT_PORT, ws: WS_PORT }, publish, subscribe, handleMessages };
}

// Mantenemos una instancia global única
let brokerInstance = null;

module.exports = {
  startBroker: async () => {
      brokerInstance = await startBroker();
      return brokerInstance;
  },
  // Exportamos versiones "proxy" que llamarán a las funciones reales del broker configurado
  publish: (topic, message) => {
      if (brokerInstance) brokerInstance.publish(topic, message);
  },
  subscribe: (topic) => {
      if (brokerInstance) brokerInstance.subscribe(topic);
  },
  handleMessages: (topic, callback) => {
      if (brokerInstance) {
          brokerInstance.handleMessages(topic, callback);
      } else {
          console.error("Error: El broker no ha sido inicializado. Llama a startBroker() primero.");
      }
  }
};
