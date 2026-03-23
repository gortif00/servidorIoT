const readingsHandler = require('./readings.handler');

// Registrar aquí los handlers de MQTT
const handlers = [
    readingsHandler,
    // statusHandler,
    // alertsHandler,
];

async function dispatch(topic, payload) {
    for (const handler of handlers) {
        if (handler.pattern.test(topic)) {
            try {
                await handler.handle(topic, payload);
            } catch (err) {
                console.error(`[MQTT] Error en handler para "${topic}":`, err.message);
            }
            return;
        }
    }
}

module.exports = { dispatch };
