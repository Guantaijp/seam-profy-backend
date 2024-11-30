import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import envConfig from '../config/envConfig.js';

const authMiddleware = async (req, res, next) => {
  let token;

  // Check if token is provided in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]; // Extract token
      const decoded = jwt.verify(token, envConfig.JWT_SECRET); // Decode token

      // Retrieve user details based on decoded user ID
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Attach user info to req.user
      req.user = { _id: user._id, ...user.toObject() };

      next(); // Continue to the next route handler
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return res.status(401).json({
        message: 'Not authorized, token is invalid or expired',
        error: error.message
      });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

export default authMiddleware;
