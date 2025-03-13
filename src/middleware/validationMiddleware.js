import asyncHandler from './asyncHandler.js';

export const validateProduct = asyncHandler(async (req, res, next) => {
  // Check if the request is multipart/form-data
  const isMultipart = req.is('multipart/form-data') || 
                      (req.headers['content-type'] && 
                       req.headers['content-type'].includes('multipart/form-data'));
  
  // Log request details for debugging
  console.log('Request Content-Type:', req.headers['content-type']);
  console.log('Request body:', req.body);
  console.log('Is multipart:', isMultipart);
  
  // Extract data from request body
  const {
    name,
    category,
    quantityAvailable,
    unitPrice,
    expiryDate
  } = req.body;
  
  const errors = [];
  
  // If this is a multipart request, we need to handle the data differently
  if (isMultipart) {
    // For multipart/form-data, all values come as strings
    
    // Validate name
    if (!name || String(name).trim() === '') {
      errors.push('Product name is required');
    }
    
    // Validate category
    if (!category || String(category).trim() === '') {
      errors.push('Product category is required');
    }
    
    // Validate quantity
    const parsedQuantity = parseFloat(quantityAvailable);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      errors.push('Quantity must be a non-negative number');
    }
    
    // Validate price
    const parsedPrice = parseFloat(unitPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      errors.push('Unit price must be a non-negative number');
    }
    
    // Validate expiry date
    if (expiryDate) {
      const parsedDate = new Date(String(expiryDate));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(parsedDate.getTime()) || parsedDate <= today) {
        errors.push('Expiry date must be a future date');
      }
    } else {
      errors.push('Expiry date is required');
    }
    
    // Add parsed values to req.body for later use
    if (!errors.length) {
      req.body.parsedQuantity = parsedQuantity;
      req.body.parsedPrice = parsedPrice;
      req.body.parsedExpiryDate = new Date(String(expiryDate));
    }
  } else {
    // For JSON requests, handle as before
    if (!name || name.trim() === '') {
      errors.push('Product name is required');
    }
    
    if (!category) {
      errors.push('Product category is required');
    }
    
    if (typeof quantityAvailable !== 'number' || quantityAvailable < 0) {
      errors.push('Quantity must be a non-negative number');
    }
    
    if (typeof unitPrice !== 'number' || unitPrice < 0) {
      errors.push('Unit price must be a non-negative number');
    }
    
    if (!expiryDate || new Date(expiryDate) <= new Date()) {
      errors.push('Expiry date must be a future date');
    }
  }
  
  // If there are validation errors, throw an error
  if (errors.length > 0) {
    res.status(400);
    throw new Error(errors.join(', '));
  }
  
  next();
});