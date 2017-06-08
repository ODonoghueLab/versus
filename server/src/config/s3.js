const s3 = require('s3');

let keys;

try {
  keys = require('../config/keys.json'); // eslint-disable-line
} catch (err) {
  throw 'App Requires app/config/keys.json'; // eslint-disable-line
}

module.exports.s3 = s3;
module.exports.client = s3.createClient({
  maxAsyncS3: 20,
  s3RetryCount: 3,
  s3RetryDelay: 1000,

  // This is 20MB
  multipartUploadThreshold: 20971520,

  // This is 15MB
  multipartUploadSize: 15728640,

  s3Options: {
    accessKeyId: keys.s3.id,
    secretAccessKey: keys.s3.secret,
    region: keys.s3.region,
  },
});
