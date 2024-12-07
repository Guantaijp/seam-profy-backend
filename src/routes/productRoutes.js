import express from 'express';
import { 
  createProduct, 
  getProducts, 
  getMyProducts, 
  getProductById, 
  updateProduct, 
  deleteProduct,
  getExpiringProducts
} from '../controllers/productController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateProduct } from '../middleware/validationMiddleware.js';

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

export default router;
