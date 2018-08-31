const aws = require('aws-sdk');
const hash = require('../services/file/hashOfFile');
const split = require('../services/file/splitFileName');
const S = require('string');

class S3Storage {
  constructor(accessKey, secretAccessKey, bucket) {
    this.s3 = new aws.S3({
      accessKeyId: accessKey,
      secretAccessKey: secretAccessKey
    });
    this.bucket = bucket;
  }

  async storage(file, category, callback) {
    const { originalname, buffer, mimetype, size } = file;

    if (originalname === undefined || buffer === undefined || mimetype === undefined || size === undefined) {
      throw new Error('File specification failed');
    }

    const fileSplit = split.splitFileName(originalname);
    const fileName = S(fileSplit.name).slugify().s + (fileSplit.ext ? '.' + fileSplit.ext : '');

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
      Bucket: this.bucket,
      ContentType: mimetype,
      Key: `${fileCategory}${fileHash}_${fileName}`
    };

    await this.s3.upload(params, function(err, data) {
      if (!err) {
        data.hash = fileHash;
        data.originalname = fileName;
        data.mimetype = mimetype;
        data.size = size;
      }
      callback(err, data);
    });
  }

  async find(searchQuery, category, callback) {
    let fileCategory = category;
    if (fileCategory !== undefined && fileCategory !== '') {
      if (fileCategory.slice(-1) !== '/') {
        fileCategory += '/';
      }
      if (fileCategory.charAt(0) === '/') {
        fileCategory = fileCategory.slice(1);
      }
    }

    const params = {
      Bucket: this.bucket,
      Prefix: fileCategory
    };

    await this.s3.listObjectsV2(params, function(err, data) {
      let output = [];
      if (data && data.Contents) {
        output = data.Contents.map((object, i) => {
          return {
            fileName: object.Key,
            hash: undefined,
            size: object.Size,
            modify: object.LastModified
          };
        });
      }
      callback(err, output);
    });
  }

  async findOne(fileName, callback) {
    const params = {
      Bucket: this.bucket,
      Key: fileName,
    };

    await this.s3.getObject(params, function(err, data) {
      if (data && data.ETag) {
        callback(err, {
          fileName: fileName,
          contentType: data.ContentType,
          hash: undefined,
          size: data.ContentLength,
          modify: data.LastModified
        });
      } else {
        callback(err, null);
      }
    });
  }

  async getBuffer(fileName, callback) {
    const params = {
      Bucket: this.bucket,
      Key: fileName,
    };

    await this.s3.getObject(params, function(err, data) {
      if (data && data.ETag && data.Body && data.Body) {
        callback(err, {
          buffer: data.Body
        });
      } else {
        callback(err, null);
      }
    });
  }
}

module.exports = S3Storage;