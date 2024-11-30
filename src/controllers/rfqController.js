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
export const createRFQ = async (req, res) => {
    try {
      const { title, items, summary = '' } = req.body;
 
      // Ensure items is parsed if it's a string and validate its structure
      const parsedItems = typeof items === 'string' 
        ? JSON.parse(items) 
        : (items || []);
 
      // Validate that each item has all required fields
      const validatedItems = parsedItems.map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        specifications: item.specifications
      }));
 
      // Create RFQ object
      const rfqData = {
        title,
        items: validatedItems,
        createdBy: req.user._id,
        summary,
        status: 'Draft'
      };
 
      // Handle file uploads
      if (req.files && req.files.attachments) {
        const attachments = Array.isArray(req.files.attachments)
           ? req.files.attachments
           : [req.files.attachments];
 
        rfqData.attachments = await Promise.all(
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
      }
 
      // Create and save RFQ
      const rfq = await RFQ.create(rfqData);
 
      res.status(201).json({
        message: 'RFQ created successfully',
        rfq
      });
    } catch (error) {
      console.error('RFQ Creation Error:', error);
      res.status(400).json({
        message: error.message || 'RFQ creation failed',
        details: error.errors // This can help debug validation errors
      });
    }
 };
// @desc    Get all RFQs for the user
// @route   GET /api/rfq
export const getAllRFQs = async (req, res) => {
  try {
    const rfqs = await RFQ.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      count: rfqs.length,
      rfqs
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
