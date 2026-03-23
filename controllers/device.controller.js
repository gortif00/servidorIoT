const Device = require('../models/device');

const getAllDevices = async (req, res) => {
    try {
        const devices = await Device.find();
        res.status(200).json(devices);
    } catch (err) {
        res.status(500).json({ msg: 'Error al obtener los devices', error: err });
    }
};

const createDevice = async (req, res) => {
    try {
        const device = new Device({ ...req.body, userId: req.user.id });
        await device.save();
        res.status(201).json({ msg: 'Device guardado correctamente', device });
    } catch (err) {
        res.status(500).json({ msg: 'Error al guardar el device', error: err });
    }
};

const getDeviceById = async (req, res) => {
    try {
        const device = await Device.findById(req.params.id);
        if (!device) return res.status(404).json({ msg: 'Device no encontrado' });
        res.status(200).json(device);
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

module.exports = { getAllDevices, createDevice, getDeviceById, updateDevice, deleteDevice };
