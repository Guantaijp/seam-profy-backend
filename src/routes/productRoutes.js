import express from 'express';
import { 
  createProduct, 
  getProducts, 
  getMyProducts, 
  getProductById, 
  updateProduct, 
  deleteProduct,
  getExpiringProducts,
  adminGetAllProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
} from '../controllers/productController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateProduct } from '../middleware/validationMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';


// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer upload
const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});


const router = express.Router();




router.route('/')
  .post(authMiddleware, upload.single('productImage'), createProduct)
  .get(getProducts);

router.route('/my-products')
  .get(authMiddleware, getMyProducts);

router.route('/expiring-soon')
  .get(authMiddleware, getExpiringProducts);

router.route('/:id')
  .get(getProductById)
  .put(authMiddleware, validateProduct, updateProduct)
  .delete(authMiddleware, deleteProduct);



  // Admin Product Management Routes
router.get('/admin/products', authMiddleware, adminOnly, adminGetAllProducts);       // Get all products
router.post('/admin/products', authMiddleware, adminOnly, adminCreateProduct);       // Create a product
router.put('/admin/products/:id', authMiddleware, adminOnly, adminUpdateProduct);    // Update a product
router.delete('/admin/products/:id', authMiddleware, adminOnly, adminDeleteProduct); // Delete a product


export default router;
