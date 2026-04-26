import multer from "multer";
import fs from "fs";
import path from "path";
import slugify from "../utils/slugify.util.js";
import { format } from "date-fns";
import type { Request } from "express";

interface MulterMiddlewareOptions {
  getPath: (req: Request) => string[];
}

const multerMiddleware = ({ getPath }: MulterMiddlewareOptions) => {
   const storage = multer.diskStorage({
      destination: (req, file, cb) => {
         const folders = getPath(req);
         const safeFolders = folders.map((f) => slugify(f));
         const destinationPath = path.resolve("public/uploads", ...safeFolders);

         if (!fs.existsSync(destinationPath)) {
            fs.mkdirSync(destinationPath, { recursive: true });
         }

         cb(null, destinationPath);
      },
      filename: (req, file, cb) => {
         const cleanName = file.originalname
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9.\-]/g, "");
         const formattedDate = format(
            new Date(),
            "yyyy-MM-dd_hh-mm-ss-a"
         ).toLowerCase();
         const uniqueName = `${formattedDate}_${cleanName}`;
         cb(null, uniqueName);
      },
   });

   return multer({ storage });
};

export default multerMiddleware;
