import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/database.js';
import envConfig from './config/envConfig.js';
import multer from 'multer'; // Ensure multer is imported

// Route imports
import authRoutes from './routes/authRoutes.js';
import rfqRoutes from './routes/rfqRoutes.js';
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rfqs', rfqRoutes);

// Error Middleware (should be last)
app.use(errorMiddleware);

// Handle file upload errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: 'File upload error',
      error: err.message
    });
  } else if (err) {
    return res.status(500).json({
      message: 'An error occurred',
      error: err.message
    });
  }
  next();
});

// Log all available routes
app.listen(envConfig.PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${envConfig.PORT}`);
  
  // Print all the available routes
  const routes = listRoutes(app);
  console.log('Available Routes:');
  routes.forEach(route => {
    console.log(`${route.method} ${route.path}`);
  });
});

export default app;
