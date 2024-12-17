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

const router = express.Router();

router.route('/')
  .post(authMiddleware, validateProduct, createProduct)
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
router.get('/products', authMiddleware, adminOnly, adminGetAllProducts);       // Get all products
router.post('/products', authMiddleware, adminOnly, adminCreateProduct);       // Create a product
router.put('/products/:id', authMiddleware, adminOnly, adminUpdateProduct);    // Update a product
router.delete('/products/:id', authMiddleware, adminOnly, adminDeleteProduct); // Delete a product


export default router;
