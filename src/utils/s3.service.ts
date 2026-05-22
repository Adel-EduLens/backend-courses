import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development' });

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT_URL_S3 || 'https://t3.storage.dev',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME || 'esu-uploads';

/**
 * Upload a file buffer to S3/Tigris.
 * Returns the public URL of the uploaded file.
 */
export const uploadToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    })
  );

  const endpoint = process.env.AWS_ENDPOINT_URL_S3 || 'https://t3.storage.dev';
  const host = endpoint.replace('https://', '');
  return `https://${BUCKET}.${host}/${key}`;
};

/**
 * Delete a file from S3/Tigris by its full URL or key.
 */
export const deleteFromS3 = async (urlOrKey: string): Promise<boolean> => {
  try {
    let key = urlOrKey;

    if (urlOrKey.startsWith('http')) {
      const url = new URL(urlOrKey);
      // Handle both virtual-hosted (bucket.host/key) and path-style (host/bucket/key)
      key = url.pathname.replace(`/${BUCKET}/`, '').replace(/^\//, '');
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error(`[S3] Error deleting ${urlOrKey}:`, error);
    return false;
  }
};

/**
 * Check if a URL is an S3/Tigris URL
 */
export const isS3Url = (url: string): boolean => {
  return url.includes(process.env.AWS_ENDPOINT_URL_S3 || 't3.storage.dev');
};
