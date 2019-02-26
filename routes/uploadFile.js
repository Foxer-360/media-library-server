const express = require("express");
const router = express.Router();
const multer = require("multer");
const S3Storage = require("../libs/s3storage");
const MediaStorage = require("../services/media/mediaStorage");

const upload = multer();

router.post("/", upload.single("file"), function(req, res, next) {
  try {
    const storage = new S3Storage(
      process.env.AWS_ACCESS_KEY,
      process.env.AWS_SECRET_ACCESS_KEY,
      process.env.AWS_BUCKET
    );

    const mediaStorage = new MediaStorage(storage, process.env.PRISMA_ENDPOINT);


    mediaStorage.storage(req.file, req.body.category, (err, data) => {
      if (err) {
        res.status(404).send(err.toString());
      } else {
        res.send(data);
      }
    });
  } catch (err) {
    res.status(404).send(err.toString());
  }
});

module.exports = router;
