const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const cache = require('./cacheService');
const dayjs = require('dayjs');

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Function to archive data to S3
async function archiveDataToS3(data, type) {
  try {
    const timestamp = dayjs().format('YYYY-MM-DD-HHmmss');
    const key = `${process.env.S3_ARCHIVE_PREFIX}/${type}_${timestamp}.json`;
    
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json'
    };
    
    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);
    
    console.log(`Successfully archived ${type} data to S3: ${key}`);
    return { key, result };
  } catch (error) {
    console.error(`Error archiving data to S3: ${error.message}`);
    throw error;
  }
}

async function archiveCacheData() {
  try {
    const allCacheKeys = Object.keys(cache.getAll() || {});
    
    const dataByType = {};
    
    allCacheKeys.forEach(key => {
      const dataType = key.split(':')[0] || 'unknown';
      if (!dataByType[dataType]) dataByType[dataType] = {};
      dataByType[dataType][key] = cache.get(key);
    });
    
    const archiveResults = [];
    for (const [type, data] of Object.entries(dataByType)) {
      if (Object.keys(data).length > 0) {
        const result = await archiveDataToS3(data, type);
        archiveResults.push(result);
      }
    }
    
    return archiveResults;
  } catch (error) {
    console.error(`Error in archiveCacheData: ${error.message}`);
    throw error;
  }
}

module.exports = {
  archiveDataToS3,
  archiveCacheData
};