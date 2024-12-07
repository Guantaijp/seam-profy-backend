import RFQ from '../models/RFQ.js';
import { v2 as cloudinary } from 'cloudinary';
import envConfig from '../config/envConfig.js';


// Configure Cloudinary
cloudinary.config({
  cloud_name: envConfig.CLOUDINARY_CLOUD_NAME,
  api_key: envConfig.CLOUDINARY_API_KEY,
  api_secret: envConfig.CLOUDINARY_API_SECRET
});

// Helper function to upload file to Cloudinary
const uploadToCloudinary = async (file, folder) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: `pharma-procurement/rfq-attachments/${folder}`,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw new Error('File upload failed');
  }
};

// @desc    Create new RFQ
// @route   POST /api/rfq
// @desc    Create new RFQ
// @route   POST /api/rfq
export const createRFQ = async (req, res) => {
  try {
    const { title, items, summary = '', expiryDate } = req.body;

    // Ensure items is parsed if it's a string and validate its structure
    let parsedItems;
    try {
      parsedItems = typeof items === 'string' ? JSON.parse(items) : items || [];
    } catch (parseError) {
      return res.status(400).json({
        message: 'Invalid items format. Failed to parse items.',
        details: parseError.message,
      });
    }

    // Validate that each item has all required fields
    const validatedItems = parsedItems.map(item => ({
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      specifications: item.specifications,
    }));

    // Check for missing fields in items
    for (const item of validatedItems) {
      if (!item.itemName || !item.quantity || !item.unit) {
        return res.status(400).json({
          message: 'Each item must have itemName, quantity, and unit.',
        });
      }
    }

    // Create RFQ object
    const rfqData = {
      title,
      items: validatedItems,
      createdBy: req.user._id,
      summary,
      status: 'Draft',
      expiryDate,
    };
    console.log('RFQ Data:', rfqData);

    // Handle file uploads
    if (req.files && req.files.attachments) {
      const attachments = Array.isArray(req.files.attachments)
        ? req.files.attachments
        : [req.files.attachments];

      rfqData.attachments = await Promise.all(
        attachments.map(async (file) => {
          try {
            const fileUrl = await uploadToCloudinary(file.path, req.user._id.toString());
            return { fileName: file.originalname, fileUrl };
          } catch (uploadError) {
            return res.status(500).json({
              message: 'Failed to upload file',
              details: uploadError.message,
            });
          }
        })
      );
    }

    // Create and save RFQ
    const rfq = await RFQ.create(rfqData);

    res.status(201).json({
      message: 'RFQ created successfully',
      rfq,
    });
  } catch (error) {
    console.error('RFQ Creation Error:', error);
    res.status(400).json({
      message: error.message || 'RFQ creation failed',
      details: error.errors || error.message, // Include error details if available
    });
  }
};

// @desc    Get all RFQs for the user
// @route   GET /api/rfq
export const getAllRFQs = async (req, res) => {
  try {
    // Extract pagination parameters from the request query, with defaults
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Fetch RFQs with pagination and count the total number of RFQs
    const [rfqs, total] = await Promise.all([
      RFQ.find({ createdBy: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      RFQ.countDocuments({ createdBy: req.user._id }),
    ]);

    // Respond with the paginated RFQs, total count, page, and limit
    res.json({
      rfqs,
      total,
      page,
      limit,
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Failed to retrieve RFQs' 
    });
  }
};


// @desc    Get single RFQ by ID
// @route   GET /api/rfq/:id
export const getRFQById = async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    res.json(rfq);
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Failed to retrieve RFQ' 
    });
  }
};

// @desc    Update RFQ
// @route   PUT /api/rfq/:id
export const updateRFQ = async (req, res) => {
  try {
    const { title, items } = req.body;

    // Find existing RFQ
    const rfq = await RFQ.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    // Update basic fields
    rfq.title = title || rfq.title;
    rfq.items = items || rfq.items;

    // Handle file uploads
    if (req.files && req.files.attachments) {
      const attachments = Array.isArray(req.files.attachments) 
        ? req.files.attachments 
        : [req.files.attachments];

      const newAttachments = await Promise.all(
        attachments.map(async (file) => {
          const fileUrl = await uploadToCloudinary(
            file.path, 
            req.user._id.toString()
          );
          return {
            fileName: file.originalname,
            fileUrl
          };
        })
      );

      rfq.attachments = [...(rfq.attachments || []), ...newAttachments];
    }

    // Save updated RFQ
    await rfq.save();

    res.json({
      message: 'RFQ updated successfully',
      rfq
    });
  } catch (error) {
    console.error('RFQ Update Error:', error);
    res.status(400).json({ 
      message: error.message || 'RFQ update failed' 
    });
  }
};

