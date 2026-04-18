const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    deviceId: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, trim: true },
    type: { type: String, trim: true },
    location: { type: String, trim: true },
    capabilities: { type: [String], default: [] },
    fwVersion: { type: String, trim: true },
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
    },
    lastSeen: { type: Date, default: null }
}, {
    timestamps: true
});

DeviceSchema.index({ deviceId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Device', DeviceSchema);
