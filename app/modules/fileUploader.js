const path = require('path');
const del = require('del');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '../temp/')});


// require key
let keys;

try {
  keys = require('../config/keys.json');
} catch (err) {
  throw "App Requires app/config/keys.json"
}

// export this module
module.exports.upload = function upload(app, req, callback) {

  const s3 = req.app.get('s3');
  const client = req.app.get('client');

  // get timestamp for file name
  const stamp = String(new Date().getTime());

  // get the uploaded images
  var inputPath = [];
  var targetPath = [];
  var resultImages = [];

  var filesUploaded = 0;

  if(req.files.length < 2) { callback(null, ['Minimum two images.']); return; }

  for(i = 0; i < req.files.length; i++){

    //  * * * * BEGIN LOCAL * * * *

    // or atleast try too..
    try {
      inputPath.push(req.files[i].path);
      targetPath.push(path.join(__dirname, '../temp/', String(stamp) + String(i) +
      path.extname(req.files[i].originalname).toLowerCase()));
    } catch(err) {

      // delete files
      for(i = 0; i < req.files.length; i++){ del(req.files[i].path); }

      callback(null, ['No File Uploaded']);

      return;
    }

    // size checking
    if (req.files[i].size / 1000000 > 2) {

      // delete files
      for(i = 0; i < req.files.length; i++){ del(req.files[i].path); }

      callback(null, ['Please Keep Images Under 2MB']);

      return;
    }

    // handle formats
    var extname = path.extname(req.files[i].originalname).toLowerCase();
    if (extname === '.png') fs.renameSync(inputPath[i], targetPath[i]);
    else if (extname === '.jpg') fs.renameSync(inputPath[i], targetPath[i]);
    else if (extname === '.gif') fs.renameSync(inputPath[i], targetPath[i]);

    // non supported file
    else {

      // delete files
      for(i = 0; i < req.files.length; i++){ del(req.files[i].path); }

      callback(null, ['.png\'s .jpg\'s .gif\'s only!']);

      return;
    }

    //  * * * * BEGIN S3  * * * *


    // uploader parameters
    var params = {
      localFile: targetPath[i],
      s3Params: {
        Bucket: keys.s3.bucket,
        Key: path.basename(targetPath[i]),
      },
    };

    // create uploader
    var uploader = client.uploadFile(params);

    // file couldnt upload
    uploader.on('error', (err) => {

      // delete the files locally for now
      for(i = 0; i < targetPath.length; i++){ del(targetPath[i]); }

    });

    // file is uploading
    uploader.on('progress', () => {

      // TODO This could be sent over as json
      var percentage = uploader.progressAmount / uploader.progressTotal * 100;

    });

    // file is done
    uploader.on('end', () => {

      filesUploaded++;

      // once all files are uploaded
      if(filesUploaded == req.files.length){

        // get the links for every file
        for(i = 0; i < targetPath.length; i++){
          resultImages.push(s3.getPublicUrlHttp(keys.s3.bucket, path.basename(targetPath[i])));
        }

        // check if the links match length
        if(resultImages.length == req.files.length){

          // delete the files locally for now
          for(i = 0; i < targetPath.length; i++){ del(targetPath[i]); }

          // finish
          callback(resultImages);

        }

      }

    });

  } // end file loop
} // module export
