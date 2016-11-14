

const models = require('../models/index');
const path = require('path');
const multer = require('multer');

const upload = multer({ dest: path.join(__dirname, '../temp/') });

const fileUploader = require('../modules/fileUploader.js');
const routeAuth = require('../modules/isAuth.js');

module.exports = (app) => {
  // [GET] Create a new Experiment for current user.
  app.get('/experiment/create', (req, res) => {
    (req.user) ? res.render('createExperiment', { name: req.user.name }) : res.render('dash');
  });

  // [POST] Create a new Experiment for current user.
  app.post('/experiment/create', routeAuth.isAuth, upload.array('files'), (req, res) => {
    // Ensure all paramaters have been submitted via POST.
    if (!req.body.name) { res.render('createExperiment', { name: req.user.firstName, errors: ['Name must be set.'] }); return; }
    if (!req.body.description) { res.render('createExperiment', { name: req.user.firstName, errors: ['Description must be set.'] }); return; }

    // Upload Images
    fileUploader.upload(app, req, (images, error) => {
      if (error) { res.render('createExperiment', { name: req.user.firstName, errors: error }); return; }

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
          res.render('createExperiment', { experiments: [experiment.name], name: req.user.firstName, images });
        }); // End Anonymous Callback
    }); // End Upload
  });

  // Display a single Experiment.
  app.get('/experiment/:id', (req, res) => {
    console.log(req.params.id);

    // Find the Experiment based on the id from the URL.
    models.Experiment.find({
      where: { id: req.params.id },
      include: [{ model: models.Image, as: 'Images' }],
    }).then((experiment) => {
      console.log(experiment);
      res.render('experiment', { experiment });
    });
  });
};
