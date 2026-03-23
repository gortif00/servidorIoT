const mongoose = require('mongoose');

const MAX_READINGS = parseInt(process.env.MAX_READINGS_PER_DEVICE) || 60;

const ReadingSchema = new mongoose.Schema({
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    temperature: Number,
    humidity: Number,
    timestamp: { type: Date, default: Date.now }
});

ReadingSchema.post('save', async function () {
    const excess = await mongoose.model('Reading')
        .find({ deviceId: this.deviceId })
        .sort({ timestamp: -1 })
        .skip(MAX_READINGS)
        .select('_id');

    if (excess.length) {
        await mongoose.model('Reading').deleteMany({ _id: { $in: excess.map(r => r._id) } });
    }
});

module.exports = mongoose.model('Reading', ReadingSchema);
