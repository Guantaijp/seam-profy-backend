// src/utils/validators.js
const Joi = require('joi');

exports.registerValidation = (data) => {
  const schema = Joi.object({
    accountType: Joi.string().valid('Healthcare Facility', 'Supplier').required(),
    businessType: Joi.string().valid(
      'Chemist', 'Pharmacy', 'Hospital', 
      'Pharmaceutical Supplier', 'Equipment Supplier'
    ).required(),
    businessName: Joi.string().trim().required(),
    location: Joi.string().required(),
    taxId: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  });

  return schema.validate(data);
};