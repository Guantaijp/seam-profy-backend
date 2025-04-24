import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from '../src/config/database.js';
import envConfig from '../src/config/envConfig.js';
import multer from 'multer';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from '../src/routes/authRoutes.js';
import rfqRoutes from '../src/routes/rfqRoutes.js';
import orderRoutes from '../src/routes/orderRoutes.js';
import negotiateRoutes from '../src/routes/negotiateRoutes.js';
import productRoutes from '../src/routes/productRoutes.js';
import paymentsRoutes from '../src/routes/paymentsRoutes.js';
import invoicesRoutes from '../src/routes/invoiceRoutes.js';
import mpesaRoutes from '../src/routes/mpesaRoute.js';
import ratingRoutes from '../src/routes/ratingRoutes.js';
import creditRoutes from '../src/routes/creditRequestRoutes.js';
import walletRoutes from '../src/routes/walletRoutes.js';
import errorMiddleware from '../src/middleware/errorMiddleware.js';

dotenv.config();
// envConfig(); // if you use it to load .env settings
connectDB();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://www.seamprofy.com',
  'https://adminseamprofy-jldd.vercel.app',
  'https://adminseamprofy.vercel.app',
  'https://pharma-procurement.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('Welcome to the Pharma Procurement API running on Vercel!');
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/negotiate', negotiateRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/wallets', walletRoutes);

// Error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  next(err);
});
app.use(errorMiddleware);

// Export handler for Vercel
export default serverless(app);
