const Reading = require("../models/reading");
const Device = require("../models/device");
const mongoose = require("mongoose");
const moment = require("moment");

const resolveDeviceObjectId = async (deviceIdentifier) => {
  if (!deviceIdentifier) return null;

  if (mongoose.isValidObjectId(deviceIdentifier)) {
    const byMongoId = await Device.findById(deviceIdentifier).select("_id");
    if (byMongoId) return byMongoId._id;
  }

  const byDeviceId = await Device.findOne({ deviceId: deviceIdentifier }).select("_id");
  return byDeviceId ? byDeviceId._id : null;
};

// Obtener todas las lecturas de un device
const getReadingsByDevice = async (req, res) => {
  try {
    const resolvedDeviceId = await resolveDeviceObjectId(req.params.deviceId);

    if (!resolvedDeviceId) {
      return res.status(404).json({ msg: 'Device no encontrado' });
    }

    const readings = await Reading.find({ deviceId: resolvedDeviceId });

    if (!readings.length) {
      return res.status(404).json({ msg: 'No se encontraron lecturas para este device' });
    }

    res.status(200).json(readings);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener las lecturas', error: err.message });
  }
};

// Crear una nueva lectura
const createReading = async (req, res) => {
  try {
    const { deviceId, temperature, humidity, ts, timestamp, rawTopic } = req.body;

    if (!deviceId || (temperature === undefined && humidity === undefined)) {
      return res.status(400).json({ msg: "Faltan datos: deviceId y al menos temperature o humidity" });
    }

    const resolvedDeviceId = await resolveDeviceObjectId(deviceId);
    if (!resolvedDeviceId) {
      return res.status(404).json({ msg: "Device no encontrado" });
    }

    const readingTs = ts || timestamp;

    const reading = new Reading({
      deviceId: resolvedDeviceId,
      temperature,
      humidity,
      ts: readingTs,
      timestamp: readingTs,
      rawTopic,
    });
    await reading.save();
    res.status(201).json({ msg: "Lectura guardada correctamente", reading });
  } catch (err) {
    res.status(500).json({ msg: "Error al guardar la lectura", error: err.message });
  }
};

// Eliminar todas las lecturas de un device
const deleteReadingsByDevice = async (req, res) => {
  try {
    const resolvedDeviceId = await resolveDeviceObjectId(req.params.deviceId);

    if (!resolvedDeviceId) {
      return res.status(404).json({ msg: "Device no encontrado" });
    }

    const result = await Reading.deleteMany({ deviceId: resolvedDeviceId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ msg: "No se encontraron lecturas para eliminar" });
    }

    res.status(200).json({ msg: "Todas las lecturas del device fueron eliminadas" });
  } catch (err) {
    res.status(500).json({ msg: "Error al eliminar las lecturas", error: err.message });
  }
};

// Obtener lecturas de un device en un rango de fechas
const getReadingsByTimeRange = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { start, end } = req.query;

    const resolvedDeviceId = await resolveDeviceObjectId(deviceId);
    if (!resolvedDeviceId) {
      return res.status(404).json({ msg: "Device no encontrado" });
    }

    if (!start || !end) {
      return res.status(400).json({ msg: "Parámetros start y end requeridos en formato DD-MM-YYYY" });
    }

    const startDate = moment(start, "DD-MM-YYYY").startOf('day').toDate();
    const endDate   = moment(end,   "DD-MM-YYYY").endOf('day').toDate();

    const readings = await Reading.find({
      deviceId: resolvedDeviceId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    if (!readings.length) {
      return res.status(404).json({ msg: "No se encontraron lecturas en ese rango" });
    }

    res.status(200).json(readings);
  } catch (err) {
    res.status(500).json({ msg: "Error en la consulta", error: err.message });
  }
};

module.exports = { getReadingsByDevice, createReading, deleteReadingsByDevice, getReadingsByTimeRange };

