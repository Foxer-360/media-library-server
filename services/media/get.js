// const fs = require('fs');

exports.get = async (s3, fullFileName) => {
  if (s3 === undefined || s3 === null) {
    throw new Error('S3 client not specified');
  }

  if (process.env.AWS_BUCKET === undefined) {
    throw new Error('Environment variable AWS_BUCKET not defined');
  }

  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: fullFileName
  };
  console.log('params', params);
  const object = await s3.getObject(params, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log('s3 object data', data);
  });

  return object;
};