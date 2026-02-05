/**
 * AWS S3 Service
 * Handle file uploads, downloads, and deletions
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AWS = require('aws-sdk');
import { logger } from '../utils/logger';

// Configure AWS S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ecoinvest-evidence-documents';

/**
 * Upload file to S3
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private' // Files are private by default
    };

    s3.upload(params, (err: any, data: any) => {
      if (err) {
        logger.error('S3 upload error:', err);
        reject(new Error('Failed to upload file to S3'));
      } else {
        resolve(data.Location);
      }
    });
  });
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Extract key from URL
    const key = fileUrl.split('.com/')[1] || fileUrl.split('amazonaws.com/')[1];
    
    if (!key) {
      reject(new Error('Invalid file URL'));
      return;
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    s3.deleteObject(params, (err: any) => {
      if (err) {
        logger.error('S3 delete error:', err);
        reject(new Error('Failed to delete file from S3'));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get signed URL for downloading file
 */
export async function getSignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
  try {
    // Extract key from URL
    const key = fileUrl.split('.com/')[1] || fileUrl.split('amazonaws.com/')[1];
    
    if (!key) {
      throw new Error('Invalid file URL');
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    };

    return new Promise((resolve, reject) => {
      s3.getSignedUrl('getObject', params, (err: any, url: string) => {
        if (err) reject(err);
        else resolve(url);
      });
    });
  } catch (error: any) {
    logger.error('S3 signed URL error:', error);
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}
