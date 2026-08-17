import { Router } from 'express';
import { listSensorData, aggregateSensorData } from '../controllers/sensorDataController.js';

const router = Router();

router.get('/', listSensorData);
router.get('/aggregate', aggregateSensorData);

export default router;
