const express = require('express');
const router = express.Router();
const S3Storage = require('../libs/s3storage');

/* GET file buffer content */
router.get('/', function(req, res, next) {
  const storage = new S3Storage(
    process.env.AWS_ACCESS_KEY,
    process.env.AWS_SECRET_ACCESS_KEY,
    process.env.AWS_BUCKET
  );

  const fileName = req.query && req.query.fileName ? req.query.fileName : '';

  storage.getBuffer(fileName, (err, data) => {
    if (err) {
      res.status(404).send(err.toString());
    } else {
      res.send(data);
    }
  });
});

module.exports = router;
