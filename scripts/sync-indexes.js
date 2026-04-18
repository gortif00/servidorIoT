require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Device = require('../models/device');
const Reading = require('../models/reading');

async function syncIndexes() {
    await connectDB();

    await Device.createIndexes();
    await Reading.createIndexes();

    console.log('Indices de Device y Reading sincronizados');
    await mongoose.connection.close();
}

syncIndexes().catch((err) => {
    console.error('Error sincronizando indices:', err.message);
    mongoose.connection.close().finally(() => process.exit(1));
});
