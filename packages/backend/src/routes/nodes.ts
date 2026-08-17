import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
  listNodes,
  getNodeById,
  createNode,
  updateNode,
  updateNodeStatus,
} from '../controllers/nodeController.js';

const router = Router();

// Public routes
router.get('/', listNodes);
router.get('/:id', getNodeById);

// Protected routes
router.post('/', verifyToken, requireRole('admin'), createNode);
router.patch('/:id', verifyToken, requireRole('admin', 'officer'), updateNode);
router.patch('/:id/status', verifyToken, requireRole('admin', 'officer'), updateNodeStatus);

export default router;
