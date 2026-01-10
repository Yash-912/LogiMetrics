/**
 * AWS S3 Configuration
 * For document and file storage
 */

const AWS = require('aws-sdk');
const logger = require('../utils/logger.util');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'logimetrics-documents';

/**
 * Upload file to S3
 */
async function uploadToS3(file, folder = 'documents') {
  const key = `${folder}/${Date.now()}-${file.originalname}`;
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private'
  };

  try {
    const result = await s3.upload(params).promise();
    logger.info(`File uploaded to S3: ${key}`);
    return {
      key,
      url: result.Location,
      bucket: BUCKET_NAME
    };
  } catch (error) {
    logger.error('S3 upload error:', error);
    throw error;
  }
}

/**
 * Generate pre-signed URL for secure access
 */
function getSignedUrl(key, expiresIn = 3600) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn
  };

  try {
    return s3.getSignedUrl('getObject', params);
  } catch (error) {
    logger.error('S3 getSignedUrl error:', error);
    throw error;
  }
}

/**
 * Delete file from S3
 */
async function deleteFromS3(key) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key
  };

  try {
    await s3.deleteObject(params).promise();
    logger.info(`File deleted from S3: ${key}`);
    return true;
  } catch (error) {
    logger.error('S3 delete error:', error);
    throw error;
  }
}

/**
 * Check if file exists in S3
 */
async function fileExistsInS3(key) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key
  };

  try {
    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}

module.exports = {
  s3,
  uploadToS3,
  getSignedUrl,
  deleteFromS3,
  fileExistsInS3,
  BUCKET_NAME
};
