import axios from 'axios';
import Payment from '../models/Payment.js';
import unirest from 'unirest';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import request from 'request';

const { 
  MPESA_CONSUMER_KEY, 
  MPESA_CONSUMER_SECRET, 
  SHORT_CODE, 
  PASSKEY,
  BUSINESS_SHORT_CODE,
  PASS_KEY
} = process.env;

// Generate Access Token
const generateToken = () => {
  const base64AuthEncoded = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  
  return new Promise((resolve, reject) => {
    unirest('GET', 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials')
      .headers({
        'Authorization': `Basic ${base64AuthEncoded}`
      })
      .send()
      .end(response => {
        if (response.error) reject(response.error);
        resolve(response.body.access_token);
      });
  });
};

// Generate MPESA Password
const generateMPESAPassword = (shortCode, passkey, timestamp) => {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
};

// Get Timestamp in required format
const getTimestamp = () => {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
};

// Initiate MPESA Payment
export const initiateMPESAPayment = async (req, res) => {
  try {
    const { phoneNumber, amount, orderId, supplier, healthFacility, dueDate, invoiceNumber, order } = req.body;

    // Validate required fields
    if (!phoneNumber || !amount || !supplier || !healthFacility || !dueDate || !invoiceNumber || !order) {
      return res.status(400).json({ message: 'Phone number, amount, supplier, healthFacility, dueDate, invoiceNumber, and order are required' });
    }

    // Set callback URL
    let callbackUrl = req.app.get('ngrokUrl') || global.ngrokUrl || process.env.NGROK_URL;
    
    if (!callbackUrl) {
      callbackUrl = 'https://de2f-154-159-252-16.ngrok-free.app';
    }

    const formattedPhone = phoneNumber.startsWith('254') ? phoneNumber : `254${phoneNumber.substring(1)}`;
    const timestamp = getTimestamp();
    const password = generateMPESAPassword(SHORT_CODE, PASSKEY, timestamp);
    const accessToken = await generateToken();

    return new Promise((resolve, reject) => {
      unirest('POST', 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest')
        .headers({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        })
        .send(JSON.stringify({
          BusinessShortCode: SHORT_CODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: String(amount),
          PartyA: formattedPhone,
          PartyB: SHORT_CODE,
          PhoneNumber: formattedPhone,
          CallBackURL: `${callbackUrl}/api/mpesa/mpesa/callback-status/${orderId}`,
          AccountReference: orderId || "PaymentRef123",
          TransactionDesc: "Payment for Services"
        }))
        .end(async (response) => {
          if (response.error) {
            console.error('STK Push Error:', response.error);
            console.error('Response Body:', response.body);
            return res.status(500).json({
              message: 'Payment initiation failed',
              error: response.error,
              details: response.body
            });
          }

          try {
            const payment = new Payment({
              phoneNumber: formattedPhone,
              amount,
              transactionId: response.body.CheckoutRequestID,
              status: response.body.ResponseCode === '0' ? 'Paid' : 'pending',
              paymentMethod: 'mpesa',
              orderId,
              supplier,
              healthFacility,
              dueDate,
              invoiceNumber,
              order: orderId
            });
            await payment.save();
            
            res.status(200).json({
              ...response.body,
              callbackUrl: callbackUrl,
              orderId: orderId // Added orderId to the response
            });
          } catch (error) {
            console.error('Error saving payment record:', error);
            res.status(500).json({
              message: 'Error saving payment record',
              error: error.message
            });
          }
        });
    });
  } catch (error) {
    console.error('Error initiating MPESA payment:', error);
    res.status(500).json({
      message: 'Payment initiation failed',
      error: error.message,
    });
  }
};

export const handleCallback = async (req, res) => {
  try {
    const { CheckoutRequestID } = req.body;
    if (!CheckoutRequestID) throw new Error('Missing CheckoutRequestID');

    const timestampString = getTimestamp();
    const password = generateMPESAPassword('174379', PASSKEY, timestampString);
    const accessToken = await generateToken();

    unirest('POST', 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query')
      .headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      })
      .send({
        BusinessShortCode: '174379',
        Password: password,
        Timestamp: timestampString,
        CheckoutRequestID
      })
      .end(async (response) => {
        if (response.error || response.body.errorCode) {
          console.error('Response:', response.body);
          return res.status(400).json({
            success: false,
            message: 'Query failed',
            error: response.body
          });
        }

        const { ResultCode, CheckoutRequestID } = response.body;

        if (ResultCode === "0") {
          // Payment was successful; update Order and Invoice
          try {
            const payment = await Payment.findOne({ transactionId: CheckoutRequestID }); // Fetch associated payment
            if (!payment) {
              return res.status(404).json({ 
                success: false, 
                message: 'Payment not found' 
              });
            }

            await Promise.all([
              Order.findByIdAndUpdate(payment.orderId, { 
                paymentStatus: 'Paid' 
              }),
              Invoice.findOne({ order: payment.orderId }).then(invoice => {
                if (invoice) {
                  invoice.status = 'Paid';
                  return invoice.save();
                }
              })
            ]);

            return res.status(200).json({
              success: true,
              message: 'Payment processed successfully and statuses updated',
              data: response.body
            });
          } catch (dbError) {
            console.error('Database update error:', dbError);
            return res.status(500).json({
              success: false,
              message: 'Payment processed but failed to update database',
              error: dbError.message
            });
          }
        } else {
          // Handle other ResultCode values
          return res.status(200).json({
            success: true,
            message: 'Payment not successful',
            data: response.body
          });
        }
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    
    if (!checkoutRequestId) {
      return res.status(400).json({
        success: false,
        message: 'CheckoutRequestID is required'
      });
    }

    const timestamp = getTimestamp();
    const password = generateMPESAPassword(BUSINESS_SHORT_CODE, PASS_KEY, timestamp);
    const accessToken = await generateToken();

    const response = await axios({
      method: 'POST',
      url: 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        BusinessShortCode: BUSINESS_SHORT_CODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      }
    });

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Confirmation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment confirmation failed',
      error: error.message
    });
  }
};
export const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Payment status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};