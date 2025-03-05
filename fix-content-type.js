/**
 * This script is single-purpose script to fix Content-Type header for all objects
 * in the bucket! Default Content-Type is `application/octet-stream`. If we recognize
 * known Content-Type like `image/png`, but header will be `application/octet-stream`,
 * than we fix it, otherwise we skip this file...
 *
 * WARNING: Do not run this script unless you know what you are doing!
 */
const aws = require("aws-sdk");
const dotenv = require("dotenv");

// Load environment into `process` object
dotenv.config();

async function main() {
  console.log('Running script to fix object\'s Content-Type in S3 storage');

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
  const ESTIMATED_KEY_COUNT = 12070; // Hard-coded number of objects from AWS Console
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
      promises.push(fixObjectContentTypeHeader(s3, bucket, obj.Key));
    }
    await Promise.all(promises);

    continuationToken = response.NextContinuationToken;
    keyCount += response.KeyCount;

    const progress = Math.round(keyCount / ESTIMATED_KEY_COUNT * 1000) / 10;
    console.log(`Estimation of progress: ${progress}`);
  } while (continuationToken);
}

async function fixObjectContentTypeHeader(s3, bucket, key) {
  const headObject = await s3.headObject({ Bucket: bucket, Key: key }).promise();

  let copySource = `${bucket}/${key}`;
  if (encodeURIComponent(key) !== key) {
    // console.log(`Key ${key} is invalid URL component, using encoded version...`);
    copySource = `${bucket}/${encodeURIComponent(key)}`;
  }

  // Try to detect correct `Content-Type`
  let contentType = headObject.ContentType;
  const parts = key.split(".");
  if (parts.length > 1) {
    const ext = parts.pop();
    contentType = getContentType(ext, contentType);
  }

  // if (contentType !== headObject.ContentType) {
  //   console.log(`Key ${key} switching Content-Type to ${contentType}`);
  // }

  const params = {
    ACL: "public-read",
    Bucket: bucket,
    CacheControl: 'public, max-age=31536000',
    ContentType: contentType,
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

function getContentType(ext, contentType) {
  const guessed = guessContentTypeFromExtension(ext);
  if (!contentType) return guessed;

  contentType = contentType.toLowerCase().trim();
  if (contentType !== 'application/octet-stream') return contentType;

  return guessed;
}

function guessContentTypeFromExtension(ext) {
  ext = ext.toLowerCase();
  if (ext[0] === '.') ext = ext.slice(1);

  switch (ext) {
    // Some common documents
    case 'pdf':
      return 'application/pdf';
    // Some common images
    case 'apng':
      return 'image/apng';
    case 'avif':
      return 'image/avif ';
    case 'gif':
      return 'image/gif';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'svg':
      return 'image/svg+xml';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heif';
    default:
      return 'application/octet-stream';
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
