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
    // Ensure required parameters have been submitted.
    if (!req.body.experiment || !req.body.experiment.name || !req.files) {
      return res.redirect(301, 'experiment-create', { error: 'Please enter all required fields.' });
    }

    // Upload the Images to S3.
    fileUploader.upload(app, req, (images, error) => {
      if (error) return res.redirect(301, 'experiment-create', { error: true });

      // Create the new Experiment.
      models.Experiment.create({
        name: req.body.experiment.name,
        description: req.body.experiment.description,
      }).then((experiment) => {
        // Create each Image.
        images.forEach((image) => {
          models.Image.create({ url: image })
              .then((imageInstance) => {
                // Add the Image to the Experiment.
                experiment.addImage(imageInstance)
                  .catch(() => res.redirect(301, 'experiment-create', { error: true }));
              })
              .catch(() => res.redirect(301, 'experiment-create', { error: true }));
        });

          // Add the Experiment to the current User.
        experiment.addUser(req.user.id, { permission: 0 })
            .catch(() => res.redirect(301, 'experiment-create', { error: true }))
            .then(() => res.redirect(301, '/dashboard'));
      })
        .catch(() => res.redirect(301, 'experiment-create', { error: true }));

      return null;
    });

    return null;
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

  // [GET] Display Experiment Results
  app.get('/experiment/:id/results', (req, res) => {
    // TODO: Russel; plz stop using SQL, we have an ORM for a reason.
    // const findQuery = 'SELECT "Ranks" FROM "Results"' +
    //   ' WHERE "ExperimentId"=\'' + req.params.id + '\'';
    // models.sequelize.query(findQuery).spread((allResults) => {
    //   // Returns a Result Array of Image Arrayss
    //   const results = allResults.map((obj) => { //eslint-disable-line
    //     return obj.Ranks;
    //   });
    // });

    // Fetch Experiment Details and display Results.
    models.Experiment.findOne({
      where: { id: req.params.id },
      include: [{ model: models.Result, as: 'Results' }],
    }).then(experiment => res.render('experiment-results', { experiment }));
  });

  // [POST] Send Data for Download
  app.post('/experiment/:id/results', (req, res) => {
    const findQuery = 'SELECT * FROM "Results"' +              //eslint-disable-line
      ' WHERE "ExperimentId"=\'' + req.params.id + '\'';                          //eslint-disable-line
    models.sequelize.query(findQuery).spread((allResults) => {
      const results = [];

      // Appends Object of Results
      allResults.map((obj) => { //eslint-disable-line
        results.push({
          age: obj.age,
          gender: obj.gender,
          ranks: obj.Ranks,
          time: {
            start: obj.createdAt,
            end: obj.updatedAt,
          },
        });
      });

      res.json(JSON.stringify(results, null, 2));
    });
  });

  // [POST] Delete an Experiment
  app.post('/experiment/delete', (req, res) => {
    // TODO: probably should make sure the user owns the experiment too?

    models.Experiment.destroy({ where: { id: req.body.id } })
      .catch(err => res.json({ success: false, error: err }))
      .then(() => res.json({ success: true }));
  });
};
