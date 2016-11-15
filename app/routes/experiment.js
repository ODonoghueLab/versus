const models = require('../models/index');
const path = require('path');
const multer = require('multer');

const upload = multer({ dest: path.join(__dirname, '../temp/') });

const fileUploader = require('../modules/fileUploader.js');
const routeAuth = require('../modules/isAuth.js');

function Node(imageIndex, left, right){
  this.imageIndex = imageIndex;
  this.left = left;
  this.right = right;
}

module.exports = (app) => {
  // [GET] Create a new Experiment for current user.
  app.get('/experiment/create', (req, res) => {
    (req.user) ? res.render('createExperiment', { name: req.user.name }) : res.render('dash'); //eslint-disable-line
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
    // Find the Experiment based on the id from the URL.
    models.Experiment.find({
      where: { id: req.params.id },
      include: [{ model: models.Image, as: 'Images' }],
    }).then((experiment) => {
      res.render('experiment', { experiment });
    });
  });


  // Comparison Test
  app.get('/experiment/:id/:uuid', (req, res) => {
    // Check ID
    models.Invite.findOne({
      where: { inviteId: req.params.uuid },
    }).then(() => {
      res.render('experimentTest', {});
    }).catch(() => {
      res.render('error');
    });
  });

  app.post('/experiment/:id/:uuid', (req, res) => {
    // Check ID
    models.Invite.findOne({
      where: { inviteId: req.params.uuid },
    }).then(() => {
      console.log('Recieved: ', req.body);

      // Grab Experiment Images
      models.Experiment.find({
        where: { id: req.params.id },
        include: [{ model: models.Image, as: 'Images' }],
      }).then((experiment) => {
        // Get Image Buffer
        const items = experiment.Images;

        // The User Just Started
        // Wants first 2
        if (req.body.start === true) {
          // Initialise Result Object
          models.Result.create({
            inviteId: req.params.uuid,
            age: 0,
            gender: 'other',
            imageIndex: 0,
            treeIndex: 0,
            tree: {},
          }).then((result) => {
            // Append Root Node
            result.tree[result.treeIndex] = new Node(result.treeIndex, undefined, undefined);
            result.save().then(() => {
              // Send the index of the image
              // Along with url attached to index
              const information = {
                itemA: {
                  value: result.tree[result.treeIndex].imageIndex,
                  url: items[result.tree[result.treeIndex].imageIndex],
                },
                itemB: {
                  value: result.tree[result.treeIndex].imageIndex + 1,
                  url: items[result.tree[result.treeIndex].imageIndex + 1],
                },
              };

              // Increment ImageIndex
              result.imageIndex += 1; //eslint-disable-line
              result.save().then(() => {
                // Send Resulting Comparison
                res.json(information);
                console.log('Sending: ', information);
              }).catch((err) => {
                console.log(err);
              });
            });
          }).then((err) => {
            console.log(err);
          });
        }

        // The User Has Started
        // Wants Next Data
        if(typeof req.body.itemA !== typeof undefined || typeof req.body.itemB !== typeof undefined) {
          const information = {};
          const tag = (typeof req.body.itemA !== typeof undefined) ? 'itemB' : 'itemA';
          information[tag] = {
            value: '' + (Math.round(Math.random() * 10)),
            url: 'http://lorempixel.com/400/600/',
          };
          res.json(information);
          console.log('Sending: ', information);
        }
      }).catch(err => console.log(err));
    }).catch(() => {
      res.render('error');
    });

  });
};
