import Order from '../models/Order.js';
import RFQ from '../models/RFQ.js';

// @desc    Create Order from Awarded RFQ
// @route   POST /api/order/create-from-rfq/:rfqId
export const createOrderFromRFQ = async (req, res) => {
  try {
    // Find the RFQ
    const rfq = await RFQ.findOne({ 
      _id: req.params.rfqId, 
      createdBy: req.user._id,
      status: 'Awarded'
    });

    if (!rfq) {
      return res.status(404).json({ 
        message: 'No awarded RFQ found' 
      });
    }

    // Find the selected negotiation
    const selectedNegotiation = rfq.negotiations.find(
      neg => neg.status === 'Selected'
    );

    if (!selectedNegotiation) {
      return res.status(400).json({ 
        message: 'No selected negotiation found' 
      });
    }

    // Create order object
    const orderData = {
      rfqId: rfq._id,
      supplierId: selectedNegotiation.supplierId,
      createdBy: req.user._id,
      items: selectedNegotiation.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        agreedPrice: item.quotedPrice
      })),
      totalAmount: selectedNegotiation.totalQuotePrice,
      deliveryTimeframe: selectedNegotiation.deliveryTimeframe,
      status: 'Pending',
      orderNumber: `ORDER-${Date.now()}`,
      billingAddress: req.body.billingAddress || {},
      shippingAddress: req.body.shippingAddress || {}
    };

    // Create the order
    const order = await Order.create(orderData);

    // Update RFQ status
    rfq.status = 'Ordered';
    await rfq.save();

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Order Creation Error:', error);
    res.status(400).json({ 
      message: error.message || 'Order creation failed' 
    });
  }
};

// @desc    Get Order by ID
// @route   GET /api/order/:id
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      $or: [
        { createdBy: req.user._id },
        { supplierId: req.user._id }
      ]
    }).populate('items.itemId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Failed to retrieve order' 
    });
  }
};

// @desc    Get All Orders
// @route   GET /api/orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({ 
      $or: [
        { createdBy: req.user._id },
        { supplierId: req.user._id }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('items.itemId');

    res.json({
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Failed to retrieve orders' 
    });
  }
};

// @desc    Update Order Status
// @route   PATCH /api/order/:id/status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      'Pending', 
      'Processing', 
      'Shipped', 
      'Delivered', 
      'Cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid order status' 
      });
    }

    const order = await Order.findOneAndUpdate(
      { 
        _id: req.params.id, 
        $or: [
          { createdBy: req.user._id },
          { supplierId: req.user._id }
        ]
      },
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Order status update failed' 
    });
  }
};

// @desc    Cancel Order
// @route   PATCH /api/order/:id/cancel
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { 
        _id: req.params.id, 
        createdBy: req.user._id,
        status: { $in: ['Pending', 'Processing'] }
      },
      { 
        status: 'Cancelled',
        cancellationReason: req.body.reason || 'User requested cancellation'
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled. It may have already been processed.' 
      });
    }

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Order cancellation failed' 
    });
  }
};