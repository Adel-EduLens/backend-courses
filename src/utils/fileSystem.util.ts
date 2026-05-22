import { deleteFromS3, isS3Url } from "./s3.service.js";

/**
 * Delete a file. Handles both S3 URLs and legacy local paths.
 */
export const deleteFile = async (filePathOrUrl: string): Promise<boolean> => {
  try {
    if (isS3Url(filePathOrUrl)) {
      return await deleteFromS3(filePathOrUrl);
    }
    // Legacy: local file deletion (for old files that may still exist)
    const fs = await import("fs");
    if (fs.existsSync(filePathOrUrl)) {
      await fs.promises.unlink(filePathOrUrl);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[FileSystem] Error deleting file at ${filePathOrUrl}:`, error);
    return false;
  }
};

/**
 * Extract the deletable path/URL from a stored URL string.
 * For S3 URLs, returns the URL itself.
 * For legacy local paths, returns the relative path.
 */
export const getRelativePathFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  // S3 URLs are returned as-is for deletion
  if (isS3Url(url)) return url;

  try {
    const urlObj = new URL(url);
    if (!urlObj.pathname.startsWith("/uploads/")) {
      return null;
    }
    return urlObj.pathname.substring(1);
  } catch (e) {
    return url.startsWith("uploads/") ? url : null;
  }
};
