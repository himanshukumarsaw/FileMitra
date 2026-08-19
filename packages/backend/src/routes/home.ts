import { Router } from 'express';
import {
  getNews,
  getServices,
  getStats,
  createEnquiry,
  listEnquiries,
  updateEnquiryStatus,
} from '../controllers/homeController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Public
router.get('/news', getNews);
router.get('/services', getServices);
router.get('/stats', getStats);
router.post('/enquiry', createEnquiry);

// Admin
router.get('/enquiries', verifyToken, requireRole('admin'), listEnquiries);
router.patch('/enquiries/:id/status', verifyToken, requireRole('admin'), updateEnquiryStatus);

export default router;
