const { request } = require("graphql-request");
const createHash = require("../file/hashOfFile");
const split = require("../file/splitFileName");
const Jimp = require("jimp");

class MediaStorage {
  constructor(dataStorage, prismaEndpoint) {
    this.dataStorage = dataStorage;
    this.endpoint = prismaEndpoint;
  }

  async storage(file, category, callback, hash = undefined) {
    const { originalname, buffer, mimetype, size } = file;

    if (
      originalname === undefined ||
      buffer === undefined ||
      mimetype === undefined ||
      size === undefined
    ) {
      throw new Error("File specification failed");
    }

    const fileHash = hash || (await createHash.hashOfFile(buffer));

    await this.findByHash(fileHash, async (err, data) => {
      // file not exists
      if (hash || (data && data.file !== undefined && data.file === null)) {
        // upload to storage
        await this.dataStorage.storage(
          file,
          category,
          (dataStorageErr, dataStorageData) => {
            // save to prisma
            if (dataStorageData && dataStorageData.ETag) {
              // save uploaded file to MediaStorage

              if (!hash) {
                this.saveToStorage(
                  dataStorageData,
                  (saveUploadErr, saveUploadData) => {
                    callback(saveUploadErr, saveUploadData);
                  }
                );
              }
            } else {
              // unknown or error uploading
              callback(dataStorageErr, dataStorageData);
            }
          },
          fileHash
        );
      } else {
        callback(err, data);
      }
    });
  }

  saveToStorage(fileData, callback) {
    const query = `
      mutation {
        createFile(data: {
          hash: "${fileData.hash}",
          category: "${fileData.category}",
          filename: "${fileData.filename}",
          mimetype: "${fileData.mimetype}",
          size: ${fileData.size}
        }) {
          id
          hash
          category
          filename
          mimetype
          size
        }
      }
    `;

    request(this.endpoint, query).then(data => {
      callback(null, data);
    });
  }

  find(category, callback) {
    const query = `{
      files(
        where: {
          ${
            category !== undefined && category !== null
              ? `category: "${category}"`
              : ``
          }
        }
      ) {
        id
        hash
        category
        filename
        mimetype
        size
      }
    }`;

    request(this.endpoint, query).then(data => {
      callback(null, data);
    });
  }

  findByFilename(filename, callback) {
    const query = `{
      files(
        where: {
          ${
            filename !== undefined && filename !== null
              ? `filename: "${filename}"`
              : ``
          }
        }
      ) {
        id
        hash
        category
        filename
        mimetype
        size
      }
    }`;

    request(this.endpoint, query).then(data => {
      callback(null, data);
    });
  }

  findByHash(hash, callback) {
    const query = `{
      file(
        where: {
          hash: "${hash}"
        }
      ) {
        id
        hash
        category
        filename
        mimetype
        size
      }
    }`;

    request(this.endpoint, query).then(data => {
      callback(null, data);
    });
  }

  findOne(fileId, callback) {
    const query = `{
      file(
        where: {
          id: "${fileId}"
        }
      ) {
        id
        hash
        category
        filename
        mimetype
        size
      }
    }`;

    request(this.endpoint, query).then(data => {
      callback(null, data);
    });
  }

  async createDimension(fileId, newWidth, newHeight, callback) {
    // search file of id
    await this.findOne(fileId, (err, data) => {
      if (data && data.file) {
        // check mimetype
        switch (data.file.mimetype) {
          case Jimp.MIME_BMP:
          case Jimp.MIME_GIF:
          case Jimp.MIME_JPEG:
          case Jimp.MIME_PNG:
          case Jimp.MIME_TIFF:
            break;
          default:
            callback("unsupported file format", null);
        }

        // search file content
        this.dataStorage.getBuffer(
          data.file.category + data.file.hash + "_" + data.file.filename,
          (bufferErr, bufferData) => {
            if (bufferData && bufferData.buffer) {
              // resize
              Jimp.read(bufferData.buffer)
                .then(image =>
                  image.resize(
                    parseInt(newWidth, 10) || Jimp.AUTO,
                    parseInt(newHeight, 10) || Jimp.AUTO
                  )
                )
                .then(image => {
                  image.getBuffer(
                    data.file.mimetype,
                    async (resizeErr, buffer) => {
                      if (resizeErr) {
                        callback(resizeErr, null);
                      }

                      // generate hash from resize buffer
                      // const resizeHash = await hash.hashOfFile(buffer);

                      // generate file name
                      const fileInfo = split.splitFileName(data.file.filename);
                      const newFileName = `${fileInfo.name}_${newWidth ||
                        "x"}_${newHeight || "x"}.${fileInfo.ext}`;

                      const newFile = {
                        originalname: newFileName,
                        filename: newFileName,
                        buffer: buffer,
                        mimetype: data.file.mimetype,
                        size: buffer.byteLength
                      };

                      // save file to storage
                      this.storage(
                        newFile,
                        data.file.category,
                        (saveErr, saveData) => {
                          callback(saveErr, saveData);
                        },
                        data.file.hash
                      );
                    }
                  );
                });
            } else {
              callback("Buffer of file not found", null);
            }
          }
        );
      } else {
        callback(err, data);
      }
    });
  }
}

module.exports = MediaStorage;
