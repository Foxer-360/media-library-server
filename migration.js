/**
 * This script is single-purpose script to add Cache-Control header into all
 * objects in the bucket!
 *
 * WARNING: Do not run this script unless you know what you are doing!
 */
const aws = require("aws-sdk");
const dotenv = require("dotenv");

// Load environment into `process` object
dotenv.config();

async function main() {
  console.log('Running script to migrate object in S3 storage to add CacheControl headers');

  const accessKey = process.env.AWS_ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_BUCKET;

  console.log(`ACCESS KEY: ${accessKey}`);
  console.log(`SECRET ACCESS KEY: ${secretAccessKey}`);
  console.log(`BUCKET: ${bucket}`);

  // Instantiate S3 library
  const s3 = new aws.S3({
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  });

  let continuationToken = undefined;
  let keyCount = 0;
  const ESTIMATED_KEY_COUNT = 11800;
  do {
    const params = {
      Bucket: bucket,
      ContinuationToken: continuationToken,
    };

    const response = await s3.listObjectsV2(params).promise();
    if (!response) break;

    // Iterate over all fetched objects and copy them into `secondBucket`
    const promises = [];
    for (const obj of response.Contents) {
      promises.push(copyObjectWithCacheControl(s3, bucket, obj.Key));
    }
    await Promise.all(promises);

    continuationToken = response.NextContinuationToken;
    keyCount += response.KeyCount;

    const progress = Math.round(keyCount / ESTIMATED_KEY_COUNT * 1000) / 10;
    console.log(`Estimation of progress: ${progress}`);
  } while (continuationToken);

  console.log(`Total of ${keyCount} objects was found in bucket ${bucket}`);
}

async function copyObjectWithCacheControl(s3, bucket, key) {
  const headObject = await s3.headObject({ Bucket: bucket, Key: key }).promise();

  let copySource = `${bucket}/${key}`;
  if (encodeURIComponent(key) !== key) {
    console.log(`Key ${key} is invalid URL component, using encoded version...`);
    copySource = `${bucket}/${encodeURIComponent(key)}`;
  }

  const params = {
    Bucket: bucket,
    CacheControl: 'public, max-age=31536000',
    CopySource: copySource,
    Key: key,
    MetadataDirective: 'REPLACE',
    Metadata: headObject.metadata,
  };

  try {
    await s3.copyObject(params).promise();
  } catch (err) {
    console.log(`Unable to copy key ${key}`);
    console.error(err);
  }
}

// Run the main function and handle outcomes...
main()
  .then(() => {
    console.log('Done...');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error occured while running the script...');
    console.error(err);
    process.exit(1);
  });
