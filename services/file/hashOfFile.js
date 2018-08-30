const crypto = require('crypto');
const Duplex = require('stream').Duplex;

const _bufferToStream = (buffer) => {
  const stream = new Duplex();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

/**
 * Return the hash of the file buffer
 *
 * @param {Buffer} buffer
 */
exports.hashOfFile = (buffer) =>
  new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash('sha1');
      hash.setEncoding('hex');

      const stream = _bufferToStream(buffer);
      stream.on('end', () => {
        hash.end();
        resolve(hash.read());
      });

      // read all file and pipe it (write it) to the hash object
      stream.pipe(hash);
    } catch (err) {
      reject(err);
    }
  });