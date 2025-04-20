const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({ region: process.env.AWS_REGION });

exports.uploadArchive = async (key, body) => {
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: JSON.stringify(body),
    ContentType: 'application/json'
  });
  await client.send(cmd);
};
