const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const COS = require('cos-nodejs-sdk-v5');
const { queryOne } = require('../database/connection');

let storageClient = null;
let storageConfig = null;

/**
 * 从数据库加载存储配置
 */
async function loadStorageConfig() {
  try {
    const { query } = require('../database/connection');
    const configs = await query(
      `SELECT config_key, config_value FROM system_configs 
       WHERE config_key IN ('storage_type', 'r2_account_id', 'r2_access_key_id', 'r2_secret_access_key', 'r2_bucket_name', 'r2_public_url', 'tencent_secret_id', 'tencent_secret_key', 'tencent_region', 'tencent_bucket', 'tencent_public_url')
       ORDER BY config_key`
    );

    if (!configs || configs.length === 0) {
      return null;
    }

    // 转换为对象格式
    const config = {
      storage_type: 'r2',
      r2: {
        account_id: '',
        access_key_id: '',
        secret_access_key: '',
        bucket_name: '',
        public_url: ''
      },
      tencent: {
        secret_id: '',
        secret_key: '',
        region: 'ap-guangzhou',
        bucket: '',
        public_url: ''
      }
    };

    configs.forEach(item => {
      const key = item.config_key;
      const value = item.config_value || '';
      
      if (key === 'storage_type') {
        config.storage_type = value || 'r2';
      } else if (key === 'r2_account_id') {
        config.r2.account_id = value;
      } else if (key === 'r2_access_key_id') {
        config.r2.access_key_id = value;
      } else if (key === 'r2_secret_access_key') {
        config.r2.secret_access_key = value;
      } else if (key === 'r2_bucket_name') {
        config.r2.bucket_name = value;
      } else if (key === 'r2_public_url') {
        config.r2.public_url = value;
      } else if (key === 'tencent_secret_id') {
        config.tencent.secret_id = value;
      } else if (key === 'tencent_secret_key') {
        config.tencent.secret_key = value;
      } else if (key === 'tencent_region') {
        config.tencent.region = value || 'ap-guangzhou';
      } else if (key === 'tencent_bucket') {
        config.tencent.bucket = value;
      } else if (key === 'tencent_public_url') {
        config.tencent.public_url = value;
      }
    });

    return config;
  } catch (error) {
    console.error('加载存储配置失败:', error);
    return null;
  }
}

/**
 * 初始化存储客户端
 */
async function initStorage() {
  storageConfig = await loadStorageConfig();
  
  if (!storageConfig || !storageConfig.storage_type) {
    console.log('存储配置未设置，文件上传功能将不可用');
    return;
  }

  if (storageConfig.storage_type === 'tencent') {
    if (!storageConfig.tencent.secret_id || !storageConfig.tencent.secret_key) {
      console.log('腾讯云COS配置不完整，文件上传功能将不可用');
      return;
    }
    
    storageClient = new COS({
      SecretId: storageConfig.tencent.secret_id,
      SecretKey: storageConfig.tencent.secret_key,
      Region: storageConfig.tencent.region || 'ap-guangzhou',
    });
    console.log('腾讯云COS存储已初始化');
  } else {
    // R2配置（使用AWS SDK v3）
    if (!storageConfig.r2.account_id || !storageConfig.r2.access_key_id || !storageConfig.r2.secret_access_key) {
      console.log('R2配置不完整，文件上传功能将不可用');
      return;
    }
    
    storageClient = new S3Client({
      endpoint: `https://${storageConfig.r2.account_id}.r2.cloudflarestorage.com`,
      region: 'auto',
      credentials: {
        accessKeyId: storageConfig.r2.access_key_id,
        secretAccessKey: storageConfig.r2.secret_access_key,
      },
    });
    console.log('R2存储已初始化');
  }
}

/**
 * 重新加载配置（配置更新后调用）
 */
async function reloadConfig() {
  storageConfig = null;
  storageClient = null;
  await initStorage();
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
    await initStorage();
  }

  if (!storageClient || !storageConfig) {
    throw new Error('存储服务未配置或配置不完整');
  }

  const bucketName = storageConfig.storage_type === 'tencent' 
    ? storageConfig.tencent.bucket 
    : storageConfig.r2.bucket_name;
  
  if (!bucketName) {
    throw new Error('存储桶名称未配置');
  }

  const key = `avatars/${Date.now()}-${fileName}`;

  if (storageConfig.storage_type === 'tencent') {
    return new Promise((resolve, reject) => {
      storageClient.putObject({
        Bucket: bucketName,
        Region: storageConfig.tencent.region || 'ap-guangzhou',
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const publicUrl = storageConfig.tencent.public_url || '';
          resolve(`${publicUrl}/${key}`);
        }
      });
    });
  } else {
    // R2/S3 (AWS SDK v3)
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read',
      });

      await storageClient.send(command);
      const publicUrl = storageConfig.r2.public_url || '';
      return `${publicUrl}/${key}`;
    } catch (error) {
      throw new Error(`文件上传失败: ${error.message}`);
    }
  }
}

/**
 * 删除文件
 * @param {String} fileUrl 文件URL
 * @returns {Promise}
 */
async function deleteFile(fileUrl) {
  if (!storageClient) {
    await initStorage();
  }

  if (!storageClient || !storageConfig) {
    throw new Error('存储服务未配置或配置不完整');
  }

  const bucketName = storageConfig.storage_type === 'tencent' 
    ? storageConfig.tencent.bucket 
    : storageConfig.r2.bucket_name;

  if (!bucketName) {
    throw new Error('存储桶名称未配置');
  }

  // 从URL中提取key
  const key = fileUrl.split('/').slice(-2).join('/'); // 获取 avatars/xxx.jpg

  if (storageConfig.storage_type === 'tencent') {
    return new Promise((resolve, reject) => {
      storageClient.deleteObject({
        Bucket: bucketName,
        Region: storageConfig.tencent.region || 'ap-guangzhou',
        Key: key,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  } else {
    // R2/S3 (AWS SDK v3)
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await storageClient.send(command);
      return { success: true };
    } catch (error) {
      throw new Error(`文件删除失败: ${error.message}`);
    }
  }
}

/**
 * 获取存储类型
 */
function getStorageType() {
  return storageConfig?.storage_type || null;
}

module.exports = {
  initStorage,
  reloadConfig,
  uploadFile,
  deleteFile,
  getStorageType
};
