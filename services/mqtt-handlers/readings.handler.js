const Device = require('../../models/device');
const Reading = require('../../models/reading');

// Topics soportados:
// - devices/{deviceId}/register
// - devices/{deviceId}/reading
// - devices/{deviceId}/readings (compatibilidad)
// - devices/{deviceId}/temperatura (legacy)
// - devices/{deviceId}/humedad (legacy)
const pattern = /^devices\/([^/]+)\/(register|reading|readings|temperatura|humedad)$/i;

function safeParseJson(raw) {
    try {
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

function toNumber(value) {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function toDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function toCapabilities(value) {
    if (Array.isArray(value)) {
        return value.map(String).map((v) => v.trim()).filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
        return value.split(',').map((v) => v.trim()).filter(Boolean);
    }

    return undefined;
}

function pickDefinedEntries(object) {
    return Object.fromEntries(
        Object.entries(object).filter(([, value]) => value !== undefined)
    );
}

function getEffectiveDeviceId(topicDeviceId, payloadObj) {
    const fromPayload = payloadObj && typeof payloadObj.deviceId === 'string'
        ? payloadObj.deviceId.trim()
        : '';

    return fromPayload || topicDeviceId;
}

function parseRegisterPayload(rawPayload) {
    const parsed = safeParseJson(rawPayload);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
    }

    return parsed;
}

function parseReadingPayload(action, rawPayload) {
    const parsed = safeParseJson(rawPayload);
    const isObjectPayload = parsed && typeof parsed === 'object' && !Array.isArray(parsed);
    const topicAction = action.toLowerCase();

    let temperature;
    let humidity;

    if (isObjectPayload) {
        temperature = toNumber(parsed.temperature);
        humidity = toNumber(parsed.humidity);

        if (topicAction === 'temperatura' && temperature === undefined) {
            temperature = toNumber(parsed.value);
        }

        if (topicAction === 'humedad' && humidity === undefined) {
            humidity = toNumber(parsed.value);
        }
    } else {
        const numericValue = toNumber(rawPayload);
        if (topicAction === 'temperatura') {
            temperature = numericValue;
        }

        if (topicAction === 'humedad') {
            humidity = numericValue;
        }
    }

    const timestampCandidate = isObjectPayload
        ? (parsed.ts || parsed.timestamp)
        : null;

    return {
        payload: isObjectPayload ? parsed : {},
        ts: toDate(timestampCandidate) || new Date(),
        temperature,
        humidity,
    };
}

async function upsertDeviceOnRegister(deviceId, payloadObj) {
    const seenAt = toDate(payloadObj.ts) || new Date();
    const capabilities = toCapabilities(payloadObj.capabilities);

    const fieldsToSet = pickDefinedEntries({
        name: payloadObj.name,
        type: payloadObj.type,
        location: payloadObj.location,
        fwVersion: payloadObj.fwVersion,
        capabilities,
        status: 'online',
        lastSeen: seenAt,
    });

    return Device.findOneAndUpdate(
        { deviceId },
        {
            $set: fieldsToSet,
            $setOnInsert: {
                deviceId,
            },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
}

async function ensureDeviceForReading(deviceId, payloadObj, seenAt) {
    const capabilities = toCapabilities(payloadObj.capabilities);
    const inferredCapabilities = capabilities || ['temperature', 'humidity'];

    return Device.findOneAndUpdate(
        { deviceId },
        {
            $set: {
                status: 'online',
                lastSeen: seenAt,
            },
            $setOnInsert: {
                deviceId,
                name: payloadObj.name || `ESP32-${deviceId}`,
                type: payloadObj.type || 'sensor',
                location: payloadObj.location || 'auto-registered',
                capabilities: inferredCapabilities,
            },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
}

async function saveLinkedReading(device, topic, readingData) {
    if (readingData.temperature === undefined && readingData.humidity === undefined) {
        console.warn(`[MQTT] Payload de lectura inválido en ${topic}`);
        return;
    }

    await Reading.create({
        deviceId: device._id,
        ts: readingData.ts,
        timestamp: readingData.ts,
        temperature: readingData.temperature,
        humidity: readingData.humidity,
        rawTopic: topic,
    });

    console.log(
        `[MQTT] Lectura guardada -> deviceId=${device.deviceId || 'sin-deviceId'} ` +
        `temp=${readingData.temperature ?? 'NA'} hum=${readingData.humidity ?? 'NA'}`
    );
}

async function handle(topic, payload) {
    const match = topic.match(pattern);
    if (!match) {
        return;
    }

    const [, topicDeviceId, rawAction] = match;
    const action = rawAction.toLowerCase();
    const rawPayload = payload?.toString?.() ?? '';

    if (action === 'register') {
        const registerPayload = parseRegisterPayload(rawPayload);

        if (!registerPayload) {
            console.warn(`[MQTT] Register inválido en ${topic}: ${rawPayload}`);
            return;
        }

        const deviceId = getEffectiveDeviceId(topicDeviceId, registerPayload);
        const device = await upsertDeviceOnRegister(deviceId, registerPayload);
        console.log(`[MQTT] Device registrado/actualizado -> ${device.deviceId}`);
        return;
    }

    const readingData = parseReadingPayload(action, rawPayload);
    const deviceId = getEffectiveDeviceId(topicDeviceId, readingData.payload);
    const device = await ensureDeviceForReading(deviceId, readingData.payload, readingData.ts);
    await saveLinkedReading(device, topic, readingData);
}

module.exports = { pattern, handle };
