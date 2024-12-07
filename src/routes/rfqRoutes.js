import express from 'express';
import {
  createRFQ,
  getAllRFQs,
  getRFQById,
  updateRFQ,
  deleteRFQ,
  publishRFQ,
  removeAttachment,
  getPublishedRFQs,
  getHealthFacilityRequests,
  getSupplierRequests
} from '../controllers/rfqController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

const router = express.Router();

// Separate routes for creating RFQ
router.post('/createRfq', 
  authMiddleware,
  upload.fields([{ name: 'attachments', maxCount: 5 }]),
  createRFQ
);

router.get('/getMyRfqs', 
  authMiddleware, 
  getAllRFQs
);

router.get('/suppliers', authMiddleware, getPublishedRFQs);
router.get('/getHealthFacilityRequests', authMiddleware, getHealthFacilityRequests);
router.get('/getSupplierRequests', authMiddleware, getSupplierRequests);

router.route('/:id')
  .get(authMiddleware, getRFQById)
  .put(
    authMiddleware,
    upload.fields([{ name: 'attachments', maxCount: 5 }]),
    updateRFQ
  )
  .delete(authMiddleware, deleteRFQ);

// Publish RFQ route
router.patch('/:id/publish', authMiddleware, publishRFQ);

// Remove attachment route
router.delete('/:id/attachments/:attachmentId', authMiddleware, removeAttachment);


export default router;