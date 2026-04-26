import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Delete a file from the filesystem.
 * @param {string} fullPath - The absolute path to the file.
 * @returns {Promise<boolean>} - True if deleted, False if error or not found
 */
export const deleteFile = async (fullPath: string): Promise<boolean> => {
   try {
      if (fs.existsSync(fullPath)) {
         await fs.promises.unlink(fullPath);
         return true;
      }
      return false;
   } catch (error) {
      console.error(`[FileSystem] Error deleting file at ${fullPath}:`, error);
      return false;
   }
};

/**
 * Extract relative path from a full URL if it matches local uploads.
 * Example: http://localhost:3000/uploads/file.png -> uploads/file.png
 */
export const getRelativePathFromUrl = (url: string | null | undefined): string | null => {
   if (!url) return null;
   try {
      const urlObj = new URL(url);
      // Remove leading slash from pathname
      return urlObj.pathname.substring(1); 
   } catch (e) {
      // If not a valid URL, assume it's already a relative path or just return as is
      return url;
   }
};
