import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required'
  }),
  phone: Joi.string().required().messages({
    'string.empty': 'Phone number is required',
    'any.required': 'Phone number is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  })
});

export const verifyOtpSchema = Joi.object({
  phone: Joi.string().required().messages({
    'string.empty': 'Phone number is required',
    'any.required': 'Phone number is required'
  }),
  otpCode: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be 6 digits',
    'string.empty': 'OTP code is required',
    'any.required': 'OTP code is required'
  })
});

export const otpRequestSchema = Joi.object({
  phone: Joi.string().required().messages({
    'string.empty': 'Phone number is required',
    'any.required': 'Phone number is required'
  })
});

export const loginSchema = Joi.object({
  phone: Joi.string().required().messages({
    'string.empty': 'Phone number is required',
    'any.required': 'Phone number is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
});
