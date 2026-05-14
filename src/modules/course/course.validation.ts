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
  price: Joi.number().min(0).default(0),
  isAvailable: Joi.boolean().default(true)
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
  price: Joi.number().min(0),
  isAvailable: Joi.boolean()
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
  additionalInfo: Joi.string().allow('', null),
  promoCode: Joi.string().allow('', null)
});

export const adminEnrollStudentSchema = Joi.object({
  targetType: Joi.string().valid('courseRound', 'initiativeTrack', 'initiativePackage').required(),
  studentId: Joi.string().hex().length(24).required(),
  roundId: Joi.when('targetType', {
    is: 'courseRound',
    then: Joi.string().hex().length(24).required(),
    otherwise: Joi.string().hex().length(24).optional()
  }),
  initiativeId: Joi.when('targetType', {
    is: Joi.valid('initiativeTrack', 'initiativePackage'),
    then: Joi.string().hex().length(24).required(),
    otherwise: Joi.string().hex().length(24).optional()
  }),
  trackId: Joi.when('targetType', {
    is: 'initiativeTrack',
    then: Joi.string().hex().length(24).required(),
    otherwise: Joi.string().hex().length(24).optional()
  }),
  packageId: Joi.when('targetType', {
    is: 'initiativePackage',
    then: Joi.string().hex().length(24).required(),
    otherwise: Joi.string().hex().length(24).optional()
  }),
  selectedCourseIds: Joi.array().items(Joi.string().hex().length(24)).default([]),
  manualPaymentStatus: Joi.string().valid('free', 'paid').default('free'),
  manualPaymentAmount: Joi.when('manualPaymentStatus', {
    is: 'paid',
    then: Joi.number().positive().required(),
    otherwise: Joi.number().min(0).optional()
  }),
  additionalInfo: Joi.string().allow('', null)
});
