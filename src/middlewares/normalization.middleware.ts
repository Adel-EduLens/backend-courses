import { Request, Response, NextFunction } from 'express';

export const normalizeCourseFormData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.aboutCourse && typeof req.body.aboutCourse === 'string') {
    try {
      req.body.aboutCourse = JSON.parse(req.body.aboutCourse);
    } catch (e) {
      console.error('Error parsing aboutCourse:', e);
    }
  }
  if (req.body.targetAudience && typeof req.body.targetAudience === 'string') {
    try {
      req.body.targetAudience = JSON.parse(req.body.targetAudience);
    } catch (e) {
      console.error('Error parsing targetAudience:', e);
    }
  }
  if (req.body.price !== undefined) {
    req.body.price = Number(req.body.price);
  }
  if (req.file) {
    req.body.img = `/uploads/courses/${req.file.filename}`;
  }
  next();
};
