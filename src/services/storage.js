const AWS = require('aws-sdk');
const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let storageClient = null;
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'r2';

/**
 * 初始化存储客户端
 */
function initStorage() {
  if (STORAGE_TYPE === 'tencent') {
    storageClient = new COS({
      SecretId: process.env.TENCENT_SECRET_ID,
      SecretKey: process.env.TENCENT_SECRET_KEY,
      Region: process.env.TENCENT_REGION || 'ap-guangzhou',
    });
    console.log('腾讯云COS存储已初始化');
  } else {
    // R2配置（兼容S3）
    storageClient = new AWS.S3({
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      signatureVersion: 'v4',
      region: 'auto',
    });
    console.log('R2存储已初始化');
  }
}

/**
 * 上传文件
 * @param {Buffer|Stream} fileBuffer 文件内容
 * @param {String} fileName 文件名
 * @param {String} contentType 文件类型
 * @returns {Promise<String>} 文件URL
 */
async function uploadFile(fileBuffer, fileName, contentType = 'image/jpeg') {
  if (!storageClient) {
    initStorage();
  }

  const bucketName = STORAGE_TYPE === 'tencent' 
    ? process.env.TENCENT_BUCKET 
    : process.env.R2_BUCKET_NAME;
  
  const key = `avatars/${Date.now()}-${fileName}`;

  return new Promise((resolve, reject) => {
    if (STORAGE_TYPE === 'tencent') {
      storageClient.putObject({
        Bucket: bucketName,
        Region: process.env.TENCENT_REGION || 'ap-guangzhou',
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const publicUrl = process.env.TENCENT_PUBLIC_URL || '';
          resolve(`${publicUrl}/${key}`);
        }
      });
    } else {
      // R2/S3
      storageClient.upload({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read',
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const publicUrl = process.env.R2_PUBLIC_URL || '';
          resolve(`${publicUrl}/${key}`);
        }
      });
    }
  });
}

/**
 * 删除文件
 * @param {String} fileUrl 文件URL
 * @returns {Promise}
 */
async function deleteFile(fileUrl) {
  if (!storageClient) {
    initStorage();
  }

  const bucketName = STORAGE_TYPE === 'tencent' 
    ? process.env.TENCENT_BUCKET 
    : process.env.R2_BUCKET_NAME;

  // 从URL中提取key
  const key = fileUrl.split('/').slice(-2).join('/'); // 获取 avatars/xxx.jpg

  return new Promise((resolve, reject) => {
    if (STORAGE_TYPE === 'tencent') {
      storageClient.deleteObject({
        Bucket: bucketName,
        Region: process.env.TENCENT_REGION || 'ap-guangzhou',
        Key: key,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } else {
      storageClient.deleteObject({
        Bucket: bucketName,
        Key: key,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    }
  });
}

/**
 * 获取存储类型
 */
function getStorageType() {
  return STORAGE_TYPE;
}

module.exports = {
  initStorage,
  uploadFile,
  deleteFile,
  getStorageType
};

