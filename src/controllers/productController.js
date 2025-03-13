import Product from '../models/ProductSchema.js';
import asyncHandler from '../middleware/asyncHandler.js';
import envConfig from '../config/envConfig.js';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: envConfig.CLOUDINARY_CLOUD_NAME,
  api_key: envConfig.CLOUDINARY_API_KEY,
  api_secret: envConfig.CLOUDINARY_API_SECRET,
});
// @desc    Create a new product
// @route   POST /api/products
// @access  Private (Supplier only)
export const createProduct = asyncHandler(async (req, res) => {
  console.log('📌 Incoming request to create product');
  
  // Log file information if it exists
  if (req.file) {
    console.log('📂 Uploaded File:', {
      fieldname: req.file.fieldname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });
  } else {
    console.log('❌ No file uploaded with request');
  }

  // Extract data from request body
  const {
    name,
    description,
    category,
    dosageForm,
    strength,
    batchNumber,
    storageConditions,
    expiryDate: rawExpiryDate,
    quantityAvailable: rawQuantity,
    unitPrice: rawPrice,
  } = req.body;

  // Ensure only suppliers can create products
  if (req.user.accountType !== 'Supplier') {
    res.status(403);
    throw new Error('Only suppliers can create products.');
  }

  // Validate required fields
  if (!name || !category) {
    res.status(400);
    throw new Error('Product name and category are required.');
  }

  // Parse and validate numeric fields
  const quantityAvailable = parseFloat(rawQuantity);
  if (isNaN(quantityAvailable) || quantityAvailable < 0) {
    res.status(400);
    throw new Error('Quantity must be a non-negative number.');
  }

  const unitPrice = parseFloat(rawPrice);
  if (isNaN(unitPrice) || unitPrice < 0) {
    res.status(400);
    throw new Error('Unit price must be a non-negative number.');
  }

  // Parse and validate expiry date
  const expiryDate = rawExpiryDate ? new Date(rawExpiryDate) : null;
  if (!expiryDate || isNaN(expiryDate.getTime())) {
    res.status(400);
    throw new Error('A valid expiry date is required.');
  }

  // Handle image upload (if provided)
  let imageUrl = null;
  
  if (req.file) {
    try {
      console.log('📤 Attempting to upload file to Cloudinary:', req.file.path);
      
      // Use Cloudinary's upload method directly
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'pharma-procurement/products',
        resource_type: 'auto'
      });
      
      console.log('✅ Cloudinary upload successful:', result.secure_url);
      imageUrl = result.secure_url;
      
      // Clean up local file after upload
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error removing temp file:', err);
      });
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
    }
  }

  // Create new product instance
  const product = new Product({
    supplier: req.user._id,
    name,
    description,
    category,
    dosageForm,
    strength,
    quantityAvailable,
    unitPrice,
    expiryDate,
    batchNumber,
    storageConditions,
    productImage: imageUrl,
  });

  // Save to database
  const createdProduct = await product.save();
  
  console.log('✅ Product saved with image URL:', imageUrl);

  res.status(201).json({
    message: '🎉 Product created successfully!',
    product: createdProduct,
  });
});
// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const {
    category,
    minPrice,
    maxPrice,
    search,
    page = 1,
    limit = 10
  } = req.query;

  // Build query object
  const query = {};
  if (category) query.category = category;
  if (minPrice) query.unitPrice = { $gte: Number(minPrice) };
  if (maxPrice) query.unitPrice = {
    ...query.unitPrice,
    $lte: Number(maxPrice)
  };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Debug log to see the constructed query
  console.log('Query filters:', JSON.stringify(query));

  const products = await Product.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ createdAt: -1 });

  // Debug log to check if image URLs are present
  if (products.length > 0) {
    console.log('Sample product image URL:', products[0].image);
    console.log('Product structure:', {
      id: products[0]._id,
      hasImage: !!products[0].image,
      fields: Object.keys(products[0]._doc || products[0])
    });
  }

  const total = await Product.countDocuments(query);

  res.json({
    message: 'Products retrieved successfully',
    products,  // This is the array containing your products with images
    totalPages: Math.ceil(total / Number(limit)),
    currentPage: Number(page)
  });
});

