const express = require('express');
const router = express.Router();
const aws = require('aws-sdk');
const mediaList = require('../services/media/get');

const s3 = new aws.S3({
  apiVersion: '2006-03-01',
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

/* GET files listing */
router.get('/', function(req, res, next) {
  mediaList.get(s3, '3d685ba516b87a000b9f2fdb027d3bfe80f5e451_zviratka-pav.jpg');
  res.send('files list');
});

module.exports = router;
