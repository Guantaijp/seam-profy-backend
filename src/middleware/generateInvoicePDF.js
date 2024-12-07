import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export const generateInvoicePDF = async (payment, order) => {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Embed the standard Helvetica font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Create a page
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 12;

  // Colors
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.9, 0.9, 0.9);

  // Page margins
  const margin = 50;

  // Header
  page.drawText('TAX INVOICE', {
    x: margin,
    y: height - margin,
    size: 18,
    font: fontBold,
    color: darkGray
  });

  // Invoice Details
  page.drawText(`Invoice Number: ${payment.invoiceNumber}`, {
    x: margin,
    y: height - margin - 50,
    size: fontSize,
    font: font,
    color: darkGray
  });

  page.drawText(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`, {
    x: margin,
    y: height - margin - 70,
    size: fontSize,
    font: font,
    color: darkGray
  });

  // Billing Information
  page.drawText('Bill From:', {
    x: margin,
    y: height - margin - 120,
    size: fontSize,
    font: fontBold,
    color: darkGray
  });

  page.drawText(`Supplier: ${payment.supplier.businessName || 'Supplier Name'}`, {
    x: margin,
    y: height - margin - 140,
    size: fontSize,
    font: font,
    color: darkGray
  });

  page.drawText('Bill To:', {
    x: width / 2,
    y: height - margin - 120,
    size: fontSize,
    font: fontBold,
    color: darkGray
  });

  page.drawText(`Health Facility: ${payment.healthFacility.businessName || 'Health Facility Name'}`, {
    x: width / 2,
    y: height - margin - 140,
    size: fontSize,
    font: font,
    color: darkGray
  });

  // Order Details
  page.drawRectangle({
    x: margin,
    y: height - margin - 220,
    width: width - 2 * margin,
    height: 30,
    color: lightGray
  });

  page.drawText('Order Details', {
    x: margin + 10,
    y: height - margin - 240,
    size: fontSize,
    font: fontBold,
    color: darkGray
  });

  // Order Line Items
  const orderItems = [
    `Order Number: ${order.orderNumber}`,
    `Total Amount: $${payment.amount.toFixed(2)}`,
    `Payment Method: ${payment.paymentMethod}`,
    `Due Date: ${new Date(payment.dueDate).toLocaleDateString()}`,
    `Payment Status: ${payment.paymentStatus}`
  ];

  orderItems.forEach((item, index) => {
    page.drawText(item, {
      x: margin + 10,
      y: height - margin - 270 - (index * 20),
      size: fontSize,
      font: font,
      color: darkGray
    });
  });

  // Footer
  page.drawText('Thank you for your business', {
    x: margin,
    y: margin,
    size: fontSize,
    font: fontBold,
    color: darkGray
  });

  // Serialize the PDFDocument to bytes
  const pdfBytes = await pdfDoc.save();

  // Generate a unique filename
  const filename = `invoice-${payment.invoiceNumber}.pdf`;
  const filepath = path.join('uploads', 'invoices', filename);

  // Ensure the directory exists
  fs.mkdirSync(path.dirname(filepath), { recursive: true });

  // Write the PDF to a file
  fs.writeFileSync(filepath, pdfBytes);

  return filepath;
};