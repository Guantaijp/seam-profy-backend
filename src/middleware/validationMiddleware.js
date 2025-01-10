import asyncHandler from './asyncHandler.js';

export const validateProduct = asyncHandler(async (req, res, next) => {
  const { 
    name, 
    category, 
    // manufacturer, 
    quantityAvailable, 
    unitPrice, 
    expiryDate 
  } = req.body;

  const errors = [];

  if (!name || name.trim() === '') {
    errors.push('Product name is required');
  }

  if (!category) {
    errors.push('Product category is required');
  }

  // if (!manufacturer) {
  //   errors.push('Manufacturer is required');
  // }

  if (typeof quantityAvailable !== 'number' || quantityAvailable < 0) {
    errors.push('Quantity must be a non-negative number');
  }

  if (typeof unitPrice !== 'number' || unitPrice < 0) {
    errors.push('Unit price must be a non-negative number');
  }

  if (!expiryDate || new Date(expiryDate) <= new Date()) {
    errors.push('Expiry date must be a future date');
  }

  if (errors.length > 0) {
    res.status(400);
    throw new Error(errors.join(', '));
  }

  next();
});