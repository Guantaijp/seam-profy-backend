import mongoose from 'mongoose';
import Negotiation from '../models/Negotiation.js'; // Adjust the import path
import RFQ from '../models/RFQ.js'; // Adjust the import path

// @desc    Negotiate RFQ
// @route   POST /api/rfq/:id/negotiate
export const negotiateRFQ = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid RFQ ID format' });
    }

    const { items, totalQuotePrice, deliveryTimeframe, additionalNotes, status = 'Submitted' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    items.forEach((item, index) => {
      if (!item.itemId || !item.quotedPrice) {
        return res.status(400).json({ message: `Item ${index + 1} is missing required fields (itemId, quotedPrice)` });
      }
    });

    if (!totalQuotePrice || !deliveryTimeframe) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const negotiation = new Negotiation({
      rfqId: id,
      supplierId: req.user._id,
      items,
      totalQuotePrice,
      deliveryTimeframe,
      additionalNotes,
      status,
      negotiationStatus: 'Pending',
      submittedAt: new Date()
    });

    const rfq = await RFQ.findById(id);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    if (rfq.status !== 'Published') {
      return res.status(400).json({ message: 'RFQ is not available for negotiation' });
    }

    await negotiation.save();

    rfq.negotiations.push(negotiation._id);
    await rfq.save();

    res.json({
      message: 'Negotiation submitted successfully',
      negotiation
    });
  } catch (error) {
    console.error('Error during negotiation submission:', error);
    res.status(500).json({
      message: error.message || 'Failed to submit negotiation',
      errorDetails: error,
      stack: error.stack
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
    const supplierId = req.user._id; // Get supplierId from the decoded JWT token

    // Find all negotiations where the supplierId matches the authenticated supplier
    const negotiations = await Negotiation.find({ 'supplierId': supplierId })
      .populate('supplierId'); // Optionally, populate supplier details if needed

    // Check if no negotiations are found
    if (!negotiations || negotiations.length === 0) {
      return res.status(404).json({ message: 'No negotiations found for this supplier' });
    }

    // Return the list of negotiations for the supplier
    res.json({
      count: negotiations.length,
      negotiations
    });
  } catch (error) {
    console.error('Error fetching supplier negotiations:', error);
    res.status(500).json({
      message: error.message || 'Failed to fetch supplier negotiations',
      errorDetails: error,
      stack: error.stack
    });
  }
};


// @desc    Get All Negotiations for the Health Facility
// @route   GET /api/health-facility-negotiations
export const getHealthFacilityNegotiations = async (req, res) => {
  try {
    const healthFacilityId = req.user._id; // Get health facility ID from the decoded JWT token

    // Find all RFQs created by the health facility
    const rfqs = await RFQ.find({ createdBy: healthFacilityId }).select('_id'); // Only select RFQ IDs

    if (!rfqs || rfqs.length === 0) {
      return res.status(404).json({ message: 'No RFQs found for this health facility' });
    }

    // Extract the RFQ IDs
    const rfqIds = rfqs.map((rfq) => rfq._id);

    // Find all negotiations linked to the RFQs
    const negotiations = await Negotiation.find({ rfqId: { $in: rfqIds } }).populate('supplierId rfqId');

    if (!negotiations || negotiations.length === 0) {
      return res.status(404).json({ message: 'No negotiations found for this health facility' });
    }

    // Respond with the list of negotiations
    res.json({
      count: negotiations.length,
      negotiations,
    });
  } catch (error) {
    console.error('Error fetching health facility negotiations:', error);
    res.status(500).json({
      message: error.message || 'Failed to fetch health facility negotiations',
      errorDetails: error,
      stack: error.stack,
    });
  }
};

