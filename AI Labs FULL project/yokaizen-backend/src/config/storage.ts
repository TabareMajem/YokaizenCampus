import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Storage } from '@google-cloud/storage';
import { config } from './env';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Determine which storage provider to use
const useGCS = !!config.gcs.bucket;
const useS3 = !!config.aws.s3Bucket && !useGCS;

// AWS S3 Client
let s3Client: S3Client | null = null;
if (useS3) {
  s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId!,
      secretAccessKey: config.aws.secretAccessKey!,
    },
  });
}

// Google Cloud Storage Client
let gcsClient: Storage | null = null;
if (useGCS) {
  gcsClient = new Storage({
    projectId: config.gcs.projectId,
    keyFilename: config.google.credentials,
  });
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  provider: 'S3' | 'GCS';
}

export interface UploadOptions {
  folder?: string;
  contentType?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
}

// Generate unique file key
const generateFileKey = (originalName: string, folder?: string): string => {
  const ext = path.extname(originalName);
  const uniqueId = uuidv4();
  const timestamp = Date.now();
  const key = `${folder ? folder + '/' : ''}${timestamp}-${uniqueId}${ext}`;
  return key;
};

// Upload to S3
const uploadToS3 = async (
  buffer: Buffer,
  originalName: string,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  if (!s3Client || !config.aws.s3Bucket) {
    throw new Error('S3 is not configured');
  }

  const key = generateFileKey(originalName, options.folder);
  const bucket = config.aws.s3Bucket;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: options.contentType || 'application/octet-stream',
    ACL: options.isPublic ? 'public-read' : 'private',
    Metadata: options.metadata,
  });

  await s3Client.send(command);

  const url = options.isPublic
    ? `https://${bucket}.s3.${config.aws.region}.amazonaws.com/${key}`
    : await getS3SignedUrl(key);

  return {
    url,
    key,
    bucket,
    provider: 'S3',
  };
};

// Get S3 signed URL
const getS3SignedUrl = async (key: string, expiresIn = 3600): Promise<string> => {
  if (!s3Client || !config.aws.s3Bucket) {
    throw new Error('S3 is not configured');
  }

  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

// Delete from S3
const deleteFromS3 = async (key: string): Promise<void> => {
  if (!s3Client || !config.aws.s3Bucket) {
    throw new Error('S3 is not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });

  await s3Client.send(command);
};

// Upload to GCS
const uploadToGCS = async (
  buffer: Buffer,
  originalName: string,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  if (!gcsClient || !config.gcs.bucket) {
    throw new Error('GCS is not configured');
  }

  const key = generateFileKey(originalName, options.folder);
  const bucket = gcsClient.bucket(config.gcs.bucket);
  const file = bucket.file(key);

  await file.save(buffer, {
    contentType: options.contentType || 'application/octet-stream',
    metadata: {
      cacheControl: 'public, max-age=31536000',
      ...options.metadata,
    },
  });

  if (options.isPublic) {
    await file.makePublic();
  }

  const url = options.isPublic
    ? `https://storage.googleapis.com/${config.gcs.bucket}/${key}`
    : await getGCSSignedUrl(key);

  return {
    url,
    key,
    bucket: config.gcs.bucket,
    provider: 'GCS',
  };
};

// Get GCS signed URL
const getGCSSignedUrl = async (key: string, expiresIn = 3600): Promise<string> => {
  if (!gcsClient || !config.gcs.bucket) {
    throw new Error('GCS is not configured');
  }

  const bucket = gcsClient.bucket(config.gcs.bucket);
  const file = bucket.file(key);

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresIn * 1000,
  });

  return url;
};

// Delete from GCS
const deleteFromGCS = async (key: string): Promise<void> => {
  if (!gcsClient || !config.gcs.bucket) {
    throw new Error('GCS is not configured');
  }

  const bucket = gcsClient.bucket(config.gcs.bucket);
  const file = bucket.file(key);
  await file.delete();
};

// Unified Storage Interface
export const storage = {
  // Upload file
  async upload(
    buffer: Buffer,
    originalName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    if (useGCS) {
      return uploadToGCS(buffer, originalName, options);
    }
    if (useS3) {
      return uploadToS3(buffer, originalName, options);
    }
    throw new Error('No storage provider configured');
  },

  // Get signed URL for private file
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (useGCS) {
      return getGCSSignedUrl(key, expiresIn);
    }
    if (useS3) {
      return getS3SignedUrl(key, expiresIn);
    }
    throw new Error('No storage provider configured');
  },

  // Delete file
  async delete(key: string): Promise<void> {
    if (useGCS) {
      return deleteFromGCS(key);
    }
    if (useS3) {
      return deleteFromS3(key);
    }
    throw new Error('No storage provider configured');
  },

  // Upload avatar
  async uploadAvatar(buffer: Buffer, originalName: string, userId: string): Promise<UploadResult> {
    return this.upload(buffer, originalName, {
      folder: `avatars/${userId}`,
      isPublic: true,
      contentType: 'image/jpeg',
    });
  },

  // Upload AI generated image
  async uploadGeneratedImage(buffer: Buffer, userId: string): Promise<UploadResult> {
    return this.upload(buffer, 'generated.png', {
      folder: `generated/${userId}`,
      isPublic: true,
      contentType: 'image/png',
    });
  },

  // Upload knowledge base PDF
  async uploadKnowledgeBase(buffer: Buffer, originalName: string, agentId: string): Promise<UploadResult> {
    return this.upload(buffer, originalName, {
      folder: `knowledge_base/${agentId}`,
      isPublic: false,
      contentType: 'application/pdf',
    });
  },

  // Get provider info
  getProvider(): 'S3' | 'GCS' | null {
    if (useGCS) return 'GCS';
    if (useS3) return 'S3';
    return null;
  },
};

export default storage;