// @desc    Delete RFQ
// @route   DELETE /api/rfq/:id
export const deleteRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findOneAndDelete({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    res.json({ 
      message: 'RFQ deleted successfully',
      deletedRFQ: rfq 
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'RFQ deletion failed' 
    });
  }
};

// @desc    Publish RFQ
// @route   PATCH /api/rfq/:id/publish
export const publishRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    // Validate RFQ before publishing
    if (!rfq.title || rfq.items.length === 0) {
      return res.status(400).json({ 
        message: 'RFQ must have a title and at least one item' 
      });
    }

    rfq.status = 'Published';
    rfq.publishedAt = new Date();

    await rfq.save();

    res.json({
      message: 'RFQ published successfully',
      rfq
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'RFQ publish failed' 
    });
  }
};

// @desc    Remove attachment from RFQ
// @route   DELETE /api/rfq/:id/attachments/:attachmentId
export const removeAttachment = async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    rfq.attachments = rfq.attachments.filter(
      attachment => attachment._id.toString() !== req.params.attachmentId
    );

    await rfq.save();

    res.json({
      message: 'Attachment removed successfully',
      rfq
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Attachment removal failed' 
    });
  }
};


// @desc    Get all published RFQs for suppliers
// @route   GET /api/rfq/suppliers
export const getPublishedRFQs = async (req, res) => {
  try {
    // Extract pagination parameters from the request query, with defaults
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Fetch published RFQs with pagination and count the total number of published RFQs
    const [rfqs, total] = await Promise.all([
      RFQ.find({ status: 'Published' })
        .select('-createdBy') // Exclude the creator's ID for privacy
        .sort({ publishedAt: -1 }) // Sort by most recently published first
        .skip(skip)
        .limit(limit),
      RFQ.countDocuments({ status: 'Published' }),
    ]);

    // Respond with the paginated published RFQs, total count, page, and limit
    res.json({
      rfqs,
      total,
      page,
      limit,
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Failed to retrieve published RFQs' 
    });
  }
};

// @desc    Get RFQs with status filtering for Healthcare Facility
// @route   GET /api/rfq/facility-requests
export const getHealthFacilityRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const currentDate = new Date();

    let query = { 
      createdBy: req.user._id 
    };

    // Filter RFQs based on status for Healthcare Facility
    switch (status) {
      case 'Pending':
        query = {
          ...query,
          status: 'Published',
          $or: [
            { expiryDate: { $gt: currentDate } },
            { expiryDate: null }
          ]
        };
        break;
      case 'Closed':
        query = {
          ...query,
          $or: [
            { status: 'Awarded' },
            { expiryDate: { $lt: currentDate } }
          ]
        };
        break;
      default:
        // If no status specified, return all RFQs
        break;
    }

    // Extract pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Fetch RFQs with pagination and count
    const [rfqs, total] = await Promise.all([
      RFQ.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      RFQ.countDocuments(query)
    ]);

    res.json({
      rfqs,
      total,
      page,
      limit,
      status: status || 'All'
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Failed to retrieve RFQs' 
    });
  }
};

// @desc    Get RFQs with status filtering for Suppliers
// @route   GET /api/rfq/supplier-requests
export const getSupplierRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const currentDate = new Date();

    let query = { 
      status: 'Published' 
    };

    // Filter RFQs based on status for Suppliers
    switch (status) {
      case 'Active':
        query = {
          ...query,
          $or: [
            { expiryDate: { $gt: currentDate } },
            { expiryDate: null }
          ]
        };
        break;
      case 'Closed':
        query = {
          ...query,
          expiryDate: { $lt: currentDate }
        };
        break;
      default:
        // If no status specified, return all published RFQs
        break;
    }

    // Extract pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Fetch RFQs with pagination and count
    const [rfqs, total] = await Promise.all([
      RFQ.find(query)
        .select('-createdBy') // Exclude creator's ID for privacy
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      RFQ.countDocuments(query)
    ]);

    res.json({
      rfqs,
      total,
      page,
      limit,
      status: status || 'All'
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Failed to retrieve RFQs' 
    });
  }
};