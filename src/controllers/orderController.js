import mongoose from 'mongoose';
import Order from '../models/Order.js'; // Assuming you have an Order model
import Counter from '../models/Counter.js'; // Ensure the Counter model is imported
import Negotiation from '../models/Negotiation.js';
import Invoice from '../models/Invoice.js';
import RFQ from '../models/RFQ.js';

const getNextOrderNumber = async () => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { sequenceName: 'orderNumber' },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true }
    );

    return `ORD-${counter.sequenceValue.toString().padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating order number:', error);
    throw new Error('Failed to generate order number');
  }
};

const getNextInvoiceNumber = async () => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { sequenceName: 'invoiceNumber' },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true }
    );

    return `INV-${counter.sequenceValue.toString().padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw new Error('Failed to generate invoice number');
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

    // Generate order and invoice numbers
    const orderNumber = await getNextOrderNumber();
    const invoiceNumber = await getNextInvoiceNumber();

    const negotiation = await Negotiation.findById(negotiationId)
    .populate({
      path: 'supplierId',
      select: 'businessName email phoneNumber location accountType'
    })
    .populate({
      path: 'rfqId',
      select: 'title summary items'  // Include items in the population
    });
  
  // Manually populate items
  const populatedItems = negotiation.items.map((item) => {
    const rfqItem = negotiation.rfqId.items.find(
      rfqItem => rfqItem._id.toString() === item.itemId.toString()
    );
  
    return {
      itemId: item.itemId,
      itemName: rfqItem?.itemName || 'Unknown Item',
      itemSpecifications: rfqItem?.specifications || 'No specifications',
      itemUnit: rfqItem?.unit || 'N/A',
      quotedPrice: item.quotedPrice,
      quantity: item.quantity,
      originalQuantity: rfqItem?.quantity || item.quantity
    };
  });

  if (!negotiation) {
    await session.abortTransaction();
    session.endSession();
    return res.status(404).json({
      message: 'Negotiation not found',
    });
  }
    // Create the new order
    const newOrder = new Order({
      orderNumber,
      rfqId,
      supplierId,
      negotiationId,
      healthFacilityId: req.user._id,
      deliveryDetails,
      totalPrice,
      paymentStatus: 'Invoiced',
      negotiationDetails: {
        deliveryTimeframe: negotiation.deliveryTimeframe,
        additionalNotes: negotiation.additionalNotes,
        totalQuotePrice: negotiation.totalQuotePrice,
        items: populatedItems
      },
      rfqDetails: {
        title: negotiation.rfqId?.title || 'Untitled RFQ',
        summary: negotiation.rfqId?.summary || 'No summary provided'
      },
      supplierDetails: {
        businessName: negotiation.supplierId.businessName,
        email: negotiation.supplierId.email,
        phoneNumber: negotiation.supplierId.phoneNumber,
        location: negotiation.supplierId.location,
        accountType: negotiation.supplierId.accountType
      }
    });
    // Calculate tax and net amount (using 10% tax rate)
    const taxRate = 0.1;
    const taxAmount = totalPrice * taxRate;
    const netAmount = totalPrice + taxAmount;

    // Create the corresponding invoice
    const newInvoice = new Invoice({
      order: newOrder._id,
      invoiceNumber,
      totalAmount: totalPrice,
      taxAmount,
      netAmount,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'Generated',
      billingDetails: {
        healthFacilityName: req.user.businessName,
        healthFacilityAddress: deliveryDetails.address,
      },
      rfqId,
      orderDetails: {
        orderNumber: newOrder.orderNumber,
        rfqId: newOrder.rfqId,
        supplierId: newOrder.supplierId,
        negotiationId: newOrder.negotiationId,
        deliveryDetails: newOrder.deliveryDetails,
        totalPrice: newOrder.totalPrice,
        negotiationDetails: newOrder.negotiationDetails,
        rfqDetails: newOrder.rfqDetails,
        supplierDetails: newOrder.supplierDetails,
      },
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

    // Update the RFQ status
    await RFQ.findByIdAndUpdate(
      rfqId,
      {
        status: 'Negotiated',
        negotiationStatus: 'Completed'
      },
      { session }
    );

    if (!updatedNegotiation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        message: 'Negotiation not found',
      });
    }

    // Save the order and invoice
    await newOrder.save({ session });
    await newInvoice.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Order and Invoice created successfully',
      order: {
        ...newOrder.toObject(),
        negotiationDetails: newOrder.negotiationDetails,
        supplierDetails: newOrder.supplierDetails,
        rfqDetails: newOrder.rfqDetails
      },
      invoice: newInvoice,
      negotiation: updatedNegotiation,
    });
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();

    console.error('Error creating order and invoice:', error);

    res.status(500).json({
      message: error.message || 'Failed to create order and invoice',
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
