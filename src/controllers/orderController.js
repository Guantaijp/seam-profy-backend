import mongoose from 'mongoose';
import Order from '../models/Order.js'; // Assuming you have an Order model

export const createOrder = async (req, res) => {
  try {
    const { rfqId, supplierId, negotiationId, deliveryDetails, totalPrice } = req.body;

    // Validate required fields
    if (!rfqId || !supplierId || !negotiationId || !deliveryDetails || !totalPrice) {
      return res.status(400).json({
        message: 'All required fields must be provided',
        requiredFields: ['rfqId', 'supplierId', 'negotiationId', 'deliveryDetails', 'totalPrice'],
      });
    }

    // Create new order
    const newOrder = new Order({
      rfqId,
      supplierId,
      negotiationId, // Include negotiationId
      healthFacilityId: req.user._id, // Ensure this comes from the auth middleware
      deliveryDetails,
      totalPrice,
    });

    // Save the order to the database
    await newOrder.save();

    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      message: error.message || 'Failed to create order',
      errorDetails: error,
      stack: error.stack,
    });
  }
};


