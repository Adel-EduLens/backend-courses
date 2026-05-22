import multer from 'multer';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import { uploadToS3 } from './s3.service.js';

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadToS3Middleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return next();

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = req.file.fieldname + '-' + uniqueSuffix + path.extname(req.file.originalname);
    const key = `uploads/courses/${filename}`;

    const url = await uploadToS3(req.file.buffer, key, req.file.mimetype);
    req.file.path = url;
    req.file.filename = filename;

    next();
  } catch (error) {
    next(error);
  }
};

export const upload = {
  single: (fieldName: string) => [multerInstance.single(fieldName), uploadToS3Middleware],
};
