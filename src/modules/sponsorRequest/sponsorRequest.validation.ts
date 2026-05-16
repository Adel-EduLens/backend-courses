import Joi from 'joi';

const objectIdSchema = Joi.string().hex().length(24);

export const createSponsorRequestSchema = Joi.object({
  eventId: objectIdSchema.allow('', null),
  eventTitle: Joi.string().required().messages({
    'string.empty': 'Event title is required',
    'any.required': 'Event title is required'
  }),
  companyName: Joi.string().required().messages({
    'string.empty': 'Company name is required',
    'any.required': 'Company name is required'
  }),
  contactPerson: Joi.string().required().messages({
    'string.empty': 'Contact person is required',
    'any.required': 'Contact person is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'A valid email is required',
    'string.empty': 'Email is required',
    'any.required': 'Email is required'
  }),
  phone: Joi.string().required().messages({
    'string.empty': 'Phone number is required',
    'any.required': 'Phone number is required'
  }),
  sponsorshipLevel: Joi.string().valid('platinum', 'gold', 'silver', 'bronze', 'custom').default('bronze'),
  message: Joi.string().allow('', null)
});
