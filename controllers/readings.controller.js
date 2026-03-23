const Reading = require("../models/reading");
const moment = require("moment");

// Obtener todas las lecturas de un device
const getReadingsByDevice = async (req, res) => {
  try {
    const readings = await Reading.find({ deviceId: req.params.deviceId });

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
    const { deviceId, temperature, humidity } = req.body;

    if (!deviceId || temperature === undefined || humidity === undefined) {
      return res.status(400).json({ msg: "Faltan datos: deviceId, temperature o humidity" });
    }

    const reading = new Reading({ deviceId, temperature, humidity });
    await reading.save();
    res.status(201).json({ msg: "Lectura guardada correctamente", reading });
  } catch (err) {
    res.status(500).json({ msg: "Error al guardar la lectura", error: err.message });
  }
};

// Eliminar todas las lecturas de un device
const deleteReadingsByDevice = async (req, res) => {
  try {
    const result = await Reading.deleteMany({ deviceId: req.params.deviceId });

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

    if (!start || !end) {
      return res.status(400).json({ msg: "Parámetros start y end requeridos en formato DD-MM-YYYY" });
    }

    const startDate = moment(start, "DD-MM-YYYY").startOf('day').toDate();
    const endDate   = moment(end,   "DD-MM-YYYY").endOf('day').toDate();

    const readings = await Reading.find({
      deviceId,
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

