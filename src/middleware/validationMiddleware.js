import asyncHandler from './asyncHandler.js';

// Helper function to validate product fields
const validateProductFields = (data, isMultipart) => {
  const errors = [];
  const {
    name,
    category,
    quantityAvailable,
    unitPrice,
    expiryDate,
  } = data;

  // Validate name
  if (!name || String(name).trim() === '') {
    errors.push('Product name is required');
  }

  // Validate category
  if (!category || String(category).trim() === '') {
    errors.push('Product category is required');
  }

  // Validate quantity
  const parsedQuantity = isMultipart ? parseFloat(quantityAvailable) : quantityAvailable;
  if (isNaN(parsedQuantity) || parsedQuantity < 0) {
    errors.push('Quantity must be a non-negative number');
  }

  // Validate unit price
  const parsedPrice = isMultipart ? parseFloat(unitPrice) : unitPrice;
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    errors.push('Unit price must be a non-negative number');
  }

  // Validate expiry date
  let parsedExpiryDate = null;
  if (expiryDate) {
    parsedExpiryDate = new Date(String(expiryDate));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(parsedExpiryDate.getTime()) || parsedExpiryDate <= today) {
      errors.push('Expiry date must be a future date');
    }
  } else {
    errors.push('Expiry date is required');
  }

  return { errors, parsedQuantity, parsedPrice, parsedExpiryDate };
};

// Middleware to validate product creation data
export const validateProduct = asyncHandler(async (req, res, next) => {
  // Check if request is multipart/form-data
  const isMultipart = req.is('multipart/form-data') || 
                      (req.headers['content-type'] &&
                       req.headers['content-type'].includes('multipart/form-data'));

  // Log request details for debugging
  console.log('Request Content-Type:', req.headers['content-type']);
  console.log('Request body:', req.body);
  console.log('Is multipart:', isMultipart);

  // Validate fields
  const { errors, parsedQuantity, parsedPrice, parsedExpiryDate } = validateProductFields(req.body, isMultipart);

  // If there are errors, return response
  if (errors.length > 0) {
    res.status(400);
    throw new Error(errors.join(', '));
  }

  // Attach parsed values to req.body for further use
  req.body.quantityAvailable = parsedQuantity;
  req.body.unitPrice = parsedPrice;
  req.body.expiryDate = parsedExpiryDate;

  next();
});
