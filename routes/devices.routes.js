const express = require('express');
const { getAllDevices, getMyDevices, createDevice, getDeviceById, updateDevice, deleteDevice } = require('../controllers/device.controller');
const authMiddleware = require('../middlewares/auth.Middleware');

const router = express.Router();

router.get('/',       getAllDevices);
router.get('/mine',   authMiddleware, getMyDevices);
router.post('/',      authMiddleware, createDevice);
router.get('/:id',    getDeviceById);
router.put('/:id',    authMiddleware, updateDevice);
router.delete('/:id', authMiddleware, deleteDevice);

module.exports = router;
