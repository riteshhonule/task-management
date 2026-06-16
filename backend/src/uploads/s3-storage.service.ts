import { Injectable, Logger } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.AWS_S3_BUCKET;
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async saveFile(file: Express.Multer.File, user?: any): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    
    const userName = user?.name ? user.name.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown_user';
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Key in S3: userName/dateStr/fileName
    const key = `${userName}/${dateStr}/${fileName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      this.logger.log(`Successfully uploaded file to S3: ${key}`);
      
      // Return the public S3 URL or S3 key
      // If the bucket is private, we can return the S3 key, but returning the key
      // and having the uploads controller redirect or serve it could also work.
      // Let's return the full URL: https://bucketName.s3.region.amazonaws.com/key
      // If we return the full URL, the database attachment path will be this URL.
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${key}`, error);
      throw error;
    }
  }
}
