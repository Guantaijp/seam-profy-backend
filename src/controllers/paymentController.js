import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import { generateInvoicePDF } from '../middleware/generateInvoicePDF.js';
import path from 'path';
import fs from 'fs';

// Create a new payment for an order
export const createPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      orderId, 
      amount, 
      paymentMethod, 
      dueDate, 
      notes 
    } = req.body;

    // Find the order to ensure it exists and get related details
    const order = await Order.findById(orderId);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Order not found' });
    }

    // Validate that payment amount matches order total
    if (amount !== order.totalPrice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Payment amount must match order total',
        orderTotal: order.totalPrice,
        providedAmount: amount 
      });
    }

    // Create new payment
    const newPayment = new Payment({
      order: orderId,
      amount,
      paymentMethod,
      dueDate: new Date(dueDate),
      healthFacility: order.healthFacilityId,
      supplier: order.supplierId,
      notes
    });

    // Update order payment status
    order.paymentStatus = 'Invoiced';

    // Save payment and update order
    await newPayment.save({ session });
    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Payment created successfully',
      payment: newPayment,
      order
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();

    console.error('Error creating payment:', error);
    res.status(500).json({
      message: 'Failed to create payment',
      error: error.message
    });
  }
};

// Get payments for a health facility
export const getHealthFacilityPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ 
      healthFacility: req.user._id 
    })
    .populate('order')
    .populate('supplier', 'businessName')
    .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Health facility payments retrieved successfully',
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('Error retrieving health facility payments:', error);
    res.status(500).json({
      message: 'Failed to retrieve payments',
      error: error.message
    });
  }
};

// Get payments for a supplier
export const getSupplierPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ 
      supplier: req.user._id 
    })
    .populate('order')
    .populate('healthFacility', 'businessName')
    .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Supplier payments retrieved successfully',
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('Error retrieving supplier payments:', error);
    res.status(500).json({
      message: 'Failed to retrieve payments',
      error: error.message
    });
  }
};

// Mark payment as paid
export const markPaymentAsPaid = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { paymentId } = req.params;
    const { paymentProof } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status
    payment.paymentStatus = 'Paid';
    payment.paymentDate = new Date();
    payment.paymentProof = paymentProof;

    // Update related order payment status
    const order = await Order.findById(payment.order);
    order.paymentStatus = 'Paid';

    // Save updates
    await payment.save({ session });
    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Payment marked as paid successfully',
      payment,
      order
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();

    console.error('Error marking payment as paid:', error);
    res.status(500).json({
      message: 'Failed to mark payment as paid',
      error: error.message
    });
  }
};

// Download Invoice
export const downloadInvoice = async (req, res) => {
    try {
      const { paymentId } = req.params;
  
      // Find the payment and populate necessary details
      const payment = await Payment.findById(paymentId)
        .populate('order')
        .populate('healthFacility', 'businessName')
        .populate('supplier', 'businessName');
  
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
  
      // Check user authorization
      const isAuthorized = 
        payment.healthFacility._id.toString() === req.user._id.toString() ||
        payment.supplier._id.toString() === req.user._id.toString();
  
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Unauthorized to download this invoice' });
      }
  
      // Generate invoice PDF
      const invoicePath = await generateInvoicePDF(payment, payment.order);
  
      // Send the file for download
      res.download(invoicePath, `invoice-${payment.invoiceNumber}.pdf`, (err) => {
        if (err) {
          console.error('Download error:', err);
          return res.status(500).json({ 
            message: 'Error downloading invoice', 
            error: err.message 
          });
        }
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      res.status(500).json({
        message: 'Failed to download invoice',
        error: error.message
      });
    }
  };
  
  // Clean up old invoices (optional maintenance route)
  export const cleanupInvoices = async (req, res) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Find payments older than 30 days
      const oldPayments = await Payment.find({
        createdAt: { $lt: thirtyDaysAgo }
      });
  
      let deletedFiles = 0;
  
      for (const payment of oldPayments) {
        const invoicePath = path.join('uploads', 'invoices', `invoice-${payment.invoiceNumber}.pdf`);
        
        // Delete invoice file if it exists
        if (fs.existsSync(invoicePath)) {
          fs.unlinkSync(invoicePath);
          deletedFiles++;
        }
      }
  
      res.status(200).json({
        message: 'Invoice cleanup completed',
        deletedFiles
      });
    } catch (error) {
      console.error('Error cleaning up invoices:', error);
      res.status(500).json({
        message: 'Failed to cleanup invoices',
        error: error.message
      });
    }
  };