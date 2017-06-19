const path = require('path');
const del = require('del');
const fs = require('fs');
const multer = require('multer');
const _ = require('lodash');
const config = require('../config')
const filesDir = require('../config').filesDir
const upload = multer({ dest: filesDir }); // eslint-disable-line


// export this module

/**
 *
 * @param app - express app
 * @param req - file upload request
 * @param callback - function(imageUrls | null, errorMsg)
 */
module.exports = {
  uplood (app, req, callback) {
    // const s3 = req.app.get('s3');
    // const client = req.app.get('client');

    // get timestamp for file name
    const stamp = String(new Date().getTime());

    // get the uploaded images
    const inputPath = [];
    const targetPath = [];
    const savedBasenames = [];

    function fail(msg) {
      for (let i = 0; i < req.files.length; i += 1) {
        del(req.files[i].path);
      }
      callback(null, [msg]);
    }

    console.log('upload', req.files)

    if (req.files.length < 2) {
      callback(null, ['Minimum two images.']);
      return;
    }

    for (let i = 0; i < req.files.length; i += 1) {

      // handle formats
      const extname = path.extname(req.files[i].originalname).toLowerCase();
      if (!_.includes(['.png', '.jpg', '.gif'], extname)) {
        fail(`only png's, jpg's, gif's`);
        return;
      } 

      // size checking
      if (req.files[i].size / 1000000 > 2) {
        fail('Please Keep Images Under 2MB');
        return;
      }

      try {
        let basename = String(stamp) + String(i) + extname;
        savedBasenames.push(basename);
        console.log('file', req.files[i].path, path.join(filesDir, basename))
        inputPath.push(req.files[i].path);
        targetPath.push(path.join(filesDir, basename));
        fs.renameSync(inputPath[i], targetPath[i]);
      } catch (err) {
        fail(err);
        return;
      }
    } 

    const imageUrls = _.map(savedBasenames, b => `/experiment/image/${b}`);

    callback(imageUrls);
  },
  uploadFiles (files) {
    const stamp = String(new Date().getTime());

    return new Promise((resolve, reject) => {
      let err = ''

      function rollback(msg) {
        for (let i = 0; i < files.length; i += 1) {
          del(files[i].path);
        }
        err = msg
      }

      const savedBasenames = []
      const inputPaths = [];
      const targetPaths = [];

      if (files.length < 2) {
        err = 'Minimum two images.'
      } else {
        for (let i = 0; i < files.length; i += 1) {
          let file = files[i]
          const extname = path.extname(file.originalname).toLowerCase();
          // handle formats
          if (!_.includes(['.png', '.jpg', '.gif'], extname)) {
            rollback(`only png's, jpg's, gif's`);
            break
          } 
          // size checking
          if (file.size / 1000000 > 2) {
            rollback('Please Keep Images Under 2MB');
            break
          }
          let basename = String(stamp) + String(i) + extname
          savedBasenames.push(basename)
          inputPaths.push(file.path)
          targetPaths.push(path.join(filesDir, basename))
          try {
            fs.renameSync(inputPaths[i], targetPaths[i])
            console.log('upload', path.basename(inputPaths[i]), '->', basename)
          } 
          catch (err) {
            rollback(err)
            break
          }
        } 
      }      
      if (err) {
        reject(err)
      } else {
        resolve(targetPaths)
      }
    })
  }

}



// // require key
// let keys;

// try {
//   keys = require('../../config/keys.json'); // eslint-disable-line
// } catch (err) {
//   throw 'App Requires app/config/keys.json'; // eslint-disable-line
// }

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