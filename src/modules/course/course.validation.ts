import Joi from 'joi';

export const createCourseSchema = Joi.object({
  title: Joi.string().required(),
  brief: Joi.string().required(),
  img: Joi.string().required(),
  price: Joi.number().min(0).default(0)
});

export const updateCourseSchema = Joi.object({
  title: Joi.string(),
  brief: Joi.string(),
  img: Joi.string(),
  price: Joi.number().min(0)
});

export const enrollCourseSchema = Joi.object({
  courseId: Joi.string().hex().length(24).required(),
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
