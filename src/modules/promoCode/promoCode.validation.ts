import Joi from 'joi';

const objectIdSchema = Joi.string().hex().length(24);

export const createPromoCodeSchema = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': 'Promo code is required'
  }),
  discountPercentage: Joi.number().min(1).max(100).required().messages({
    'number.min': 'Discount must be at least 1%',
    'number.max': 'Discount cannot exceed 100%',
    'any.required': 'Discount percentage is required'
  }),
  maxUses: Joi.number().min(1).required().messages({
    'number.min': 'Max uses must be at least 1',
    'any.required': 'Max uses is required'
  }),
  applicableTo: Joi.object({
    type: Joi.string().valid('all', 'specific').default('all'),
    courses: Joi.array().items(objectIdSchema).default([]),
    initiativePackages: Joi.array().items(
      Joi.object({
        initiativeId: objectIdSchema.required(),
        packageId: Joi.string().required()
      })
    ).default([])
  }).default({ type: 'all', courses: [], initiativePackages: [] }),
  isActive: Joi.boolean().default(true)
});

export const updatePromoCodeSchema = Joi.object({
  code: Joi.string(),
  discountPercentage: Joi.number().min(1).max(100),
  maxUses: Joi.number().min(1),
  applicableTo: Joi.object({
    type: Joi.string().valid('all', 'specific'),
    courses: Joi.array().items(objectIdSchema).default([]),
    initiativePackages: Joi.array().items(
      Joi.object({
        initiativeId: objectIdSchema.required(),
        packageId: Joi.string().required()
      })
    ).default([])
  }),
  isActive: Joi.boolean()
}).min(1);

export const validatePromoCodeSchema = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': 'Promo code is required'
  }),
  itemType: Joi.string().valid('course', 'initiativePackage').required(),
  itemId: Joi.string().required(),
  packageId: Joi.string().allow('', null)
});
