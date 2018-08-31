const express = require('express');
const router = express.Router();
const S3Storage = require('../libs/s3storage');

/* GET files list */
router.get('/', function(req, res, next) {
  const storage = new S3Storage(
    process.env.AWS_ACCESS_KEY,
    process.env.AWS_SECRET_ACCESS_KEY,
    process.env.AWS_BUCKET
  );

  const category = req.query && req.query.category ? req.query.category : '';

  storage.find(null, category, (err, data) => {
    if (err) {
      res.status(404).send(err.toString());
    } else {
      res.send(data);
    }
  });
});

module.exports = router;
