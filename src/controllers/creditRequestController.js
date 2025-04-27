import mongoose from "mongoose"
import CreditRequest from "../models/Credit.js"
import Order from "../models/Order.js"
import Counter from "../models/Counter.js"
import moment from "moment"
import Invoice from "../models/Invoice.js"
import User from "../models/User.js"

const getNextCreditRequestNumber = async () => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { sequenceName: "creditRequestNumber" },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true },
    )
    return `CRD-${counter.sequenceValue.toString().padStart(6, "0")}`
  } catch (error) {
    console.error("Error generating credit request number:", error)
    throw new Error("Failed to generate credit request number")
  }
}

export const createCreditRequest = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const {
      orderId,
      amount,
      interestRate,
      termMonths,
      allowEarlyRepayment = true,
      paymentDates = [],
      installmentAmounts = [],
      paymentOption,
    } = req.body

    // Validate required fields
    if (!orderId || !amount || interestRate === undefined || !termMonths) {
      return res.status(400).json({
        message: "Missing required fields",
        requiredFields: ["orderId", "amount", "interestRate", "termMonths"],
      })
    }

    // Find the order and verify it exists
    const order = await Order.findById(orderId).catch(() => null)

    // If order doesn't exist, create a placeholder order for invoice payments
    let orderToUse = order
    if (!orderToUse) {
      // Check if this is an invoice payment
      const invoice = await Invoice.findById(orderId).catch(() => null)

      if (invoice) {
        // Create a temporary order object
        orderToUse = {
          _id: invoice._id,
          orderNumber: invoice.invoiceNumber || `INV-${invoice._id.toString().substring(0, 6)}`,
          healthFacilityId: invoice.healthFacilityId || req.user._id,
        }
      } else {
        // Neither order nor invoice found
        return res.status(404).json({ message: "Order or Invoice not found" })
      }
    }

    // Check if credit request already exists for this order
    const existingCreditRequest = await CreditRequest.findOne({ orderId })
    if (existingCreditRequest) {
      return res.status(400).json({
        message: "Credit request already exists for this order",
        existingRequestId: existingCreditRequest._id,
      })
    }

    // Verify the health facility making the request owns the order
    if (orderToUse.healthFacilityId && orderToUse.healthFacilityId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized to request credit for this order" })
    }

    // Calculate credit score
    const creditScoreResult = await calculateCreditScore(req.user._id, req.user)
    const creditScore = creditScoreResult.score

    // Determine status based on credit score - FIXED: Using capitalized status values
    const status = creditScore > 80 ? "Approved" : "Pending"

    // Calculate repayment amount based on interest rate and term
    const monthlyInterest = interestRate / 100
    const totalInterest = amount * monthlyInterest * termMonths
    const repaymentAmount = amount + totalInterest

    // Generate credit request number
    const creditRequestNumber = await getNextCreditRequestNumber()

    // Process payment dates
    let processedPaymentDates = []

    if (paymentDates && paymentDates.length > 0) {
      // Use provided payment dates
      processedPaymentDates = paymentDates.map((date) => new Date(date))
    } else if (paymentOption === "30days") {
      // Set a date 30 days from now
      processedPaymentDates = [moment().add(30, "days").toDate()]
    } else {
      // Default: create dates 30, 60, 90 days from now based on term months
      for (let i = 0; i < termMonths; i++) {
        processedPaymentDates.push(
          moment()
            .add((i + 1) * 30, "days")
            .toDate(),
        )
      }
    }

    // Create new credit request with credit score and status
    const newCreditRequest = new CreditRequest({
      creditRequestNumber,
      orderId: orderToUse._id,
      orderNumber: orderToUse.orderNumber,
      healthFacilityId: req.user._id,
      amount,
      interestRate,
      termMonths,
      repaymentAmount,
      allowEarlyRepayment,
      creditScore,
      status,
      paymentDates: processedPaymentDates,
      installmentAmounts: installmentAmounts.length > 0 ? installmentAmounts : [repaymentAmount],
      paymentOption: paymentOption || "30days", // Default to 30days if not specified
    })

    await newCreditRequest.save({ session })

    // Update order payment status if it's a real order
    if (order) {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: "Pending" }, { session })
    }

    await session.commitTransaction()

    res.status(201).json({
      message: "Credit request created successfully",
      creditRequest: newCreditRequest,
    })
  } catch (error) {
    await session.abortTransaction()
    console.error("Error creating credit request:", error)
    res.status(500).json({
      message: "Failed to create credit request",
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}

export const getMyCreditRequests = async (req, res) => {
  try {
    const healthFacilityId = req.user._id

    // Fetch all credit requests for the health facility
    const creditRequests = await CreditRequest.find({ healthFacilityId }).sort({ createdAt: -1 })

    // Calculate current credit score
    const currentCreditScore = await calculateCreditScore(healthFacilityId, req.user)

    // Calculate summaries
    const summary = {
      totalRequests: creditRequests.length,
      totalAmount: 0,
      totalPaid: 0,
      totalRemaining: 0,
      currentCreditScore: currentCreditScore.score,
      status: {
        pending: 0,
        approved: 0,
        paid: 0,
        overdue: 0,
        rejected: 0,
      },
    }

    creditRequests.forEach((request) => {
      summary.totalAmount += request.repaymentAmount
      summary.totalPaid += request.paidAmount
      summary.totalRemaining += request.repaymentAmount - request.paidAmount

      // Convert status to lowercase for the summary
      const statusLower = request.status.toLowerCase()
      summary.status[statusLower]++
    })

    // Group requests by individual status - FIXED: Using capitalized status values for filtering
    const grouped = {
      pending: creditRequests.filter((req) => req.status === "Pending"),
      approved: creditRequests.filter((req) => req.status === "Approved"),
      paid: creditRequests.filter((req) => req.status === "Paid"),
      overdue: creditRequests.filter((req) => req.status === "Overdue"),
      rejected: creditRequests.filter((req) => req.status === "Rejected"),
    }

    res.json({
      summary,
      requests: grouped,
    })
  } catch (error) {
    console.error("Error fetching credit requests:", error)
    res.status(500).json({
      message: "Failed to fetch credit requests",
      error: error.message,
    })
  }
}

export const getAllCreditRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query

    // Create a filter based on the status, if provided - FIXED: Capitalize first letter of status
    const filter = status ? { status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() } : {}

    // Calculate pagination values
    const skip = (page - 1) * limit

    // Fetch all credit requests
    const allCreditRequests = await CreditRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("orderId", "orderNumber")
      .populate("healthFacilityId", "name")

    // Update credit scores for all requests if admin
    if (req.user.accountType === "Admin") {
      for (const request of allCreditRequests) {
        const creditScore = await calculateCreditScore(request.healthFacilityId, req.user)
        request.currentCreditScore = creditScore.score
      }
    }

    // Calculate summaries
    const summary = {
      totalRequests: allCreditRequests.length,
      totalAmount: 0,
      totalPaid: 0,
      totalRemaining: 0,
      status: {
        pending: 0,
        approved: 0,
        paid: 0,
        overdue: 0,
      },
    }

    allCreditRequests.forEach((request) => {
      summary.totalAmount += request.repaymentAmount
      summary.totalPaid += request.paidAmount
      summary.totalRemaining += request.repaymentAmount - request.paidAmount

      // Convert status to lowercase for the summary
      const statusLower = request.status.toLowerCase()
      summary.status[statusLower]++
    })

    // Group all requests by status - FIXED: Using capitalized status values for filtering
    const grouped = {
      active: allCreditRequests.filter((req) => ["Approved", "Overdue"].includes(req.status)),
      completed: allCreditRequests.filter((req) => req.status === "Paid"),
      pending: allCreditRequests.filter((req) => req.status === "Pending"),
    }

    // Apply pagination to the filtered requests
    const paginatedRequests = allCreditRequests.slice(skip, skip + Number(limit))

    res.json({
      message: "Credit requests retrieved successfully",
      summary,
      requests: grouped,
      pagination: {
        totalRequests: allCreditRequests.length,
        currentPage: Number(page),
        totalPages: Math.ceil(allCreditRequests.length / limit),
        limit: Number(limit),
      },
      currentPageRequests: paginatedRequests,
    })
  } catch (error) {
    console.error("Error fetching all credit requests:", error)
    res.status(500).json({
      message: "Failed to fetch credit requests",
      error: error.message,
    })
  }
}

