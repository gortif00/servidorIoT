const mongoose = require('mongoose');

const MAX_READINGS = parseInt(process.env.MAX_READINGS_PER_DEVICE) || 60;

const ReadingSchema = new mongoose.Schema({
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    ts: { type: Date, default: Date.now },
    timestamp: { type: Date },
    temperature: Number,
    humidity: Number,
    rawTopic: { type: String }
}, {
    timestamps: true
});

ReadingSchema.index({ deviceId: 1, ts: -1 });

ReadingSchema.pre('validate', function normalizeTimestamps(next) {
    if (!this.ts && this.timestamp) {
        this.ts = this.timestamp;
    }

    if (!this.timestamp && this.ts) {
        this.timestamp = this.ts;
    }

    next();
});

ReadingSchema.post('save', async function () {
    const excess = await mongoose.model('Reading')
        .find({ deviceId: this.deviceId })
        .sort({ ts: -1, timestamp: -1 })
        .skip(MAX_READINGS)
        .select('_id');

    if (excess.length) {
        await mongoose.model('Reading').deleteMany({ _id: { $in: excess.map(r => r._id) } });
    }
});

module.exports = mongoose.model('Reading', ReadingSchema);
