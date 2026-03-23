const Reading = require('../../models/reading');

// Topic: devices/{deviceId}/readings
const pattern = /^devices\/([^/]+)\/readings$/;

async function handle(topic, payload) {
    const deviceId = topic.match(pattern)[1];
    const { temperature, humidity } = JSON.parse(payload.toString());

    if (temperature === undefined || humidity === undefined) {
        console.warn(`[MQTT] Payload inválido en ${topic}:`, payload.toString());
        return;
    }

    await Reading.create({ deviceId, temperature, humidity });
    console.log(`[MQTT] Lectura guardada → device: ${deviceId} | ${temperature}°C ${humidity}%`);
}

module.exports = { pattern, handle };
