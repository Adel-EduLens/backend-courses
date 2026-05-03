import Joi from 'joi';

const objectIdSchema = Joi.string().hex().length(24);

const initiativeCourseSchema = Joi.object({
  _id: objectIdSchema,
  title: Joi.string().required(),
  description: Joi.string().required(),
  img: Joi.string().required(),
  brief: Joi.string().required(),
  price: Joi.number().min(0).default(0)
}).unknown(true);

export const createInitiativeCourseSchema = initiativeCourseSchema.fork(['_id'], (schema) => schema.forbidden());

export const updateInitiativeCourseSchema = initiativeCourseSchema.min(1);

const initiativePackageSchema = Joi.object({
  _id: objectIdSchema,
  title: Joi.string().required(),
  description: Joi.string().allow('', null),
  type: Joi.string().valid('custom', 'full').required(),
  price: Joi.number().min(0).default(0),
  maxCourses: Joi.when('type', {
    is: 'custom',
    then: Joi.number().min(1).required(),
    otherwise: Joi.forbidden()
  }),
  courses: Joi.array().items(initiativeCourseSchema).required()
}).unknown(true);

export const createInitiativeSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  img: Joi.string().required(),
  tracks: Joi.array().items(initiativeCourseSchema).min(1).required(),
  packages: Joi.array().items(initiativePackageSchema).default([]),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required()
}).unknown(true);

export const updateInitiativeSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  img: Joi.string(),
  tracks: Joi.array().items(initiativeCourseSchema).min(1),
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
  fullName: Joi.string().required().messages({
    'string.empty': 'Full name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required'
  }),
  phone: Joi.string().required().messages({
    'string.empty': 'Phone number is required'
  }),
  additionalInfo: Joi.string().allow('', null)
});
