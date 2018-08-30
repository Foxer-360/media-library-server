const express = require('express');
const router = express.Router();
const multer = require('multer');
const aws = require('aws-sdk');
const mediaUpload = require('../services/media/upload');

const upload = multer();

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

router.post('/', upload.single('file'), function (req, res, next) {
  try {
    mediaUpload.upload(s3, req.file, req.body.category, (err, data) => {
      if (err) {
        console.log('err', err);
      } else {
        console.log('success', data);
        res.send('file upload');
      }
    });
  } catch (err) {
    res.status(404).send(err.toString());
  }
});

module.exports = router;
