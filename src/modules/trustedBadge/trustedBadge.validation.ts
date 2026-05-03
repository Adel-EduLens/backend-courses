import Joi from 'joi';

const badgeSchema = Joi.object({
  _id: Joi.string(),
  name: Joi.string().trim().allow(''),
  logo: Joi.string().trim().allow('').required()
});

export const updateTrustedBadgeContentSchema = Joi.object({
  title: Joi.string().trim().required(),
  subtitle: Joi.string().trim().required(),
  badges: Joi.array().items(badgeSchema).required()
});
