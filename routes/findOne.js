const express = require('express');
const router = express.Router();
const S3Storage = require('../libs/s3storage');
const MediaStorage = require('../services/media/mediaStorage');

/* GET file detail */
router.get('/', function(req, res, next) {
  const storage = new S3Storage(
    process.env.AWS_ACCESS_KEY,
    process.env.AWS_SECRET_ACCESS_KEY,
    process.env.AWS_BUCKET
  );

  const mediaStorage = new MediaStorage(
    storage,
    process.env.PRISMA_ENDPOINT
  );

  if (req.query.id !== undefined) {
    mediaStorage.findOne(req.query.id, (err, data) => {
      if (err) {
        res.status(404).send(err.toString());
      } else {
        res.send(data);
      }
    });
  } else

  if (req.query.hash !== undefined) {
    mediaStorage.findByHash(req.query.hash, (err, data) => {
      if (err) {
        res.status(404).send(err.toString());
      } else {
        res.send(data);
      }
    });
  } else {

    res.status(404).send('File conditions (`id` or `hash`) not found');
  }


  /*storage.findOne(fileName, (err, data) => {
    if (err) {
      res.status(404).send(err.toString());
    } else {
      res.send(data);
    }
  });*/
});

module.exports = router;
