import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import envConfig from '../config/envConfig.js';

const authMiddleware = async (req, res, next) => {
  let token;

  // Check for Authorization header with Bearer token
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      // Extract token
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, envConfig.JWT_SECRET);

      // Find user by decoded ID and exclude password
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Attach user details to req.user
      req.user = { _id: user._id, ...user.toObject() };

      return next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error('Authentication Error:', error);
      // Handle token expiration or invalid token
      return res.status(401).json({
        message: 'Not authorized, token is invalid or expired',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined, // Provide stack only in development
      });
    }
  } else {
    // If no token provided
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

export default authMiddleware;
