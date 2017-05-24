const path = require('path');
const del = require('del');
const fs = require('fs');
const multer = require('multer');
const _ = require('lodash');
const upload = multer({ dest: path.join(__dirname, '../temp/') }); // eslint-disable-line

// require key
let keys;

try {
  keys = require('../config/keys.json'); // eslint-disable-line
} catch (err) {
  throw 'App Requires app/config/keys.json'; // eslint-disable-line
}

// export this module

/**
 *
 * @param app
 * @param req - file upload request
 * @param callback - function(imageUrls | null, errorMsg)
 */
module.exports.upload = (app, req, callback) => {
  const s3 = req.app.get('s3');
  const client = req.app.get('client');

  // get timestamp for file name
  const stamp = String(new Date().getTime());

  // get the uploaded images
  const inputPath = [];
  const targetPath = [];
  const imageUrls = [];
  const savedBasenames = [];

  let filesUploaded = 0;

  if (req.files.length < 2) {
    callback(null, ['Minimum two images.']);
    return;
  }

  function fail(msg) {
    for (let i = 0; i < req.files.length; i += 1) {
      del(req.files[i].path);
    }
    callback(null, [msg]);
  }

  for (let i = 0; i < req.files.length; i += 1) {

    //  * * * * BEGIN LOCAL * * * *

    const extname = path.extname(req.files[i].originalname).toLowerCase();

    // or atleast try too..
    try {
      let basename = String(stamp) + String(i) + extname;
      savedBasenames.push(basename);
      inputPath.push(req.files[i].path);
      targetPath.push(path.join(__dirname, '..', 'temp', basename));
    } catch (err) {
      fail('No File Uploaded');
      return;
    }

    // handle formats
    if (_.includes(['.png', '.jpg', '.gif'], extname)) {
      fs.renameSync(inputPath[i], targetPath[i]);
    } else {
      fail('only png\'s, jpg\'s, gif\'s');
      return;
    }

    // size checking
    if (req.files[i].size / 1000000 > 2) {
      fail('Please Keep Images Under 2MB');
      return;
    }

    filesUploaded += 1;
    if (filesUploaded === req.files.length) {
      // get the links for every file
      for (let i = 0; i < savedBasenames.length; i += 1) {
        imageUrls.push(`/experiment/image/${savedBasenames[i]}`);
      }
      callback(imageUrls);
      return;
    }

    //  * * * * BEGIN S3  * * * *


    // // uploader parameters
    // const params = {
    //   localFile: targetPath[i],
    //   s3Params: {
    //     Bucket: keys.s3.bucket,
    //     Key: path.basename(targetPath[i]),
    //   },
    // };
    //
    // // create uploader
    // const uploader = client.uploadFile(params);
    //
    // // file couldnt upload
    // uploader.on('error', () => {
    //   // delete the files locally for now
    //   for (let deleteVar = 0; deleteVar < req.files.length; deleteVar += 1) {
    //     del(targetPath[deleteVar]);
    //   }
    // });
    //
    // // file is uploading
    // uploader.on('progress', () => {
    //   // TODO This could be sent over as json
    //   // const percentage = uploader.progressAmount / uploader.progressTotal / 0.1;
    // });
    //
    // // file is done
    // uploader.on('end', () => { //eslint-disable-line
    //   filesUploaded += 1;
    //
    //   // once all files are uploaded
    //   if (filesUploaded === req.files.length) {
    //     // get the links for every file
    //     for (let link = 0; link < targetPath.length; link += 1) {
    //       resultImages.push(s3.getPublicUrlHttp(keys.s3.bucket, path.basename(targetPath[link])));
    //     }
    //
    //     // check if the links match length
    //     if (resultImages.length === req.files.length) {
    //       // delete the files locally for now
    //       for (let deleteVar = 0; deleteVar < req.files.length; deleteVar += 1) {
    //         del(targetPath[deleteVar]);
    //       }
    //
    //       // finish
    //       callback(resultImages);
    //     }
    //   }
    // });
  } // end file loop
}; // module export
