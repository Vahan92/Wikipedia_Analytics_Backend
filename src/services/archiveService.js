const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const cache = require("./cacheService");
const dayjs = require("dayjs");

const requiredEnvVars = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET",
  "CRON_SCHEDULE",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);
if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 3,
  retryMode: "standard",
});

async function archiveDataToS3(data, type, retries = 3) {
  if (!process.env.S3_BUCKET) {
    throw new Error("S3_BUCKET environment variable is required");
  }

  const timestamp = dayjs().format("YYYY-MM-DD/HH-mm-ss");
  const key = `${type}/${timestamp}.json`;

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: "application/json",
    Metadata: {
      "archive-type": type,
      "archive-source": process.env.CRON_SCHEDULE || "unknown",
      "archive-timestamp": dayjs().toISOString(),
    },
  };

  try {
    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);

    console.log(`Successfully archived ${type} data to S3: ${key}`);

    return {
      key,
      etag: result.ETag,
      timestamp,
    };
  } catch (error) {
    console.error(
      `Error archiving data to S3 (attempt ${4 - retries}): ${error.message}`
    );

    if (retries > 0) {
      console.log(`Retrying S3 upload for ${type}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)));
      return archiveDataToS3(data, type, retries - 1);
    }

    throw new Error(
      `Failed to archive ${type} data after multiple attempts: ${error.message}`
    );
  }
}

async function archiveCacheData() {
  try {
    const cacheData = cache.getAll() || {};
    const allCacheKeys = Object.keys(cacheData);

    if (allCacheKeys.length === 0) {
      console.log("No cache data to archive");
      return [];
    }

    const dataByType = {};

    allCacheKeys.forEach((key) => {
      const dataType = key.includes(":") ? key.split(":")[0] : "unknown";

      if (!dataByType[dataType]) {
        dataByType[dataType] = {};
      }

      dataByType[dataType][key] = cacheData[key];
    });

    const archivePromises = Object.entries(dataByType).map(
      async ([type, data]) => {
        if (Object.keys(data).length > 0) {
          return await archiveDataToS3(data, type);
        }
        return null;
      }
    );

    const results = await Promise.all(archivePromises);

    return results.filter((result) => result !== null);
  } catch (error) {
    console.error(`Error in archiveCacheData: ${error.message}`);
    throw error;
  }
}

module.exports = {
  archiveDataToS3,
  archiveCacheData,
};
