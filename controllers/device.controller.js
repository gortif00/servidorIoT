const Device = require('../models/device');
const { randomUUID } = require('node:crypto');

function buildDeviceId() {
    return `dev-${randomUUID()}`;
}

function withDeviceCompatibilityFields(deviceDoc) {
    const device = typeof deviceDoc.toObject === 'function' ? deviceDoc.toObject() : deviceDoc;

    if (device.deviceId === undefined) device.deviceId = null;
    if (device.status === undefined) device.status = 'offline';
    if (device.lastSeen === undefined) device.lastSeen = null;

    return device;
}

const getAllDevices = async (req, res) => {
    try {
        const devices = await Device.find();
        res.status(200).json(devices.map(withDeviceCompatibilityFields));
    } catch (err) {
        res.status(500).json({ msg: 'Error al obtener los devices', error: err });
    }
};

const getMyDevices = async (req, res) => {
    try {
        const devices = await Device.find({ userId: req.user.id });
        res.status(200).json(devices.map(withDeviceCompatibilityFields));
    } catch (err) {
        res.status(500).json({ msg: 'Error al obtener los devices del usuario', error: err });
    }
};

const createDevice = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            userId: req.user.id,
        };

        if (!payload.deviceId) {
            payload.deviceId = buildDeviceId();
        }

        const device = new Device(payload);
        await device.save();
        res.status(201).json({ msg: 'Device guardado correctamente', device });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ msg: 'Ya existe un device con ese deviceId' });
        }
        res.status(500).json({ msg: 'Error al guardar el device', error: err });
    }
};

const getDeviceById = async (req, res) => {
    try {
        const device = await Device.findById(req.params.id);
        if (!device) return res.status(404).json({ msg: 'Device no encontrado' });
        res.status(200).json(withDeviceCompatibilityFields(device));
    } catch (err) {
        res.status(500).json({ msg: 'Error al obtener el device', error: err });
    }
};

const updateDevice = async (req, res) => {
    try {
        const device = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!device) return res.status(404).json({ msg: 'Device no encontrado' });
        res.json({ msg: 'Device actualizado correctamente', device });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ msg: 'Ya existe un device con ese deviceId' });
        }
        res.status(500).json({ msg: 'Error al actualizar el device', error: err });
    }
};

const deleteDevice = async (req, res) => {
    try {
        const device = await Device.findByIdAndDelete(req.params.id);
        if (!device) return res.status(404).json({ msg: 'Device no encontrado' });
        res.json({ msg: 'Device eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ msg: 'Error al eliminar el device', error: err });
    }
};

module.exports = { getAllDevices, getMyDevices, createDevice, getDeviceById, updateDevice, deleteDevice };
