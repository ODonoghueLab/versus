const models = require('../models/index');
const path = require('path');
const multer = require('multer');

const upload = multer({ dest: path.join(__dirname, '../temp/') });

const fileUploader = require('../modules/fileUploader.js');

module.exports = (app) => {
  // Handle Landing
  app.get('/experiment/create', (req, res) => {
    if (req.user) { res.render('createExperiment', { name: req.user.name }); } else { res.render('dash'); }
  });

  // Adds a new experiment to the current user.
  app.post('/experiment/create', upload.array('files'), (req, res) => {
    // Ensure all paramaters have been submitted via POST.
    if (!req.body.name) { res.render('createExperiment', { name: req.user.name, errors: ['Name must be set.'] }); return; }
    if (!req.body.description) { res.render('createExperiment', { name: req.user.name, errors: ['Description must be set.'] }); return; }

    // Upload Images
    fileUploader.upload(app, req, (images, error) => {
      if (error) { res.render('createExperiment', { name: req.user.name, errors: error }); return; }

      // Create the new Experiment.
      models.Experiment.create({ name: req.body.name, description: req.body.description })
        .catch(() => { res.render('error'); return; })
        .then((experiment) => {
          // Create each Image.
          images.map((image) => { //eslint-disable-line
            models.Image.create({ url: image })
              .catch(() => { res.render('error'); return; })
              .then((image) => { //eslint-disable-line
                // Add the Image to the Experiment.
                experiment.addImage(image)
                  .catch(() => { res.render('error'); return; })
                  .then(() => {});
              });
          });

          // Add the Experiment to the current User.
          // TODO: Change magic number user Session User Id.
          experiment.addUser(1);

          // TODO pull experiment names from token or query
          res.render('createExperiment', { experiments: [experiment.name], name: req.user.name, images });
        }); // End Anonymous Callback
    }); // End Upload
  }); // End Post
}; // End Module
