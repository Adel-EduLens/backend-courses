import Joi from 'joi';

const objectIdSchema = Joi.string().hex().length(24);

const initiativeCourseSchema = Joi.object({
  _id: objectIdSchema,
  title: Joi.string().required().messages({
    'string.empty': 'Track title is required',
    'any.required': 'Track title is required'
  }),
  description: Joi.string().required().messages({
    'string.empty': 'Track description is required',
    'any.required': 'Track description is required'
  }),
  img: Joi.string().required().messages({
    'string.empty': 'Track image is required',
    'any.required': 'Track image is required'
  }),
  price: Joi.number().min(0).default(0).messages({
    'number.min': 'Track price cannot be negative'
  })
}).unknown(true);

export const createInitiativeCourseSchema = initiativeCourseSchema.fork(['_id'], (schema) => schema.forbidden());

export const updateInitiativeCourseSchema = initiativeCourseSchema.min(1);

const initiativePackageSchema = Joi.object({
  _id: objectIdSchema,
  title: Joi.string().required().messages({
    'string.empty': 'Package title is required',
    'any.required': 'Package title is required'
  }),
  description: Joi.string().allow('', null),
  type: Joi.string().valid('custom', 'full').required().messages({
    'any.only': 'Package type must be either custom or full',
    'any.required': 'Package type is required'
  }),
  price: Joi.number().min(0).default(0).messages({
    'number.min': 'Package price cannot be negative'
  }),
  isRecommended: Joi.boolean().default(false),
  maxCourses: Joi.when('type', {
    is: 'custom',
    then: Joi.number().min(1).required().messages({
      'number.min': 'Custom package must allow at least 1 course',
      'any.required': 'Max courses is required for custom packages'
    }),
    otherwise: Joi.forbidden()
  }),
  features: Joi.array().items(Joi.string().trim()).default([]),
  courses: Joi.array().items(initiativeCourseSchema).required().messages({
    'any.required': 'Package must have courses'
  })
}).unknown(true);

export const createInitiativeSchema = Joi.object({
  title: Joi.string().required().messages({
    'string.empty': 'Initiative title is required',
    'any.required': 'Initiative title is required'
  }),
  description: Joi.string().required().messages({
    'string.empty': 'Initiative description is required',
    'any.required': 'Initiative description is required'
  }),
  img: Joi.string().required().messages({
    'string.empty': 'Initiative image is required',
    'any.required': 'Initiative image is required'
  }),
  tracks: Joi.array().items(initiativeCourseSchema).default([]),
  packages: Joi.array().items(initiativePackageSchema).default([]),
  startDate: Joi.date().iso().required().messages({
    'any.required': 'Start date is required',
    'date.format': 'Start date must be a valid date'
  }),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
    'any.required': 'End date is required',
    'date.greater': 'End date must be after the start date',
    'date.format': 'End date must be a valid date'
  })
}).unknown(true);

export const updateInitiativeSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  img: Joi.string(),
  tracks: Joi.array().items(initiativeCourseSchema),
  packages: Joi.array().items(initiativePackageSchema),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso()
}).unknown(true);

export const enrollInitiativeSchema = Joi.object({
  initiativeId: objectIdSchema.required(),
  enrollmentTarget: Joi.string().valid('track', 'package').required(),
  packageId: Joi.when('enrollmentTarget', {
    is: 'package',
    then: objectIdSchema.required(),
    otherwise: Joi.forbidden()
  }),
  trackId: Joi.when('enrollmentTarget', {
    is: 'track',
    then: objectIdSchema.required(),
    otherwise: Joi.forbidden()
  }),
  selectedCourseIds: Joi.when('enrollmentTarget', {
    is: 'package',
    then: Joi.array().items(objectIdSchema).default([]),
    otherwise: Joi.forbidden()
  }),
  additionalInfo: Joi.string().allow('', null),
  promoCode: Joi.string().allow('', null)
});
