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
  eventGallery: Joi.array().items(Joi.string()),
  speakers: Joi.array().items(speakerValidationSchema),
  partners: Joi.array().items(partnerValidationSchema),
  activities: Joi.array().items(activityValidationSchema),
  aboutEvent: Joi.string().required(),
  keyObjectives: Joi.array().items(Joi.string())
});

export const updateEventSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  location: Joi.string(),
  status: Joi.string().valid('past', 'upcoming'),
  date: Joi.date(),
  eventGallery: Joi.array().items(Joi.string()),
  speakers: Joi.array().items(speakerValidationSchema),
  partners: Joi.array().items(partnerValidationSchema),
  activities: Joi.array().items(activityValidationSchema),
  aboutEvent: Joi.string(),
  keyObjectives: Joi.array().items(Joi.string())
});
