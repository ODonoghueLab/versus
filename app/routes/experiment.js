const models = require('../models/index');
const path = require('path');
const multer = require('multer');

const upload = multer({ dest: path.join(__dirname, '../temp/') });

const fileUploader = require('../modules/fileUploader.js');
const routeAuth = require('../modules/isAuth.js');

function newNode(imageIndex, left, right) {
  const node = {};
  node.imageIndex = imageIndex;
  node.left = left;
  node.right = right;
  return node;
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

  app.get('/experiment/:id/:uuid/done', (req, res) => {
    // Convert to ranked array
    // Check ID
    models.Invite.findOne({
      where: { inviteId: req.params.uuid },
    }).then(() => {
      // Grab Experiment Images
      models.Experiment.find({
        where: { id: req.params.id },
        include: [{ model: models.Image, as: 'Images' }],
      }).then((experiment) => {
        // Get Image Buffer
        const items = experiment.Images.map((obj) => { //eslint-disable-line
          return obj.get({ plain: true }).url;
        });

        // Get The User's State
        models.Result.findOne({
          where: { inviteId: req.params.uuid },
        }).then((result) => {
          const state = result.get({ plain: true });

          const ranks = [];
          function display(root) {
            if (typeof state.tree[root] !== typeof undefined) {
              display(state.tree[root].left);
              ranks.push(items[state.tree[root].imageIndex]);
              display(state.tree[root].right);
            }
          }

          display(0);

          for(let i = 0; i < ranks.length; i+=1){
            console.log(ranks[i]);
          }

          // Delete thingy
          // Congratulate them
          res.render('dash', { success: ['Thankyou For Participating!'] });
        });
      }).catch(() => {
        // User entered fake UUID
        res.render('error');
      });
    });
  });

  app.post('/experiment/:id/:uuid', (req, res) => {
    // Check ID
    models.Invite.findOne({
      where: { inviteId: req.params.uuid },
    }).then(() => {
      // Grab Experiment Images
      models.Experiment.find({
        where: { id: req.params.id },
        include: [{ model: models.Image, as: 'Images' }],
      }).then((experiment) => {
        // Get Image Buffer
        const items = experiment.Images.map((obj) => { //eslint-disable-line
          return obj.get({ plain: true }).url;
        });

        // Phase 1
        // The User Just Started
        // Wants first 2
        if (req.body.start === true) {
          // Initialise Result Object
          models.Result.findOrCreate({
            where: { inviteId: req.params.uuid },
            defaults: {
              age: 0,
              gender: 'other',
              imageIndex: 0,
              treeIndex: 0,
              tree: [newNode(0, null, null)],
              ExperimentId: req.params.id,
            },
          }).spread((result) => {
            const state = result.get({ plain: true });

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
            //state.imageIndex += 1; //eslint-disable-line
            //console.log(state);

            // Update State
            // result.update({ imageIndex: state.imageIndex }).then(() => {
            const updateQuery = 'UPDATE "Results" SET "imageIndex"=\'' + state.imageIndex //eslint-disable-line
              + '\' WHERE "inviteId"=\'' + req.params.uuid + '\''; //eslint-disable-line
            models.sequelize.query(updateQuery).spread(() => {
              // Send Resulting Comparison
              res.json(information);
            });
          });
        }

        // Phase 2
        // The User Has Started
        // Wants Next Data
        const itemAPresent = (typeof req.body.itemA !== typeof undefined);
        const itemBPresent = (typeof req.body.itemB !== typeof undefined);
        if (itemAPresent || itemBPresent) {
          // Initialise Result Object
          models.Result.findOne({
            where: { inviteId: req.params.uuid },
          }).then((result) => {
            const state = result.get({ plain: true });

            // Chose The First Item
            // Newest Item is Worse
            if (itemAPresent) {
              console.log(typeof state.tree[state.treeIndex].right);
              // Traverse Tree
              if (typeof state.tree[state.treeIndex].right === typeof 1) {
                console.log('before setting node .right');
                console.log(state);
                state.treeIndex = state.tree[state.treeIndex].right;
                console.log('\n\n');
              }

              // Insert Node
              else { //eslint-disable-line
                console.log('before appending node to right');
                console.log(state);
                console.log('\n');
                state.tree[state.treeIndex].right = state.tree.length;
                state.treeIndex = state.tree.length;
                state.imageIndex += 1; //eslint-disable-line
                state.tree[state.treeIndex] = newNode(state.imageIndex, null, null);
                state.treeIndex = 0;
                console.log('after appending node to right');
                console.log(state);
                console.log('\n\n');
              }
            }
            // Chose The Second Item
            // Newest Item is Better
            else { //eslint-disable-line
              console.log(typeof state.tree[state.treeIndex].left);
              // Traverse Tree
              if (typeof state.tree[state.treeIndex].left === typeof 1) { //eslint-disable-line
                console.log('before setting node .right');
                console.log(state);
                state.treeIndex = state.tree[state.treeIndex].left;
                console.log('\n\n');
              }

              // Insert Node
              else { //eslint-disable-line
                console.log('before appending node to left');
                console.log(state);
                console.log('\n');
                state.tree[state.treeIndex].left = state.tree.length;
                state.treeIndex = state.tree.length;
                state.imageIndex += 1; //eslint-disable-line
                state.tree[state.treeIndex] = newNode(state.imageIndex, null, null);
                state.treeIndex = 0;
                console.log('after appending node to left');
                console.log(state);
                console.log('\n\n');
              }
            }

            // End of Buffer Check
            if (state.imageIndex === items.length) {
              state.tree.pop();
            }

            // Update TREE
            result.update({ tree: state.tree }).then(() => {
              const updateQuery = 'UPDATE "Results" SET "imageIndex"=\'' + state.imageIndex //eslint-disable-line
                + '\', "treeIndex"=\'' + state.treeIndex + '' +                             //eslint-disable-line
                '\' WHERE "inviteId"=\'' + req.params.uuid + '\'';                          //eslint-disable-line
              models.sequelize.query(updateQuery).spread(() => {
                // End of Buffer Check
                if (state.imageIndex === items.length) {
                  res.json({ done: true });
                  return null;
                }

                // Send Next Item
                let information = {};
                if (itemAPresent) {
                  information = {
                    itemB: { url: items[state.imageIndex] },
                    itemA: { url: items[state.tree[state.treeIndex].imageIndex] },
                  };
                } else {
                  information = {
                    itemB: { url: items[state.tree[state.treeIndex].imageIndex] },
                    itemA: { url: items[state.imageIndex] },
                  };
                }
                return res.json(information);
              });
            });
          }).catch(() => {
            // User entered fake UUID
            res.render('error');
          });
        }
      }).catch(() => {
        // This Experiment Does Not Exist
        res.render('error');
      });
    }).catch(() => {
      // User entered fake UUID
      res.render('error');
    });
  });
};
