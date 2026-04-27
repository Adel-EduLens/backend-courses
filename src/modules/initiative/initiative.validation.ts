import Joi from 'joi';

export const createInitiativeCourseSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  price: Joi.number().min(0).required(),
  img: Joi.string().required(),
  brief: Joi.string().required(),
  startTime: Joi.string().required(),
  endTime: Joi.string().required()
});

export const updateInitiativeCourseSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  price: Joi.number().min(0),
  img: Joi.string(),
  brief: Joi.string(),
  startTime: Joi.string(),
  endTime: Joi.string()
});
export const createInitiativeSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  img: Joi.string().required(),
  maxCourses: Joi.number().min(1).default(1),
  courses: Joi.array().items(Joi.string().hex().length(24))
});

export const updateInitiativeSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  img: Joi.string(),
  maxCourses: Joi.number().min(1),
  courses: Joi.array().items(Joi.string().hex().length(24))
});

export const enrollInitiativeCourseSchema = Joi.object({
  initiativeCourseId: Joi.string().hex().length(24).required(),
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

