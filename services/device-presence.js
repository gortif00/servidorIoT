const Device = require('../models/device');

const DEFAULT_OFFLINE_AFTER_MS = parseInt(process.env.DEVICE_OFFLINE_AFTER_MS || '120000', 10);
const DEFAULT_CHECK_INTERVAL_MS = parseInt(process.env.DEVICE_STATUS_CHECK_MS || '30000', 10);

function startDevicePresenceMonitor() {
    const offlineAfterMs = Number.isFinite(DEFAULT_OFFLINE_AFTER_MS) && DEFAULT_OFFLINE_AFTER_MS > 0
        ? DEFAULT_OFFLINE_AFTER_MS
        : 120000;

    const checkIntervalMs = Number.isFinite(DEFAULT_CHECK_INTERVAL_MS) && DEFAULT_CHECK_INTERVAL_MS > 0
        ? DEFAULT_CHECK_INTERVAL_MS
        : 30000;

    const runCheck = async () => {
        const threshold = new Date(Date.now() - offlineAfterMs);
        const result = await Device.updateMany(
            {
                status: 'online',
                lastSeen: { $lt: threshold }
            },
            {
                $set: { status: 'offline' }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[MQTT] Devices offline actualizados: ${result.modifiedCount}`);
        }
    };

    const interval = setInterval(() => {
        runCheck().catch((err) => {
            console.error('[MQTT] Error actualizando estado offline:', err.message);
        });
    }, checkIntervalMs);

    if (typeof interval.unref === 'function') {
        interval.unref();
    }

    runCheck().catch((err) => {
        console.error('[MQTT] Error en chequeo inicial de estado offline:', err.message);
    });

    return () => clearInterval(interval);
}

module.exports = { startDevicePresenceMonitor };
