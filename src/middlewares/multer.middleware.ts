import multer from "multer";
import { format } from "date-fns";
import type { Request, Response, NextFunction } from "express";
import { uploadToS3 } from "../utils/s3.service.js";

interface MulterMiddlewareOptions {
  getPath: (req: Request) => string[];
}

const multerMiddleware = ({ getPath }: MulterMiddlewareOptions) => {
  const storage = multer.memoryStorage();
  const multerInstance = multer({ storage });

  const uploadToS3Middleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.files && !req.file) return next();

      const files = req.file ? [req.file] : (Array.isArray(req.files) ? req.files : []);
      const folders = getPath(req);

      for (const file of files) {
        const cleanName = file.originalname
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9.\-]/g, "");
        const formattedDate = format(new Date(), "yyyy-MM-dd_hh-mm-ss-a").toLowerCase();
        const uniqueName = `${formattedDate}_${cleanName}`;
        const key = `uploads/${folders.join("/")}/${uniqueName}`;

        const url = await uploadToS3(file.buffer, key, file.mimetype);
        // Store the S3 URL in the file object so controllers can access it
        file.path = url;
        file.filename = uniqueName;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  // Return a proxy that wraps multer methods to add S3 upload middleware
  return {
    single: (fieldName: string) => [multerInstance.single(fieldName), uploadToS3Middleware],
    array: (fieldName: string, maxCount?: number) => [multerInstance.array(fieldName, maxCount), uploadToS3Middleware],
    any: () => [multerInstance.any(), uploadToS3Middleware],
    fields: (fields: multer.Field[]) => [multerInstance.fields(fields), uploadToS3Middleware],
    none: () => multerInstance.none(),
  };
};

export default multerMiddleware;
