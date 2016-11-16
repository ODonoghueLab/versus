

const models = require('../models/index');
const path = require('path');
const multer = require('multer');

const upload = multer({ dest: path.join(__dirname, '../temp/') });

const fileUploader = require('../modules/fileUploader.js');
const routeAuth = require('../modules/isAuth.js');

module.exports = (app) => {
  // [GET] Create a new Experiment for current user.
  app.get('/experiment/create', (req, res) => res.render('experiment-create'));

  // [POST] Create a new Experiment for current user.
  app.post('/experiment/create', routeAuth.isAuth, upload.array('experiment[images]'), (req, res) => {
    console.log(req.body);
    
    // Ensure required parameters have been submitted.
    if (!req.body.experiment || !req.body.experiment['name'] || !req.files) return res.redirect(301, 'experiment-create', { error: 'Please enter all required fields.' });
    
    // Upload the Images to S3.
    fileUploader.upload(app, req, (images, error) => {
      if (error) return res.redirect(301, 'experiment-create', { error: true });

      // Create the new Experiment.
      models.Experiment.create({ name: req.body.experiment['name'], description: req.body.experiment['description'] })
        .then(experiment => {
          
          // Create each Image.
          images.map(image => {
            models.Image.create({ url: image })
              .then(image => {
                
                // Add the Image to the Experiment.
                experiment.addImage(image)
                  .catch(_ => res.redirect(301, 'experiment-create', { error: true }));
              })
              .catch(_ => res.redirect(301, 'experiment-create', { error: true }));
          });

          // Add the Experiment to the current User.
          experiment.addUser(req.user.id)
            .catch(_ => res.redirect(301, 'experiment-create', { error: true }))
            .then(_ => res.redirect(301, '/dashboard'));
        })
        .catch(_ => res.redirect(301, 'experiment-create', { error: true }));
    });
  });

  // [GET] Display a single Experiment.
  app.get('/experiment/:id', (req, res) => {
    // Find the Experiment based on the id from the URL.
    models.Experiment.find({
      where: { id: req.params.id },
      include: [{ model: models.Image, as: 'Images' }],
    }).then((experiment) => {
      res.render('experiment', { experiment });
    });
  });
  
  // [POST] Delete an Experiment
  app.post('/experiment/delete', (req, res) => {
    // TODO: probably should make sure the user owns the experiment too?
    
    models.Experiment.destroy({ where: { id: req.body.id } })
      .catch(err => res.json({ success: false, error: err }))
      .then(_ => res.json({ success: true }))
  })
};
