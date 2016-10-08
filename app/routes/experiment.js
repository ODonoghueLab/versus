"user strict";

const async = require('async');
const models = require('../models');

module.exports = (app) => {

  // Adds a new experiment to the current user.
  app.post('/experiment/create', (req, res) => {
    // Ensure all paramaters have been submitted via POST.
    if (!req.body.name) { res.json({ success: false, error: 'Name must be set.' }); return; }
    if (!req.body.description) { res.json({ success: false, error: 'Description must be set.' }); return; }
    // TODO: Check at least two images have been selected.

    // TODO: Upload provided images.
    // This is just in an attempt to simulate images until that's implimented.
    let images = req.body.images.split(', ');

    // Create the new Experiment.
    models.Experiment.create({ name: req.body.name, description: req.body.description, })
      .catch(error => { res.json({ success: false, error: 'Error creating Experiment.' }); return; })
      .then((experiment) => {

        // Create each Image.
        images.map((image) => {
          models.Image.create({ url: image })
            .catch(error => { res.json({ success: false, error: 'Error creating Image.' }); return; })
            .then((image) => {

              // Add the Image to the Experiment.
              experiment.addImage(image)
                .catch(error => { res.json({ success: false, error: 'Error adding Image to Experiment.' }); return; })
                .then(() => console.log('Everything worked!'));
            });
        });

        // Add the Experiment to the current User.
        // TODO: Change magic number user Session User Id.
        experiment.addUser(1)
      });
  });
};
