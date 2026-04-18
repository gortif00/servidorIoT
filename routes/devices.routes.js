const express = require('express');
const authMiddleware = require('../middlewares/auth.Middleware');

let controllers;
try {
  controllers = require('../controllers/devices.controller');
} catch (_) {
  try {
    controllers = require('../controllers/device.controller');
  } catch (_) {
    try {
      controllers = require('../controllers/devicesController');
    } catch (_) {
      controllers = require('../controllers/deviceController');
    }
  }
}

const getAllDevices =
  controllers.getAllDevices ||
  controllers.getDevices ||
  controllers.listDevices;

const createDevice =
  controllers.createDevice ||
  controllers.create;

const getDeviceById =
  controllers.getDeviceById ||
  controllers.getDevice ||
  controllers.getById;

const updateDevice =
  controllers.updateDevice ||
  controllers.update;

const deleteDevice =
  controllers.deleteDevice ||
  controllers.removeDevice ||
  controllers.remove;

// Si no existe handler específico para "mine", usamos el listado general
const getMyDevices =
  controllers.getMyDevices ||
  getAllDevices;

if (
  typeof getAllDevices !== 'function' ||
  typeof createDevice !== 'function' ||
  typeof getDeviceById !== 'function' ||
  typeof updateDevice !== 'function' ||
  typeof deleteDevice !== 'function' ||
  typeof getMyDevices !== 'function'
) {
  throw new Error('Devices controller exports incompletos: revisa controllers/*devices*');
}

const router = express.Router();

router.get('/mine',   authMiddleware, getMyDevices);
router.get('/',       getAllDevices);
router.post('/',      authMiddleware, createDevice);
router.get('/:id',    getDeviceById);
router.put('/:id',    authMiddleware, updateDevice);
router.delete('/:id', authMiddleware, deleteDevice);

module.exports = router;
