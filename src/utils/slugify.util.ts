import slugify from 'slugify';

/**
 * Custom slugify utility wrapper.
 */
const customSlugify = (text: string): string => {
  return (slugify as any)(text, {
    lower: true,
    strict: true,
    trim: true,
  });
};

export default customSlugify;
