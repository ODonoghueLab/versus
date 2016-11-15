const models = require('../models/index');
const path = require('path');
const multer = require('multer');

const upload = multer({ dest: path.join(__dirname, '../temp/') });

const fileUploader = require('../modules/fileUploader.js');
const routeAuth = require('../modules/isAuth.js');

function Node(imageIndex, left, right) {
  this.imageIndex = imageIndex;
  this.left = left;
  this.right = right;
}

module.exports = (app) => {
  // [GET] Create a new Experiment for current user.
  app.get('/experiment/create', (req, res) => {
    (req.user) ? res.render('createExperiment', { name: req.user.firstName }) : res.render('dash'); //eslint-disable-line
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
      models.Experiment.create({ name: req.body.firstName, description: req.body.description })
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
      console.log('Recieved: ', req.body, '\n\n');

      // Grab Experiment Images
      models.Experiment.find({
        where: { id: req.params.id },
        include: [{ model: models.Image, as: 'Images' }],
      }).then((experiment) => {
        // Get Image Buffer
        const items = experiment.Images.map((obj) => {
          return obj.get({plain: true}).url;
        });
        console.log('Got the images:');
        console.log(items);
        console.log('\n\n');

        // Phase 1
        // The User Just Started
        // Wants first 2
        if (req.body.start === true) {
          console.log('Phase 1\n\n');
          // Initialise Result Object
          models.Result.findOrCreate({
            where: { inviteId: req.params.uuid },
            defaults: {
              age: 0,
              gender: 'other',
              imageIndex: 0,
              treeIndex: 0,
              tree: JSON.stringify('{}'),
              ExperimentId: req.params.id,
            },
          }).spread((result) => {
            const state = result.get({ plain: true });
            console.log('Got the users state');
            console.log(state);
            console.log('\n\n');

            // Append Root Node
            state.tree[state.treeIndex] = new Node(state.treeIndex, undefined, undefined);

            // Update State
            result.update({
              tree: state.tree,
            }, {
              where: { id: 1 },
            }).then(() => {
            // Send the index of the image
            // Along with url attached to index
              const information = {
                itemA: {
                  value: state.tree[state.treeIndex].imageIndex,
                  url: items[state.tree[state.treeIndex].imageIndex],
                },
                itemB: {
                  value: state.tree[state.treeIndex].imageIndex + 1,
                  url: items[state.tree[state.treeIndex].imageIndex + 1],
                },
              };

            // Increment ImageIndex
            state.imageIndex += 1; //eslint-disable-line

            // Update State
              result.update({
                imageIndex: state.imageIndex,
              }, {
                where: { id: 1 },
              }).then(() => {
                // Send Resulting Comparison
                res.json(information);
                console.log('Sending: ', information);
              });
            });
          }, (err) => {
            console.log('Error Updating State: Tree');
            console.log(err);
          });
        }

        // Phase 2
        // The User Has Started
        // Wants Next Data
        const itemAPresent = (typeof req.body.itemA !== typeof undefined);
        const itemBPresent = (typeof req.body.itemB !== typeof undefined);
        if (itemAPresent || itemBPresent) {

          console.log('Phase 2\n\n');

          // Initialise Result Object
          models.Result.findOne({
            where: { inviteId: req.params.uuid },
          }).then((result) => {
            const state = result.get({ plain: true });
            console.log('Got State');
            console.log(state);
            console.log('\n\n');

            // Chose The First Item
            // Newest Item is Worse
            if (itemAPresent) {
              console.log('Newest Item is Worse');
              state.tree[state.nodeIndex].right = state.imageIndex;
            }
            // Chose The Second Item
            // Newest Item is Better
            else {
              console.log('Newest Item is Better');
              state.tree[state.nodeIndex].left = state.imageIndex;
            }

            // After Choosing Direction Previously
            // Append Node
            state.tree[state.imageIndex] = new Node(state.imageIndex, undefined, undefined);
            state.nodeIndex = state.imageIndex;

            // Increment ImageIndex
            state.imageIndex += 1; //eslint-disable-line

            // Update State
            result.update({
              tree: state.tree,
              nodeIndex: state.nodeIndex,
              imageIndex: state.imageIndex,
            }, {
              where: { id: 1 },
            }).then(() => {
              // Rebalance Tree
              // rebalance(state.tree());

              // Send Next Item
              const information = {};
              const tag = (itemAPresent) ? 'itemB' : 'itemA';
              information[tag] = {
                value: state.tree[state.treeIndex].imageIndex,
                url: items[state.tree[state.treeIndex].imageIndex],
              };
              res.json(information);
              console.log('Sending: ', information);
            });
          });
        }
      });
    }).catch(() => {
      // User entered fake UUID
      res.render('error');
    });

  });
};
