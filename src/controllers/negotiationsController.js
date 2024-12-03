import mongoose from 'mongoose';
import Negotiation from '../models/Negotiation.js'; // Adjust the import path
import RFQ from '../models/RFQ.js'; // Adjust the import path

// @desc    Negotiate RFQ
// @route   POST /api/rfq/:id/negotiate
export const negotiateRFQ = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user is a supplier
    if (!req.user || req.user.accountType !== 'Supplier') {
      return res.status(403).json({
        message: 'Access denied. Only suppliers can create negotiations.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid RFQ ID format' });
    }

    const { items, totalQuotePrice, deliveryTimeframe, additionalNotes, status = 'Submitted' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    items.forEach((item, index) => {
      if (!item.itemId || !item.quotedPrice) {
        return res.status(400).json({
          message: `Item ${index + 1} is missing required fields (itemId, quotedPrice)`,
        });
      }
    });

    if (!totalQuotePrice || !deliveryTimeframe) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const rfq = await RFQ.findById(id);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    if (rfq.status !== 'Published') {
      return res.status(400).json({ message: 'RFQ is not available for negotiation' });
    }

    const negotiation = new Negotiation({
      rfqId: id,
      supplierId: req.user._id,
      healthFacilityId: rfq.createdBy,
      items,
      totalQuotePrice,
      deliveryTimeframe,
      additionalNotes,
      status,
      negotiationStatus: 'Pending',
      submittedAt: new Date(),
    });

    await negotiation.save();

    rfq.negotiations.push(negotiation._id);
    await rfq.save();

    res.json({
      message: 'Negotiation submitted successfully',
      negotiation,
    });
  } catch (error) {
    console.error('Error during negotiation submission:', error);
    res.status(500).json({
      message: error.message || 'Failed to submit negotiation',
      errorDetails: error,
      stack: error.stack,
    });
  }
};
// @desc    Get Negotiations for an RFQ
// @route   GET /api/rfq/:id/negotiations
export const getNegotiationsForRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    res.json({
      count: rfq.negotiations ? rfq.negotiations.length : 0,
      negotiations: rfq.negotiations || []
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Failed to retrieve negotiations' 
    });
  }
};

// @desc    Select Negotiation for RFQ
// @route   PATCH /api/rfq/:id/select-negotiation/:negotiationId
export const selectNegotiation = async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    const selectedNegotiation = rfq.negotiations.find(
      neg => neg._id.toString() === req.params.negotiationId
    );

    if (!selectedNegotiation) {
      return res.status(404).json({ message: 'Negotiation not found' });
    }

    rfq.negotiations.forEach(neg => {
      neg.negotiationStatus = neg._id.toString() === req.params.negotiationId 
        ? 'Selected' 
        : 'Rejected';
    });

    rfq.status = 'Awarded';
    rfq.awardedTo = selectedNegotiation.supplierId;
    rfq.awardedNegotiationId = selectedNegotiation._id;

    await rfq.save();

    res.json({
      message: 'Negotiation selected successfully',
      rfq
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Negotiation selection failed' 
    });
  }
};

// @desc    Get Supplier's Negotiations
// @route   GET /api/supplier-negotiations
export const getSupplierNegotiations = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        message: 'Unauthorized. Please log in.',
      });
    }

    const supplierId = req.user._id;

    // Find all negotiations where the supplierId matches the authenticated supplier
    const negotiations = await Negotiation.find({ supplierId })
      .populate({
        path: 'rfqId',
        select: 'title description status createdAt',
      })
      .populate({
        path: 'healthFacilityId',
        select: 'name email contact',
      })
      .lean();

    if (!negotiations || negotiations.length === 0) {
      return res.status(404).json({ 
        message: 'No negotiations found for this supplier',
        count: 0,
        negotiations: [],
      });
    }

    res.json({
      count: negotiations.length,
      negotiations,
    });
  } catch (error) {
    console.error('Error fetching supplier negotiations:', error);
    res.status(500).json({
      message: 'Failed to fetch supplier negotiations',
      error: error.message,
    });
  }
};



// @desc    Get Health Facility's Negotiations
// @route   GET /api/health-facility-negotiations
export const getHealthFacilityNegotiations = async (req, res) => {
  try {
    if (!req.user || !req.user._id || req.user.accountType !== 'Healthcare Facility') {
      return res.status(403).json({
        message: 'Access denied. Only Healthcare Facilities can access this route.',
      });
    }

    const healthFacilityId = req.user._id;

    // Find RFQs created by the health facility
    const rfqs = await RFQ.find({ createdBy: healthFacilityId })
      .select('_id negotiations title')
      .lean();

    if (!rfqs || rfqs.length === 0) {
      return res.status(200).json({
        message: 'No RFQs found for this health facility',
        count: 0,
        negotiations: [],
      });
    }

    // Extract all negotiation IDs
    const negotiationIds = rfqs.flatMap((rfq) => rfq.negotiations || []);

    // Find all negotiations linked to these RFQs
    const negotiations = await Negotiation.find({ _id: { $in: negotiationIds } })
      .populate({
        path: 'supplierId',
        select: 'businessName email contact',
      })
      .populate({
        path: 'rfqId',
        select: 'title description status createdAt',
      })
      .lean();

    res.json({
      count: negotiations.length,
      negotiations,
      rfqCount: rfqs.length,
      message: negotiations.length > 0 
        ? 'Negotiations retrieved successfully'
        : 'No negotiations found for your RFQs',
    });
  } catch (error) {
    console.error('Error fetching health facility negotiations:', error);
    res.status(500).json({
      message: 'Failed to fetch health facility negotiations',
      error: error.message,
    });
  }
};
