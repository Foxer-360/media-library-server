const { request } = require("graphql-request");
const createHash = require("../file/hashOfFile");
const split = require("../file/splitFileName");
const Jimp = require("jimp");
const imagemin = require('imagemin');
const imageminMozJpeg = require('imagemin-mozjpeg');
const imageminWebP = require('imagemin-webp');

class MediaStorage {
  constructor(dataStorage, prismaEndpoint) {
    this.dataStorage = dataStorage;
    this.endpoint = prismaEndpoint;

    this.supportedConversions = {
      'webp': {
        mime: 'image/webp',
        convert: MediaStorage.convertToWebP
      }
    };
  }

  async storage(file, category, callback, hash = undefined, type) {
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
                    console.log('Called callback #1');
                    callback(saveUploadErr, {
                      ...dataStorageData,
                      ...saveUploadData
                    });
                  }
                );
              } else {
                console.log('Called callback #2');
                callback(dataStorageErr, dataStorageData);
              }
            } else {
              // unknown or error uploading
              console.log('Called callback #3');
              callback(dataStorageErr, dataStorageData);
            }
          },
          fileHash
        );
      } else {
        console.log('Called callback #4');
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

  delete(id, callback) {
    const query = `
      mutation {
        deleteFile(where:{id: "${id}"}) {
          id
        }  
      }
    `;
    request(this.endpoint, query).then(data => {
      callback(null, data);
    }).catch((err) => callback(err,null));
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

  optimizeWithMozJpeg(buffer) {
    return new Promise(resolve =>
      imagemin.buffer(buffer, {
        plugins: [imageminMozJpeg({ progressive: true })]
      })
      .then(buffer => resolve(buffer))
      .catch((e) => {
        console.error('Could not optimize image with mozjpeg: ', e);
        return buffer;
      })
    );
  }

  static convertToWebP(buffer) {
    return new Promise(resolve =>
      imagemin.buffer(buffer, {
        plugins: [imageminWebP()]
      })
      .then(buffer => resolve(buffer))
      .catch((e) => {
        console.error('Could not convert image to WEBP: ', e);
        return buffer;
      })
    );
  }

  convert(buffer, format) {
    if (this.supportedConversions[format] && this.supportedConversions[format].convert) {
      return this.supportedConversions[format].convert(buffer);
    } else {
      return Promise.reject('Invalid converter ' + format);
    }
  }

  async createDimension(fileId, newWidth, newHeight, callback, outputFormat) {
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
            callback("Unsupported file format", null);
        }

        // search file content
        this.dataStorage.getBuffer(
          data.file.category + data.file.hash + "_" + data.file.filename,
          (bufferErr, bufferData) => {
            if (bufferData && bufferData.buffer) {
              // resize
              Jimp.read(bufferData.buffer)
                // resize image by ratio - there is opposite logic with ration because of covers
                .then(image => {
                  const originalRatio = image.getWidth() / image.getHeight();
                  const newRatio = parseInt(newWidth, 10) / parseInt(newHeight, 10);

                  if(originalRatio > newRatio) return image.resize(Jimp.AUTO, parseInt(newHeight, 10));
                  return image.resize(parseInt(newWidth, 10), Jimp.AUTO);
                })
                // create cover image - to be filled with image, no borders
                .then(image =>
                  image.cover(
                    parseInt(newWidth, 10),
                    parseInt(newHeight, 10),
                    Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE
                  )
                )
                // optimize if it's possible and save to storage
                .then(image => {
                  image.getBuffer(
                    data.file.mimetype,
                    async (resizeErr, buffer) => {
                      if (resizeErr) {
                        callback(resizeErr, null);
                      }

                      let optimizing = Promise.resolve(buffer);
                      if (!outputFormat && (data.file.mimetype === Jimp.MIME_JPEG)) {
                        optimizing = this.optimizeWithMozJpeg(buffer);
                      } else if (outputFormat) {
                        optimizing = this.convert(buffer, outputFormat);
                      }

                      // generate hash from resize buffer
                      // const resizeHash = await hash.hashOfFile(buffer);

                      const convertedMime = this.supportedConversions[outputFormat].mime;
                      if (outputFormat && !convertedMime) {
                        return callback('Unspecified MIME for ' + outputFormat, null);
                      }

                      optimizing.then((buffer) => {
                        // generate file name
                        const fileInfo = split.splitFileName(data.file.filename);
                        const newFileName = `${fileInfo.name}_${newWidth ||
                          "x"}_${newHeight || "x"}.${outputFormat || fileInfo.ext}`;

                        const newFile = {
                          originalname: newFileName,
                          filename: newFileName,
                          buffer: buffer,
                          mimetype: convertedMime || data.file.mimetype,
                          size: buffer.byteLength
                        };

                        // save file to storage
                        this.storage(
                          newFile,
                          data.file.category,
                          (saveErr, saveData) => {
                            console.log(saveErr, saveData);
                            callback(saveErr, saveData);
                          },
                          data.file.hash
                        );
                      })
                      .catch((err) => consol.error(err))
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
