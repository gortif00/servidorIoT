const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    name: String,
    type: String,
    location: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', DeviceSchema);
