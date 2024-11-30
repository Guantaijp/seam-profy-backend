import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/database.js';
import envConfig from './config/envConfig.js';

// Route imports
import authRoutes from './routes/authRoutes.js';

// Middleware imports
import errorMiddleware from './middleware/errorMiddleware.js';

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



// Start Server
const PORT = envConfig.PORT;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;