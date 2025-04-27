import mongoose from "mongoose"

const creditRequestSchema = new mongoose.Schema(
  {
    creditRequestNumber: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "orderModel",
    },
    orderModel: {
      type: String,
      required: true,
      enum: ["Order", "Invoice"],
      default: "Order",
    },
    orderNumber: {
      type: String,
      required: true,
    },
    healthFacilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    interestRate: {
      type: Number,
      required: true,
      min: 0,
    },
    termMonths: {
      type: Number,
      required: true,
      min: 1,
    },
    repaymentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Paid", "Overdue"],
      default: "Pending",
    },
    allowEarlyRepayment: {
      type: Boolean,
      default: true,
    },
    creditScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    currentCreditScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    paymentDates: [
      {
        type: Date,
      },
    ],
    installmentAmounts: [
      {
        type: Number,
        min: 0,
      },
    ],
    paymentOption: {
      type: String,
      enum: ["30days", "installments"],
      default: "30days",
    },
    payments: [
      {
        amount: {
          type: Number,
          required: true,
        },
        paymentMethod: {
          type: String,
          required: true,
        },
        transactionReference: String,
        paymentDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notes: {
      type: String,
    },
  },
  { timestamps: true },
)

// Pre-save hook to ensure installment amounts match term months
creditRequestSchema.pre("save", function (next) {
  // If payment option is 30days, ensure we have exactly one installment
  if (this.paymentOption === "30days" && (!this.installmentAmounts || this.installmentAmounts.length !== 1)) {
    this.installmentAmounts = [this.repaymentAmount]
  }

  // For installments, ensure we have the correct number of installments
  if (this.paymentOption === "installments" && this.installmentAmounts.length !== this.termMonths) {
    // This is a validation error - the number of installment amounts should match term months
    return next(new Error("Number of installment amounts must match term months"))
  }

  // Ensure payment dates match the number of installments
  if (this.paymentDates && this.paymentDates.length !== this.installmentAmounts.length) {
    return next(new Error("Number of payment dates must match number of installments"))
  }

  next()
})

// Virtual for remaining amount
creditRequestSchema.virtual("remainingAmount").get(function () {
  return this.repaymentAmount - this.paidAmount
})

// Virtual for payment progress percentage
creditRequestSchema.virtual("paymentProgress").get(function () {
  return (this.paidAmount / this.repaymentAmount) * 100
})

// Virtual for next payment date
creditRequestSchema.virtual("nextPaymentDate").get(function () {
  if (!this.paymentDates || this.paymentDates.length === 0) return null

  const now = new Date()
  const futureDates = this.paymentDates.filter((date) => date > now)
  return futureDates.length > 0 ? futureDates[0] : null
})

// Method to check if payment is overdue
creditRequestSchema.methods.isOverdue = function () {
  if (this.status === "Paid") return false

  const now = new Date()
  if (!this.paymentDates || this.paymentDates.length === 0) return false

  // Check if any payment date is in the past and payment is not complete
  return this.paymentDates.some((date) => date < now) && this.paidAmount < this.repaymentAmount
}

// Index for faster queries
creditRequestSchema.index({ healthFacilityId: 1, status: 1 })
creditRequestSchema.index({ creditRequestNumber: 1 })

const CreditRequest = mongoose.model("CreditRequest", creditRequestSchema)

export default CreditRequest
