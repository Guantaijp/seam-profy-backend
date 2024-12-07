import mongoose from 'mongoose';
import Order from '../models/Order.js'; // Assuming you have an Order model
import Counter from '../models/Counter.js'; // Ensure the Counter model is imported
import Negotiation from '../models/Negotiation.js'; // Import Negotiation model

const getNextOrderNumber = async () => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { sequenceName: 'orderNumber' },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true } // Create the counter if it doesn't exist
    );

    const orderNumber = `ORD-${counter.sequenceValue.toString().padStart(6, '0')}`;
    return orderNumber;
  } catch (error) {
    console.error('Error generating order number:', error);
    throw new Error('Failed to generate order number');
  }
};

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rfqId, supplierId, negotiationId, deliveryDetails, totalPrice } = req.body;

    if (!rfqId || !supplierId || !negotiationId || !deliveryDetails || !totalPrice) {
      return res.status(400).json({
        message: 'All required fields must be provided',
        requiredFields: ['rfqId', 'supplierId', 'negotiationId', 'deliveryDetails', 'totalPrice'],
      });
    }

    // Generate the order number
    const orderNumber = await getNextOrderNumber();
    console.log("Generated Order Number:", orderNumber);

    // Create the new order with the generated order number
    const newOrder = new Order({
      orderNumber,
      rfqId,
      supplierId,
      negotiationId,
      healthFacilityId: req.user._id,
      deliveryDetails,
      totalPrice,
    });

    // Update the negotiation status
    const updatedNegotiation = await Negotiation.findByIdAndUpdate(
      negotiationId,
      { 
        negotiationStatus: 'Completed',
        status: 'Accepted'
      },
      { new: true, session }
    );

    if (!updatedNegotiation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        message: 'Negotiation not found',
      });
    }

    // Save the order to the database
    await newOrder.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder,
      negotiation: updatedNegotiation,
    });
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();

    console.error('Error creating order:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Duplicate order number detected. Please try again.',
        errorDetails: error,
      });
    }

    res.status(500).json({
      message: error.message || 'Failed to create order',
      errorDetails: error,
      stack: error.stack,
    });
  }
};

// Get orders for a health facility
export const getHealthFacilityOrders = async (req, res) => {
  try {
    
    const orders = await Order.find({ healthFacilityId: req.user._id })
    .populate('rfqId')
    .populate('supplierId', 'accountType businessName location') // Populate User model
    .populate('negotiationId')
    .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Health facility orders retrieved successfully',
      count: orders.length,
      orders: orders
    });
  } catch (error) {
    console.error('Error retrieving health facility orders:', error);
    res.status(500).json({
      message: error.message || 'Failed to retrieve orders',
      errorDetails: error
    });
  }
};

// Get orders for a supplier
export const getSupplierOrders = async (req, res) => {
  try {
    // Fetch orders where the supplierId matches the logged-in user's ID
    const orders = await Order.find({ supplierId: req.user._id })
      .populate('rfqId') // Optional: populate RFQ details if needed
      .populate('healthFacilityId') // Optional: populate health facility details
      .populate('negotiationId') // Optional: populate negotiation details
      .sort({ createdAt: -1 }); // Sort by most recent first

    res.status(200).json({
      message: 'Supplier orders retrieved successfully',
      count: orders.length,
      orders: orders
    });
  } catch (error) {
    console.error('Error retrieving supplier orders:', error);
    res.status(500).json({
      message: error.message || 'Failed to retrieve orders',
      errorDetails: error
    });
  }
};
