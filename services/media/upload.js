const hash = require('../file/hashOfFile');

const imagemin = require('imagemin');
const imageminMozJpeg = require('imagemin-mozjpeg');

exports.upload = async (s3, file, category, callback) => {
  if (s3 === undefined || s3 === null) {
    throw new Error('S3 client not specified');
  }

  if (process.env.AWS_BUCKET === undefined) {
    throw new Error('Environment variable AWS_BUCKET not defined');
  }

  const { originalname, buffer, mimetype, size } = file;

  if (originalname === undefined || buffer === undefined || mimetype === undefined || size === undefined) {
    throw new Error('File specification failed');
  }

  let fileCategory = category;
  if (fileCategory !== undefined && fileCategory !== '') {
    if (fileCategory.slice(-1) !== '/') {
      fileCategory += '/';
    }
    if (fileCategory.charAt(0) === '/') {
      fileCategory = fileCategory.slice(1);
    }
  }

  const fileHash = await hash.hashOfFile(buffer);

  const params = {
    ACL: 'public-read',
    Body: buffer,
    Bucket: process.env.AWS_BUCKET,
    ContentType: mimetype,
    Key: `${fileCategory}${fileHash}_${originalname}`
  };

  await s3.upload(params, function(err, data) {
    if (!err) {
      data.hash = fileHash;
      data.originalname = originalname;
      data.mimetype = mimetype;
      data.size = size;
    }
    callback(err, data);
  });
};