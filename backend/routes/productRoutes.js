import express from 'express';
const router = express.Router();
//import products from '../data/products.js'; // test routes without DB
import { getProducts, getProductById } from '../controllers/productController.js';

router.route('/').get(getProducts);
router.route('/:id').get(getProductById);

export default router;