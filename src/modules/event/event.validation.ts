import Joi from 'joi';

const speakerValidationSchema = Joi.object({
  name: Joi.string().required(),
  title: Joi.string().required(),
  brief: Joi.string().required(),
  img: Joi.string().allow('').required()
});

const partnerValidationSchema = Joi.object({
  name: Joi.string().required(),
  img: Joi.string().allow('').required()
});

const activityValidationSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required()
});

export const createEventSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  location: Joi.string().required(),
  status: Joi.string().valid('past', 'upcoming').required(),
  date: Joi.date().required(),
  price: Joi.number().min(0).default(0),
  baseEnrollmentCount: Joi.number().min(0).default(0),
  img: Joi.string().allow(''),
  eventGallery: Joi.array().items(Joi.string()),
  speakers: Joi.array().items(speakerValidationSchema),
  partners: Joi.array().items(partnerValidationSchema),
  activities: Joi.array().items(activityValidationSchema),
  aboutEvent: Joi.string().required(),
  keyObjectives: Joi.array().items(Joi.string()),
  isAvailable: Joi.boolean().default(true)
}).unknown(true);

export const updateEventSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  location: Joi.string(),
  status: Joi.string().valid('past', 'upcoming'),
  date: Joi.date(),
  price: Joi.number().min(0),
  baseEnrollmentCount: Joi.number().min(0),
  img: Joi.string().allow(''),
  eventGallery: Joi.array().items(Joi.string()),
  speakers: Joi.array().items(speakerValidationSchema),
  partners: Joi.array().items(partnerValidationSchema),
  activities: Joi.array().items(activityValidationSchema),
  aboutEvent: Joi.string(),
  keyObjectives: Joi.array().items(Joi.string()),
  isAvailable: Joi.boolean()
}).unknown(true);

export const reserveEventSchema = Joi.object({
  eventId: Joi.string().hex().length(24).required(),
  additionalInfo: Joi.string().allow('', null),
  promoCode: Joi.string().allow('', null)
});