export const updateCreditRequestStatus = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { creditRequestId } = req.params
    const { newStatus } = req.body

    // FIXED: Using capitalized status values
    const validStatuses = ["Pending", "Approved", "Rejected", "Paid", "Overdue"]

    // Capitalize the first letter of the status
    const formattedStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase()

    // Validate the new status
    if (!validStatuses.includes(formattedStatus)) {
      return res.status(400).json({ message: `Invalid status: ${newStatus}` })
    }

    // Fetch the credit request
    const creditRequest = await CreditRequest.findById(creditRequestId)
    if (!creditRequest) {
      return res.status(404).json({ message: "Credit request not found" })
    }

    // Update the status
    creditRequest.status = formattedStatus

    // Save the updated credit request
    await creditRequest.save({ session })

    // Commit the transaction
    await session.commitTransaction()

    res.json({
      message: `Credit request status updated to ${formattedStatus} successfully`,
      creditRequest,
    })
  } catch (error) {
    // Rollback the transaction in case of an error
    await session.abortTransaction()
    console.error("Error updating credit request status:", error)
    res.status(500).json({
      message: "Failed to update credit request status",
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}

// Modified calculateCreditScore function with admin access
export const calculateCreditScore = async (healthFacilityId, requestingUser) => {
  try {
    // First verify the health facility exists
    const facilityDetails = await User.findOne({
      _id: healthFacilityId,
    })

    // More specific error handling for facility validation
    if (!facilityDetails) {
      throw new Error("Healthcare Facility not found")
    }

    // Check if user is authorized (either admin or the facility itself)
    if (requestingUser.accountType !== "Admin" && facilityDetails.accountType !== "Healthcare Facility") {
      throw new Error("Invalid account type - must be a Healthcare Facility or Admin")
    }

    // Fetch necessary data for scoring with error handling
    const [pastInvoices, pastOrders, pastFinancing] = await Promise.all([
      Invoice.find({ healthFacilityId }),
      Order.find({
        healthFacilityId,
        createdAt: { $gte: moment().subtract(3, "months").toDate() },
      }),
      CreditRequest.find({ healthFacilityId }),
    ])

    let score = 0

    // [Previous scoring logic remains the same]
    // a. Past Invoice Repayment History (30%)
    const totalInvoices = pastInvoices.length
    if (totalInvoices > 0) {
      const onTimeInvoices = pastInvoices.filter((invoice) => invoice.isPaidOnTime).length
      const repaymentHistoryPercentage = (onTimeInvoices / totalInvoices) * 100

      if (repaymentHistoryPercentage >= 90) score += 30
      else if (repaymentHistoryPercentage >= 70) score += 20
      else if (repaymentHistoryPercentage >= 50) score += 10
    }

    // b. Past Order Values (20%)
    const totalOrderValue = pastOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    if (totalOrderValue >= 100000) score += 20
    else if (totalOrderValue >= 50000) score += 15
    else if (totalOrderValue >= 25000) score += 10
    else score += 5

    // c. Ordering Frequency (15%)
    const months = 3
    const averageOrdersPerMonth = pastOrders.length / months
    if (averageOrdersPerMonth >= 10) score += 15
    else if (averageOrdersPerMonth >= 5) score += 10
    else if (averageOrdersPerMonth >= 1) score += 5

    // d. Number of Years in Business (10%)
    const registrationDate = facilityDetails.registrationDate || facilityDetails.createdAt
    const yearsInBusiness = moment().diff(registrationDate, "years")
    if (yearsInBusiness >= 5) score += 10
    else if (yearsInBusiness >= 3) score += 7
    else if (yearsInBusiness >= 1) score += 5

    // e. Past Financing History (15%)
    const totalRequests = pastFinancing.length
    if (totalRequests > 0) {
      // FIXED: Using capitalized status values for filtering
      const successfullyPaidRequests = pastFinancing.filter((request) => request.status === "Paid").length
      const financingHistoryPercentage = (successfullyPaidRequests / totalRequests) * 100

      if (financingHistoryPercentage >= 90) score += 15
      else if (financingHistoryPercentage >= 70) score += 10
      else if (financingHistoryPercentage >= 50) score += 5
    }

    // Add admin-specific information to the response
    const response = {
      healthFacilityId,
      score,
      details: {
        facilityName: facilityDetails.name,
        accountType: facilityDetails.accountType,
        totalOrders: pastOrders.length,
        totalInvoices,
        yearsInBusiness,
        lastCalculated: new Date(),
      },
    }

    // Add additional details for admin users
    if (requestingUser.accountType === "Admin") {
      response.details.adminView = {
        registrationDate,
        totalOrderValue,
        averageOrdersPerMonth,
        repaymentHistory: {
          totalInvoices,
          onTimePayments: pastInvoices.filter((invoice) => invoice.isPaidOnTime).length,
        },
        financingHistory: {
          totalRequests,
          // FIXED: Using capitalized status values for filtering
          successfulPayments: pastFinancing.filter((request) => request.status === "Paid").length,
        },
      }
    }

    return response
  } catch (error) {
    const errorMessage = error.message || "Failed to calculate credit score"
    console.error("Error calculating credit score:", {
      healthFacilityId,
      error: errorMessage,
      stack: error.stack,
    })
    throw new Error(errorMessage)
  }
}

// Modified getCreditScore endpoint with admin access
export const getCreditScore = async (req, res) => {
  try {
    // Allow admins to specify a different facility ID
    const healthFacilityId = req.query.facilityId || req.user._id

    // Basic validation
    if (!healthFacilityId) {
      return res.status(400).json({
        message: "Missing health facility ID",
        error: "Facility ID is required",
      })
    }

    // Calculate the credit score with user context
    const creditScore = await calculateCreditScore(healthFacilityId, req.user)

    res.status(200).json({
      success: true,
      message: "Credit score calculated successfully",
      data: creditScore,
    })
  } catch (error) {
    console.error("Error in getCreditScore:", {
      userId: req.user._id,
      error: error.message,
      stack: error.stack,
    })

    // Send appropriate error response based on error type
    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: "Healthcare facility not found",
        error: error.message,
      })
    }

    if (error.message.includes("Invalid account type")) {
      return res.status(403).json({
        success: false,
        message: "Account type not authorized",
        error: error.message,
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to calculate credit score",
      error: error.message,
    })
  }
}
