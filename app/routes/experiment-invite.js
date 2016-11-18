const routeAuth = require('../modules/isAuth.js');
const models = require('../models/index');
const mail = require('../modules/emailClient');

module.exports = (app) => {
  // [GET] Display the UI to send invites.
  app.get('/experiment/:id/invite', routeAuth.isAuth, (req, res) => {
    // TODO: Ensure user owns or is collaborator on the experiment.

    // Retrieve the experiment from the Database and render the UI.
    models.Experiment.findOne({ where: { id: req.params.id } })
      .then((experiment) => {
        res.render('experiment-invite', experiment.dataValues);
      })
      .catch(err => res.render('error', err));
  });

  // [POST] Invite form submission.
  app.post('/experiment/invite', routeAuth.isAuth, (req, res) => {
    // Ensure all required fields are set.
    if (!req.body.id) { res.render('error'); return null; }
    if (!req.body.type) { res.render('error'); return null; }
    if (!req.body.emails) { res.render('error'); return null; }
    if (req.body.type !== 'collaborate' && req.body.type !== 'participate') { res.render('error'); return null; }
    if (req.body.emails.length === 0) { res.render('error'); return null; }

    // TODO: Ensure user owns or is collaborator on the experiment.

    // Fetch the Experiment to send the invites for.
    models.Experiment.findOne({ where: { id: req.body.id } }).then((experiment) => {
      // Separate out the email addresses and send relevant invites to each.
      req.body.emails.split(',').forEach((email) => {
        models.Invite.create({ email: email.trim(), type: req.body.type }).then((invite) => {
          experiment.addInvite(invite);
          mail.sendInvite(req.body.type, email.trim(), invite.dataValues.inviteId);
        }).catch(err => res.render('error', err));
      });

      res.redirect(301, '/dashboard');
    }).catch(err => res.render('error', err));

    return null;
  });

  // [GET] Accept invitation.
  app.get('/invites/:uuid', (req, res) => {
    // There are two types of invites, participate and collaborate.
    models.Invite.findOne({ where: { inviteId: req.params.uuid } }).then((invite) => {
      // If the invite is to collaborate, ensure the user is logged in and accept the invitation.
      if (invite.type === 'collaborate') {
        if (req.user) {
          models.Experiment.findOne({ where: { id: invite.ExperimentId } }).then(experiment =>
            experiment.addUser(req.user.id, { permission: 1 }))
              .then(() => invite.destroy()
                .then(() => res.redirect(301, '/dashboard')));
          res.json(2);
        } else res.render('login');
      } else if (invite.type === 'participate') {
        // TODO: Russel plz run the experiment.
      } else res.render('error');
    });
  });
};
