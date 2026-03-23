require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User    = require('../models/user');
const Device  = require('../models/device');
const Reading = require('../models/reading');

const {
    MONGODB_URI,
    MONGODB_USER,
    MONGODB_PASSWORD,
    MONGODB_HOST,
    MONGODB_DB,
} = process.env;

function buildMongoUri() {
    if (MONGODB_URI && MONGODB_URI.trim()) {
        return MONGODB_URI.trim();
    }

    const user = (MONGODB_USER || '').trim();
    const password = (MONGODB_PASSWORD || '').trim();
    const host = (MONGODB_HOST || '').trim();
    const db = (MONGODB_DB || '').trim();

    if (!user || !password || !host || !db) {
        throw new Error('Faltan variables de entorno de MongoDB. Define MONGODB_URI o MONGODB_USER, MONGODB_PASSWORD, MONGODB_HOST y MONGODB_DB.');
    }

    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${db}?retryWrites=true&w=majority`;
}

const MONGO_URI = buildMongoUri();

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('Conectado a MongoDB');

    // ── Limpiar solo los datos relacionados con este seed ────────
    const deviceNames = ['Sensor Temperatura/Humedad', 'Luz de Aviso'];
    const existingDevices = await Device.find({ name: { $in: deviceNames } });
    const existingIds = existingDevices.map((d) => d._id);

    await Promise.all([
        User.deleteOne({ email: 'user@user.com' }),
        Reading.deleteMany({ deviceId: { $in: existingIds } }),
        Device.deleteMany({ name: { $in: deviceNames } }),
    ]);
    console.log('Datos anteriores del seed eliminados');

    // ── 1. Usuario ───────────────────────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('user123', salt);

    const user = await User.create({
        name: 'nombreuser',
        email: 'user@user.com',
        password: hashedPassword,
    });
    console.log(`Usuario creado: ${user.email}`);

    // ── 2. Dispositivo: sensor de temperatura y humedad ──────────
    const sensorDevice = await Device.create({
        name: 'Sensor Temperatura/Humedad',
        type: 'sensor',
        location: 'Sala principal',
        userId: user._id,
    });
    console.log(`Dispositivo creado: ${sensorDevice.name}`);

    // 30 lecturas con temperatura y humedad en los últimos 30 días
    const readings = [];
    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));

        readings.push({
            deviceId: sensorDevice._id,
            temperature: parseFloat((20 + Math.random() * 10).toFixed(1)), // 20–30 °C
            humidity: parseFloat((40 + Math.random() * 40).toFixed(1)),    // 40–80 %
            timestamp: new Date(date.setHours(9, 0, 0, 0)),
        });
    }
    await Reading.insertMany(readings);
    console.log(`${readings.length} lecturas creadas para ${sensorDevice.name}`);

    // ── 3. Dispositivo: actuador luz de aviso ────────────────────
    const actuadorDevice = await Device.create({
        name: 'Luz de Aviso',
        type: 'actuador',
        location: 'Entrada',
        userId: user._id,
    });
    console.log(`Dispositivo creado: ${actuadorDevice.name}`);

    // ── Fin ──────────────────────────────────────────────────────
    console.log('\nSeed completado correctamente.');
    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error('Error en el seed:', err.message);
    mongoose.disconnect();
    process.exit(1);
});
