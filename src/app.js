import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/database.js';
import envConfig from './config/envConfig.js';
import multer from 'multer';
import morgan from 'morgan';
import ngrok from 'ngrok';
import dotenv from 'dotenv';

// Route imports
import authRoutes from './routes/authRoutes.js';
import rfqRoutes from './routes/rfqRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import negotiateRoutes from './routes/negotiateRoutes.js';
import productRoutes from './routes/productRoutes.js';
import paymentsRoutes from './routes/paymentsRoutes.js';
import invoicesRoutes from './routes/invoiceRoutes.js';
import mpesaRoutes from './routes/mpesaRoute.js';

// Middleware imports
import errorMiddleware from './middleware/errorMiddleware.js';

// Utility imports
import { listRoutes } from './utils/listRoutes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// Initialize ngrok when server starts
let ngrokUrl;
const initNgrok = async () => {
  try {
    const port = process.env.PORT2 || 3000;
    const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;  // Using NGROK_AUTH_TOKEN from environment
    ngrokUrl = await ngrok.connect({
      addr: port,
      authtoken: ngrokAuthToken,
    });
    console.log('Ngrok tunnel created:', ngrokUrl);
    app.set('ngrokUrl', ngrokUrl);
  } catch (err) {
    console.error('Ngrok tunnel error:', err);
  }
};

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const allowedOrigins = [
  'http://localhost:5173',
  'https://www.seamprofy.com',
  'https://adminseamprofy-jldd.vercel.app',
  'https://adminseamprofy.vercel.app',
  'https://pharma-procurement.vercel.app',
];

app.use(
  cors({
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
  })
);

// Root Route
app.get('/', (req, res) => {
  res.send('Welcome to the Pharma Procurement API!');
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

// Handle file upload errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: 'File upload error',
      error: err.message,
    });
  }
  next(err);
});

// Error Middleware
app.use(errorMiddleware);

// Log routes in development
if (process.env.NODE_ENV !== 'production') {
  const routes = listRoutes(app);
  console.log('Available Routes:');
  routes.forEach((route) => {
    console.log(`${route.method} ${route.path}`);
  });
}

// Start server and initialize ngrok
app.listen(process.env.PORT || 3000, async () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${process.env.PORT || 3000}`);
  if (process.env.NODE_ENV !== 'production') {
    await initNgrok();
  }
});

export default app;
