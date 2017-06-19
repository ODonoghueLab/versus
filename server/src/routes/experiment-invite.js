const auth = require('../modules/auth.js');
const tree = require('../modules/tree')
const models = require('../models');
// const mail = require('./modules/emailClient');
const _ = require('lodash')

module.exports = (app) => {

  // [GET] Display the UI to send invites.
  app.get('/experiment/:id/invite', auth.isAuth, (req, res) => {
    // TODO: Ensure user owns or is collaborator on the experiment.

    // Retrieve the experiment from the Database and render the UI.
    models.Experiment
      .findOne({ where: { id: req.params.id } })
      .then((experiment) => {
        res.render('experiment-invite', experiment.dataValues);
      })
      .catch(err => {
        res.render('error', err);
      });
  });

  // [POST] Invite form submission.
  app.post('/experiment/invite', auth.isAuth, (req, res) => {
    // Ensure all required fields are set.
    if (!req.body.id) { res.render('error'); return null; }
    if (!req.body.type) { res.render('error'); return null; }
    if (!req.body.emails) { res.render('error'); return null; }
    if (req.body.type !== 'collaborate' && req.body.type !== 'participate') { res.render('error'); return null; }
    if (req.body.emails.length === 0) { res.render('error'); return null; }

    // TODO: Ensure user owns or is collaborator on the experiment.

    // Fetch the Experiment to send the invites for.
    models.Experiment
      .findOne({ where: { id: req.body.id } })
      .then((experiment) => {
        let emails = req.body.emails.split(',');
        emails.forEach((email) => {
          let type = req.body.type; // "collaborate", "participate"
          email = email.trim();
          models.Invite
            .create({ email, type })
            .then((invite) => {
              experiment.addInvite(invite);
              // send relevant invites to each.
              // mail.sendInvite(req.body.type, email.trim(), invite.dataValues.inviteId);
            })
            .catch(err => {
              res.render('error', err);
            });
        });
        res.redirect(301, '/dashboard');
      })
      .catch(err => {
        res.render('error', err);
      });

    return null;
  });

  // [GET] Accept invitation.
  app.get('/invites/:uuid', (req, res) => {
    // There are two types of invites, participate and collaborate.
    models.Invite
      .findOne({ where: { inviteId: req.params.uuid } })
      .then((invite) => {
        // If the invite is to collaborate
        if (invite.type === 'collaborate') {
          // ensure the user is logged in and accept the invitation.
          if (req.user) {
            models.Experiment
              .findOne({ where: { id: invite.ExperimentId } })
              .then(experiment => {
                experiment.addUser(req.user.id, { permission: 1 });
              })
              .then(() => {
                invite
                  .destroy()
                  .then(() => {
                    res.redirect(301, '/dashboard');
                  });
              });
          } else {
            res.render('login');
          }
        } else if (invite.type === 'participate') {
          // If the invite is to participate, load the experiment.
          models.Experiment
            .findOne({ where: { id: invite.ExperimentId } })
            .then(experiment => {
              res.render('experiment-run', experiment.dataValues);
            });
        } else {
          // Someone did something bad, grr!
          res.render('error');
        }
      });
  });



  // [POST] Handle Experiment Participation
  app.post('/invites/:uuid', (req, res) => {

    fail = () => { res.render('error'); }

    // Check ID
    models.Invite
      .findOne({ where: { inviteId: req.params.uuid } })
      .catch(fail) // User entered fake UUID
      .then((invite) => {
        // Grab Experiment Images
        models.Experiment
          .find({
            where: { id: invite.ExperimentId },
            include: [{ model: models.Image, as: 'Images' }],
          })
          .catch(fail) // This Experiment Does Not Exist
          .then((experiment) => {
            const imageUrls = experiment.Images.map(i => i.get('url'));

            // Phase 1
            // The User Just Started
            if (req.body.start === true) {

              // Server Side Validation
              let userAge = (typeof parseInt(req.body.age, 10) === typeof 1) ? req.body.age : 0;
              userAge = (userAge > 0) ? userAge : 0;
              const userGender = (req.body.gender === 'male' ||
                req.body.gender === 'female' ||
                req.body.gender === 'other') ? req.body.gender : 'other';

              // Initialise Result Object
              models.Result
                .findOrCreate({
                  where: { inviteId: req.params.uuid },
                  defaults: {
                    age: userAge,
                    gender: userGender,
                    state: tree.newState(imageUrls),
                    ExperimentId: invite.ExperimentId,
                  },
                })
                .spread((result) => {
                  const state = result.get('state');
                  console.log('state', state);
                  if (state.testImageIndex === imageUrls.length) {
                    res.json({ done: true });
                  } else {
                    let i = state.nodes[state.nodeIndex].imageIndex
                    res.json(tree.makeComparison(state, i, i + 1));
                  }
                  return null;
                });
            }

            // Phase 2
            // The User Has Started
            // Wants Next Data
            if (typeof req.body.return !== typeof undefined) {
              // Initialise Result Object
              models.Result
                .findOne({ where: { inviteId: req.params.uuid } })
                .catch(fail)
                .then((result) => {
                  const state = result.get('state');
                  console.log('saved state', state)
                  const chosenImageIndex = parseInt(req.body.return);
                  const isTestImageChosen = (chosenImageIndex > state.nodes[state.nodeIndex].imageIndex);
                  tree.makeChoice(state, isTestImageChosen);
                  console.log('updated state', state)
                  models.saveResult(result, state, () => {
                    if (state.testImageIndex === imageUrls.length) {
                      res.json({ done: true });
                    } else {
                      let iNew = state.testImageIndex;
                      let iNode = state.nodes[state.nodeIndex].imageIndex;
                      if (isTestImageChosen) {
                        res.json(tree.makeComparison(state, iNode, iNew));
                      } else {
                        res.json(tree.makeComparison(state, iNew, iNode));
                      }
                    }
                    return null;
                  });
                });
            }
          })
      });
  });

  // [GET] Finished Results
  app.get('/invites/:uuid/done', (req, res) => {
    // Convert to ranked array
    // Check ID
    models.Invite
      .findOne({ where: { inviteId: req.params.uuid }, })
      .then((invite) => {
        // Grab Experiment Images
        models.Experiment
          .findOne({
            where: { id: invite.ExperimentId },
            include: [{ model: models.Image, as: 'Images' }],
          })
          .then((experiment) => {
            // Get Image Buffer
            const urls = experiment.Images.map(o => o.get({ plain: true }).url);
            models.Result
              .findOne({ where: { inviteId: req.params.uuid }, })
              .then((result) => {
                const state = result.get('state');
                tree.rankNodes(state);
                result
                  .update({ state })
                  .then(() => {
                    res.render('experiment-thankyou');
                  });
              });
          })
          .catch(() => {
            res.render('error');
          });
      });
  });
};
