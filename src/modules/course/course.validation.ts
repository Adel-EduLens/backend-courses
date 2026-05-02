import Joi from 'joi';

export const createCourseSchema = Joi.object({
  title: Joi.string().required(),
  brief: Joi.string().required(),
  aboutCourse: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      items: Joi.array().items(Joi.string().allow('').trim())
    }).options({ stripUnknown: true })
  ).default([]),
  targetAudience: Joi.array().items(Joi.string().allow('').trim()).default([]),
  img: Joi.string().required(),
  price: Joi.number().min(0).default(0)
});

export const updateCourseSchema = Joi.object({
  title: Joi.string(),
  brief: Joi.string(),
  aboutCourse: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      items: Joi.array().items(Joi.string().allow('').trim())
    }).options({ stripUnknown: true })
  ),
  targetAudience: Joi.array().items(Joi.string().allow('').trim()),
  img: Joi.string().allow(''),
  price: Joi.number().min(0)
});

export const createRoundSchema = Joi.object({
  courseId: Joi.string().hex().length(24).required(),
  title: Joi.string().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  duration: Joi.string().required(),
  status: Joi.string().valid('upcoming', 'active', 'completed').default('upcoming')
});

export const updateRoundSchema = Joi.object({
  title: Joi.string(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  duration: Joi.string(),
  status: Joi.string().valid('upcoming', 'active', 'completed')
});

export const createLectureSchema = Joi.object({
  roundId: Joi.string().hex().length(24).required(),
  title: Joi.string().required(),
  startDate: Joi.date().iso().required(),
  meetingUrl: Joi.string().uri().allow('', null),
  status: Joi.string().valid('upcoming', 'active', 'completed').default('upcoming')
});

export const updateLectureSchema = Joi.object({
  title: Joi.string(),
  startDate: Joi.date().iso(),
  meetingUrl: Joi.string().uri().allow('', null),
  status: Joi.string().valid('upcoming', 'active', 'completed')
});

export const enrollRoundSchema = Joi.object({
  roundId: Joi.string().hex().length(24).required(),
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
