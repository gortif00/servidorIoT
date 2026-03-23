const mongoose = require('mongoose');

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

const connectDB = async () => {
    try {
        const MONGO_URI = buildMongoUri();
        await mongoose.connect(MONGO_URI);
        console.log('Conexión a MongoDB establecida');
    } catch (err) {
        console.error('Error al conectar a MongoDB:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
