const express = require('express');
const { getReadingsByDevice, createReading, deleteReadingsByDevice, getReadingsByTimeRange } = require('../controllers/readings.controller');
const authMiddleware = require('../middlewares/auth.Middleware');

const router = express.Router();

router.get('/device/:deviceId',              getReadingsByDevice);
router.get('/device/:deviceId/range',        getReadingsByTimeRange);
router.post('/',            authMiddleware,  createReading);
router.delete('/device/:deviceId', authMiddleware, deleteReadingsByDevice);

module.exports = router;
