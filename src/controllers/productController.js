import Product from '../models/ProductSchema.js';
import asyncHandler from '../middleware/asyncHandler.js';

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (Supplier only)
export const createProduct = asyncHandler(async (req, res) => {
  const { 
    name, description, category, manufacturer, 
    dosageForm, strength, quantityAvailable, 
    unitPrice, expiryDate, batchNumber, storageConditions 
  } = req.body;

  // Ensure only suppliers can create products
  if (req.user.accountType !== 'Supplier') {
    res.status(403);
    throw new Error('Only suppliers can create products');
  }

  const product = new Product({
    supplier: req.user._id,
    name, 
    description, 
    category, 
    manufacturer,
    dosageForm, 
    strength, 
    quantityAvailable, 
    unitPrice, 
    expiryDate,
    batchNumber,
    storageConditions
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
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
  if (minPrice) query.unitPrice = { $gte: minPrice };
  if (maxPrice) query.unitPrice = { 
    ...query.unitPrice, 
    $lte: maxPrice 
  };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { manufacturer: { $regex: search, $options: 'i' } }
    ];
  }

  const products = await Product.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Product.countDocuments(query);

  res.json({
    products,
    totalPages: Math.ceil(total / limit),
    currentPage: page
  });
});

// @desc    Get products for current supplier
// @route   GET /api/products/my-products
// @access  Private (Supplier only)
export const getMyProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ supplier: req.user._id });
  res.json(products);
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

  res.json(product);
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
  res.json(updatedProduct);
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
  res.json({ message: 'Product removed' });
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

  res.json(expiringProducts);
});