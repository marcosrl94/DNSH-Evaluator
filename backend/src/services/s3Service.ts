/**
 * AWS S3 Service
 * Handle file uploads, downloads, and deletions
 */

import AWS from 'aws-sdk';
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
  try {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private' // Files are private by default
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error: any) {
    logger.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  try {
    // Extract key from URL
    const key = fileUrl.split('.com/')[1] || fileUrl.split('amazonaws.com/')[1];
    
    if (!key) {
      throw new Error('Invalid file URL');
    }

    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
  } catch (error: any) {
    logger.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
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

    return s3.getSignedUrlPromise('getObject', params);
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
