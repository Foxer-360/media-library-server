const express = require("express");
const router = express.Router();
const S3Storage = require("../libs/s3storage");
const MediaStorage = require("../services/media/mediaStorage");

/* POST create dimension */
router.post("/", function(req, res, next) {
  if (req.body.id && (req.body.width || req.body.height)) {
    // search file of id
    const storage = new S3Storage(
      process.env.AWS_ACCESS_KEY,
      process.env.AWS_SECRET_ACCESS_KEY,
      process.env.AWS_BUCKET
    );

    const mediaStorage = new MediaStorage(storage, process.env.PRISMA_ENDPOINT);

    mediaStorage.createDimension(
      req.body.id,
      req.body.width,
      req.body.height,
      (err, data) => {
        if (err) {
          res.status(404).send(err.toString());
        } else {
          res.send(data);
        }
      }
    );
  } else {
    let param = "";
    if (!req.body.id) {
      param = "`id`";
    } else if (!req.body.width && !req.body.height) {
      param = "`width` or `height`";
    }
    res.status(404).send(`Dimension conditions ${param} not found`);
  }
});

module.exports = router;
