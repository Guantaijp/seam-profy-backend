import mongoose from 'mongoose';
import CreditRequest from '../models/Credit.js';
import Order from '../models/Order.js';
import Counter from '../models/Counter.js';

const getNextCreditRequestNumber = async () => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { sequenceName: 'creditRequestNumber' },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true }
    );
    return `CRD-${counter.sequenceValue.toString().padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating credit request number:', error);
    throw new Error('Failed to generate credit request number');
  }
};

export const createCreditRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      orderId,
      amount,
      interestRate,
      termMonths,
      allowEarlyRepayment = true
    } = req.body;

    // Validate required fields
    if (!orderId || !amount || !interestRate || !termMonths) {
      return res.status(400).json({
        message: 'Missing required fields',
        requiredFields: ['orderId', 'amount', 'interestRate', 'termMonths']
      });
    }

    // Find the order and verify it exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if credit request already exists for this order
    const existingCreditRequest = await CreditRequest.findOne({ orderId });
    if (existingCreditRequest) {
      return res.status(400).json({ 
        message: 'Credit request already exists for this order',
        existingRequestId: existingCreditRequest._id 
      });
    }

    // Verify the health facility making the request owns the order
    if (order.healthFacilityId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to request credit for this order' });
    }

    // Calculate repayment amount
    const monthlyInterest = interestRate / 100;
    const totalInterest = amount * monthlyInterest * termMonths;
    const repaymentAmount = amount + totalInterest;

    // Generate credit request number
    const creditRequestNumber = await getNextCreditRequestNumber();

    // Create new credit request
    const newCreditRequest = new CreditRequest({
      creditRequestNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      healthFacilityId: req.user._id,
      amount,
      interestRate,
      termMonths,
      repaymentAmount,
      allowEarlyRepayment
    });

    await newCreditRequest.save({ session });

    // Update order payment status
    await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus: 'Pending' },
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      message: 'Credit request created successfully',
      creditRequest: newCreditRequest
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating credit request:', error);
    res.status(500).json({
      message: 'Failed to create credit request',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

export const getMyCreditRequests = async (req, res) => {
  try {
    const healthFacilityId = req.user._id;

    // Fetch all credit requests for the health facility
    const creditRequests = await CreditRequest.find({ healthFacilityId })
      .sort({ createdAt: -1 });

    // Calculate summaries
    const summary = {
      totalRequests: creditRequests.length,
      totalAmount: 0,
      totalPaid: 0,
      totalRemaining: 0,
      status: {
        pending: 0,
        approved: 0,
        paid: 0,
        overdue: 0
      }
    };

    creditRequests.forEach(request => {
      summary.totalAmount += request.repaymentAmount;
      summary.totalPaid += request.paidAmount;
      summary.totalRemaining += (request.repaymentAmount - request.paidAmount);
      summary.status[request.status.toLowerCase()]++;
    });

    // Group requests by status
    const grouped = {
      active: creditRequests.filter(req => ['Approved', 'Overdue'].includes(req.status)),
      completed: creditRequests.filter(req => req.status === 'Paid'),
      pending: creditRequests.filter(req => req.status === 'Pending')
    };

    res.json({
      summary,
      requests: grouped
    });

  } catch (error) {
    console.error('Error fetching credit requests:', error);
    res.status(500).json({
      message: 'Failed to fetch credit requests',
      error: error.message
    });
  }
};

export const updateCreditRequestStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { creditRequestId } = req.params;
    const { newStatus } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'paid', 'overdue'];

    // Validate the new status
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ message: `Invalid status: ${newStatus}` });
    }

    // Fetch the credit request
    const creditRequest = await CreditRequest.findById(creditRequestId);
    if (!creditRequest) {
      return res.status(404).json({ message: 'Credit request not found' });
    }

    // Update the status
    creditRequest.status = newStatus;

    // Save the updated credit request
    await creditRequest.save({ session });

    // Commit the transaction
    await session.commitTransaction();

    res.json({
      message: `Credit request status updated to ${newStatus} successfully`,
      creditRequest,
    });
  } catch (error) {
    // Rollback the transaction in case of an error
    await session.abortTransaction();
    console.error('Error updating credit request status:', error);
    res.status(500).json({
      message: 'Failed to update credit request status',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};



export const makePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { creditRequestId } = req.params;
    const { amount, paymentMethod, transactionId } = req.body;

    const creditRequest = await CreditRequest.findById(creditRequestId);
    if (!creditRequest) {
      return res.status(404).json({ message: 'Credit request not found' });
    }

    if (creditRequest.status !== 'Approved' && creditRequest.status !== 'Overdue') {
      return res.status(400).json({ message: 'Credit request is not active' });
    }

    // Validate early repayment
    const remainingAmount = creditRequest.repaymentAmount - creditRequest.paidAmount;
    if (!creditRequest.allowEarlyRepayment && amount > remainingAmount) {
      return res.status(400).json({ message: 'Early repayment is not allowed' });
    }

    // Process payment
    creditRequest.paidAmount += amount;
    creditRequest.lastPaymentDate = new Date();
    creditRequest.paymentHistory.push({
      amount,
      date: new Date(),
      paymentMethod,
      transactionId
    });

    // Update status
    if (creditRequest.paidAmount >= creditRequest.repaymentAmount) {
      creditRequest.status = 'Paid';
      await Order.findByIdAndUpdate(
        creditRequest.orderId,
        { paymentStatus: 'Paid' },
        { session }
      );
    } else if (new Date() > creditRequest.dueDate) {
      creditRequest.status = 'Overdue';
    }

    await creditRequest.save({ session });
    await session.commitTransaction();

    res.json({
      message: 'Payment processed successfully',
      creditRequest
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error processing payment:', error);
    res.status(500).json({
      message: 'Failed to process payment',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

export const getAllCreditRequests = async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;
  
      // Create a filter based on the status, if provided
      const filter = status ? { status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() } : {};
  
      // Calculate pagination values
      const skip = (page - 1) * limit;
  
      // Fetch all credit requests
      const allCreditRequests = await CreditRequest.find(filter)
        .sort({ createdAt: -1 })
        .populate('orderId', 'orderNumber')
        .populate('healthFacilityId', 'name');
  
      // Calculate summaries for all requests
      const summary = {
        totalRequests: allCreditRequests.length,
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        status: {
          pending: 0,
          approved: 0,
          paid: 0,
          overdue: 0
        }
      };
  
      allCreditRequests.forEach(request => {
        summary.totalAmount += request.repaymentAmount;
        summary.totalPaid += request.paidAmount;
        summary.totalRemaining += (request.repaymentAmount - request.paidAmount);
        summary.status[request.status.toLowerCase()]++;
      });
  
      // Group all requests by status
      const grouped = {
        active: allCreditRequests.filter(req => ['Approved', 'Overdue'].includes(req.status)),
        completed: allCreditRequests.filter(req => req.status === 'Paid'),
        pending: allCreditRequests.filter(req => req.status === 'Pending')
      };
  
      // Apply pagination to the filtered requests
      const paginatedRequests = allCreditRequests.slice(skip, skip + Number(limit));
  
      res.json({
        message: 'Credit requests retrieved successfully',
        summary,
        requests: grouped,
        pagination: {
          totalRequests: allCreditRequests.length,
          currentPage: Number(page),
          totalPages: Math.ceil(allCreditRequests.length / limit),
          limit: Number(limit)
        },
        currentPageRequests: paginatedRequests
      });
  
    } catch (error) {
      console.error('Error fetching all credit requests:', error);
      res.status(500).json({
        message: 'Failed to fetch credit requests',
        error: error.message
      });
    }
  };