// @desc    Get products for current supplier
// @route   GET /api/products/my-products
// @access  Private (Supplier only)
export const getMyProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ supplier: req.user._id });
  
  // Debug log to check if image URLs are present
  if (products.length > 0) {
    console.log('My products - Sample product image URL:', products[0].image);
    console.log('My products - Product structure:', {
      id: products[0]._id,
      hasImage: !!products[0].image,
      fields: Object.keys(products[0]._doc || products[0])
    });
  }

  res.json({
    message: 'Your products retrieved successfully',
    products  // This is the array containing your products with images
  });
});

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('supplier', 'businessName');

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Debug log to check if image URL is present
  console.log('Product by ID - Image URL:', product.image);
  console.log('Product by ID - Fields:', Object.keys(product._doc || product));

  res.json({
    message: 'Product details retrieved successfully',
    product  // This is the object containing your product with image
  });
});
// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Supplier only)
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Ensure only the product owner can update
  if (product.supplier.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this product');
  }

  // Update fields
  product.name = req.body.name || product.name;
  product.description = req.body.description || product.description;
  product.category = req.body.category || product.category;
  product.manufacturer = req.body.manufacturer || product.manufacturer;
  product.dosageForm = req.body.dosageForm || product.dosageForm;
  product.strength = req.body.strength || product.strength;
  product.quantityAvailable = req.body.quantityAvailable || product.quantityAvailable;
  product.unitPrice = req.body.unitPrice || product.unitPrice;
  product.expiryDate = req.body.expiryDate || product.expiryDate;
  product.batchNumber = req.body.batchNumber || product.batchNumber;
  product.storageConditions = req.body.storageConditions || product.storageConditions;

  const updatedProduct = await product.save();
  res.json({
    message: 'Product updated successfully',
    product: updatedProduct
  });
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Supplier only)
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Ensure only the product owner can delete
  if (product.supplier.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this product');
  }

  await product.deleteOne();
  res.json({
    message: 'Product removed successfully'
  });
});

// @desc    Get products nearing expiry
// @route   GET /api/products/expiring-soon
// @access  Private
export const getExpiringProducts = asyncHandler(async (req, res) => {
  const daysThreshold = req.query.days || 30; // Default 30 days
  const currentDate = new Date();
  const expiryThreshold = new Date(currentDate.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  const expiringProducts = await Product.find({
    expiryDate: { 
      $gte: currentDate, 
      $lte: expiryThreshold 
    },
    supplier: req.user._id // Only for the current supplier
  }).sort({ expiryDate: 1 });

  res.json({
    message: 'Expiring products retrieved successfully',
    expiringProducts
  });
});


// ADMIN

export const adminGetAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).populate('supplier', 'businessName');
  res.json({
    message: 'All products retrieved successfully',
    products,
  });
});

// @desc    Admin: Create a new product
// @route   POST /api/admin/products
// @access  Private (Admin only)
export const adminCreateProduct = asyncHandler(async (req, res) => {
  const { 
    supplierId, name, description, category, 
    dosageForm, strength, quantityAvailable, 
    unitPrice, expiryDate, batchNumber, storageConditions 
  } = req.body;

  const product = new Product({
    supplier: supplierId, // Admin provides the supplier ID
    name, 
    description, 
    category, 
    dosageForm, 
    strength, 
    quantityAvailable, 
    unitPrice, 
    expiryDate,
    batchNumber,
    storageConditions,
  });

  const createdProduct = await product.save();
  res.status(201).json({
    message: 'Product created successfully by Admin',
    product: createdProduct,
  });
});

// @desc    Admin: Update any product
// @route   PUT /api/admin/products/:id
// @access  Private (Admin only)
export const adminUpdateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Update fields
  product.name = req.body.name || product.name;
  product.description = req.body.description || product.description;
  product.category = req.body.category || product.category;
  product.dosageForm = req.body.dosageForm || product.dosageForm;
  product.strength = req.body.strength || product.strength;
  product.quantityAvailable = req.body.quantityAvailable || product.quantityAvailable;
  product.unitPrice = req.body.unitPrice || product.unitPrice;
  product.expiryDate = req.body.expiryDate || product.expiryDate;
  product.batchNumber = req.body.batchNumber || product.batchNumber;
  product.storageConditions = req.body.storageConditions || product.storageConditions;

  const updatedProduct = await product.save();
  res.json({
    message: 'Product updated successfully by Admin',
    product: updatedProduct,
  });
});

// @desc    Admin: Delete any product
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin only)
export const adminDeleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  await product.deleteOne();
  res.json({
    message: 'Product deleted successfully by Admin',
  });
});


// @desc    Admin: Get products nearing expiry
// @route   GET /api/admin/products/expiring-soon
// @access  Private (Admin only)
export const adminGetExpiringProducts = asyncHandler(async (req, res) => {
  const daysThreshold = req.query.days || 30; // Default threshold is 30 days
  const currentDate = new Date();
  const expiryThreshold = new Date(currentDate.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  const expiringProducts = await Product.find({
    expiryDate: { 
      $gte: currentDate, 
      $lte: expiryThreshold 
    },
  })
    .populate('supplier', 'businessName') // Fetch supplier details
    .sort({ expiryDate: 1 }); // Sort by earliest expiry

  res.json({
    message: 'Expiring products retrieved successfully for Admin',
    expiringProducts,
  });
});
