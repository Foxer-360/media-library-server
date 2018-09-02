const { request } = require('graphql-request')
const hash = require('../file/hashOfFile');

class MediaStorage {
  constructor(dataStorage, prismaEndpoint) {
    this.dataStorage = dataStorage;
    this.endpoint = prismaEndpoint;
  };

  async storage(file, category, callback) {
    const { originalname, buffer, mimetype, size } = file;

    if (originalname === undefined || buffer === undefined || mimetype === undefined || size === undefined) {
      throw new Error('File specification failed');
    }

    const fileHash = await hash.hashOfFile(buffer);

    await this.findByHash(fileHash, async (err, data) => {
      // file not exists
      if (data && data.file !== undefined && data.file === null) {
        // upload to storage
        await this.dataStorage.storage(file, category, (dataStorageErr, dataStorageData) => {
          // save to prisma
          if (dataStorageData && dataStorageData.ETag) {
            // save uploaded file to MediaStorage
            this.saveToStorage(dataStorageData, (saveUploadErr, saveUploadData) => {
              callback(saveUploadErr, saveUploadData);
            });
          } else {
            // unknown or error uploading
            callback(dataStorageErr, dataStorageData);
          }
        });
      } else {
        callback(err, data);
      }
    });
  };

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
          ${category !== undefined && category !== null ? `category: "${category}"` : ``}
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
}

module.exports = MediaStorage;