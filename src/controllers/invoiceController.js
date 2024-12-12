import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import PDFDocument from 'pdfkit'; // You'll need to install pdfkit: npm install pdfkit
import fs from 'fs';
import path from 'path';

const getNextInvoiceNumber = async () => {
  try {
    const latestInvoice = await Invoice.findOne().sort({ invoiceNumber: -1 });
    const nextNumber = latestInvoice 
      ? parseInt(latestInvoice.invoiceNumber.split('-')[1]) + 1 
      : 1;
    return `INV-${nextNumber.toString().padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw new Error('Failed to generate invoice number');
  }
};

export const generateInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate('healthFacilityId')
      .populate('supplierId')
      .populate('rfqId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ order: orderId });
    if (existingInvoice) {
      return res.status(400).json({ message: 'Invoice already generated for this order' });
    }

    const invoiceNumber = await getNextInvoiceNumber();
    
    // Assuming 10% tax for this example
    const taxRate = 0.1;
    const taxAmount = order.totalPrice * taxRate;
    const netAmount = order.totalPrice + taxAmount;

    const newInvoice = new Invoice({
      order: orderId,
      invoiceNumber,
      totalAmount: order.totalPrice,
      taxAmount,
      netAmount,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      billingDetails: {
        healthFacilityName: order.healthFacilityId.businessName,
        healthFacilityAddress: order.deliveryDetails.address,
        supplierName: order.supplierId.businessName,
        supplierAddress: order.supplierId.location
      }
    });

    await newInvoice.save({ session });

    // Update order's payment status
    await Order.findByIdAndUpdate(orderId, { 
      paymentStatus: 'Invoiced' 
    }, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Invoice generated successfully',
      invoice: newInvoice
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error generating invoice:', error);
    res.status(500).json({
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
      const { invoiceId } = req.params;
      const invoice = await Invoice.findById(invoiceId)
          .populate({
              path: 'order',
              populate: [
                  { path: 'healthFacilityId' },
                  { path: 'supplierId' },
                  { path: 'rfqId' },
                  { path: 'negotiationId' }
              ]
          });

      if (!invoice) {
          return res.status(404).json({ message: 'Invoice not found' });
      }

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const invoiceFileName = `${invoice.invoiceNumber}.pdf`;
      const invoicePath = path.join(process.cwd(), 'invoices', invoiceFileName);

      // Ensure invoices directory exists
      if (!fs.existsSync(path.join(process.cwd(), 'invoices'))) {
          fs.mkdirSync(path.join(process.cwd(), 'invoices'));
      }

      const writeStream = fs.createWriteStream(invoicePath);
      doc.pipe(writeStream);

      // Custom color scheme
      const primaryColor = '#2C3E50';  // Dark blue-gray
      const secondaryColor = '#34495E';  // Slightly lighter blue-gray
      const accentColor = '#1ABC9C';  // Bright teal for highlights
      const textColor = '#2C3E50'; // Consistent text color

      // Add company logo (Top Center)
      const logoPath = path.join(process.cwd(), 'public', 'images', 'Logo1.png');
      if (fs.existsSync(logoPath)) {
          doc.image(logoPath, doc.page.width / 2 - 75, 30, { width: 150 }); // Centered
      }

      doc.moveDown(4);

      // Header
      doc.fillColor(primaryColor)
         .fontSize(25)
         .text(`${invoice.order.supplierDetails.businessName} INVOICE`, { align: 'center' })
         .moveDown(2);

      // Invoice Header Details
      doc.fillColor(textColor)
         .fontSize(12)
         .text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' })
         .text(`Order Number: ${invoice.order.orderNumber}`, { align: 'right' })
         .text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, { align: 'right' })
         .moveDown(2);

      // Negotiation Details Section
      doc.fillColor(primaryColor)
         .fontSize(14)
         .text('Negotiation Details', { underline: true });

      doc.fillColor(textColor)
         .fontSize(12)
         .text(`Delivery Timeframe: ${invoice.order.negotiationDetails.deliveryTimeframe}`)
         .text(`Additional Notes: ${invoice.order.negotiationDetails.additionalNotes}`)
         .moveDown(2);

      // Supplier Details Section
      doc.fillColor(primaryColor)
         .fontSize(14)
         .text('Supplier Details', { underline: true });

      doc.fillColor(textColor)
         .fontSize(12)
         .text(`Business Name: ${invoice.order.supplierDetails.businessName}`)
         .text(`Location: ${invoice.order.supplierDetails.location}`)
         .moveDown(2);

      // Invoice Breakdown Table
      const tableTop = doc.y;
      doc.fillColor(primaryColor)
         .fontSize(14)
         .text('Invoice Breakdown', { underline: true });

      doc.moveDown();

      // Table Headers (removed Specifications and Unit)
const tableHeaders = ['Item Name', 'Quantity', 'Unit Price', 'Total Price'];
const columnWidths = [200, 60, 80, 100];  // Adjusted column widths for better balance

doc.fillColor(secondaryColor)
   .fontSize(12);

// Render the headers
tableHeaders.forEach((header, i) => {
    doc.text(header, i * columnWidths[i] + 50, tableTop + 20, { // Added xMargin to center the header
        width: columnWidths[i],
        align: i === 0 ? 'left' : 'right'
    });
});

// Table Rows for Negotiation Items (removed Specifications and Unit)
const tableData = invoice.order.negotiationDetails.items.map(item => [
    item.itemName,
    item.quantity,
    `Ksh ${item.quotedPrice.toFixed(2)}`,
    `Ksh ${(item.quotedPrice * item.quantity).toFixed(2)}`
]);

doc.fillColor(textColor)
   .fontSize(12);

const xMargin = 50; // Define X-axis margin for alignment

// Render the data rows
tableData.forEach((row, i) => {
    row.forEach((cell, j) => {
        doc.text(cell, xMargin + (j * columnWidths[j]), tableTop + 40 + (i * 20), {
            width: columnWidths[j],
            align: j === 0 ? 'left' : 'right'
        });
    });
});

      // Subtotal, Tax, Total
      const totalAmount = invoice.totalAmount;
      const taxAmount = invoice.taxAmount;
      const netAmount = invoice.netAmount;

      doc.moveDown(2);
      doc.text(`Subtotal: Ksh ${totalAmount.toFixed(2)}`, { align: 'right' })
         .text(`Tax (10%): Ksh ${taxAmount.toFixed(2)}`, { align: 'right' })
         .text(`Total Amount: Ksh ${netAmount.toFixed(2)}`, { align: 'right' })
         .moveDown(3);

      // Footer
      doc.fillColor(accentColor)
         .fontSize(10)
         .text('Thank you for your business!', { align: 'center' })
         .text('All payments are due within 30 days of the invoice date', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
          res.download(invoicePath, invoiceFileName, (err) => {
              if (err) {
                  console.error('Download error:', err);
                  res.status(500).json({ message: 'Download failed' });
              }
          });
      });
  } catch (error) {
      console.error('Error downloading invoice:', error);
      res.status(500).json({
          message: 'Failed to download invoice',
          error: error.message
      });
  }
};




export const getInvoicesByHealthFacility = async (req, res) => {
  try {
    const invoices = await Invoice.find({ 
      'billingDetails.healthFacilityName': req.user.businessName 
    })
    .populate('order')
    .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Invoices retrieved successfully',
      count: invoices.length,
      invoices
    });
  } catch (error) {
    console.error('Error retrieving invoices:', error);
    res.status(500).json({
      message: 'Failed to retrieve invoices',
      error: error.message
    });
  }
};


export const getHealthFacilityInvoices = async (req, res) => {
    try {
      // Find invoices for orders specifically for this health facility
      const invoices = await Invoice.find()
        .populate({
          path: 'order',
          match: { healthFacilityId: req.user._id },
          populate: [
            { path: 'healthFacilityId' },
            { path: 'supplierId' }
          ]
        })
        .sort({ createdAt: -1 });
  
      // Filter out invoices without a matching order
      const filteredInvoices = invoices.filter(invoice => invoice.order !== null);
  
      res.status(200).json({
        message: 'Health facility invoices retrieved successfully',
        count: filteredInvoices.length,
        invoices: filteredInvoices
      });
    } catch (error) {
      console.error('Error retrieving health facility invoices:', error);
      res.status(500).json({
        message: 'Failed to retrieve invoices',
        error: error.message
      });
    }
  };

  export const getSupplierInvoices = async (req, res) => {
    try {
      // Find invoices for orders where the supplier is the current user
      const invoices = await Invoice.find()
        .populate({
          path: 'order',
          match: { supplierId: req.user._id }
        })
        .populate('order')
        .sort({ createdAt: -1 });
  
      // Filter out any invoices where the order population didn't match
      const filteredInvoices = invoices.filter(invoice => invoice.order);
  
      res.status(200).json({
        message: 'Supplier invoices retrieved successfully',
        count: filteredInvoices.length,
        invoices: filteredInvoices
      });
    } catch (error) {
      console.error('Error retrieving supplier invoices:', error);
      res.status(500).json({
        message: 'Failed to retrieve invoices',
        error: error.message
      });
    }
  };