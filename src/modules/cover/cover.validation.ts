import Joi from 'joi';

const coverStatSchema = Joi.object({
  value: Joi.string().trim().required(),
  label: Joi.string().trim().required()
});

export const createCoverSchema = Joi.object({
  itemType: Joi.string().valid('course', 'event', 'initiative', 'track').required(),
  itemId: Joi.string().required(),
  title: Joi.string().trim().required(),
  subtitle: Joi.string().trim().required(),
  tagline: Joi.string().trim().required(),
  backgroundImage: Joi.string().trim().allow(''),
  buttonText: Joi.string().trim().allow('').default('')
});

export const updateCoverSchema = Joi.object({
  itemType: Joi.string().valid('course', 'event', 'initiative', 'track').required(),
  itemId: Joi.string().required(),
  title: Joi.string().trim().required(),
  subtitle: Joi.string().trim().required(),
  tagline: Joi.string().trim().required(),
  backgroundImage: Joi.string().trim().allow(''),
  buttonText: Joi.string().trim().allow('').default('')
});

export const updateCoverStatsSchema = Joi.object({
  stats: Joi.array().items(coverStatSchema).required()
});
