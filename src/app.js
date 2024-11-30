import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/database.js';
import envConfig from './config/envConfig.js';
import multer from 'multer'; // Ensure multer is imported
import morgan from 'morgan'; // For logging HTTP requests

// Route imports
import authRoutes from './routes/authRoutes.js';
import rfqRoutes from './routes/rfqRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import negotiateRoute from './routes/negotiateRoutes.js'
// Middleware imports
import errorMiddleware from './middleware/errorMiddleware.js';
// Utility imports
import { listRoutes } from './utils/listRoutes.js'; // Import the utility to list routes

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logs HTTP requests in 'dev' format

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/negotiate',negotiateRoute)

// Handle file upload errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: 'File upload error',
      error: err.message
    });
  }
  next(err); // pass other errors to the next middleware
});

// Error Middleware (should be last)
app.use(errorMiddleware);

// Log all available routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  const routes = listRoutes(app);
  console.log('Available Routes:');
  routes.forEach(route => {
    console.log(`${route.method} ${route.path}`);
  });
}

app.listen(envConfig.PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${envConfig.PORT}`);
});

export default app;
