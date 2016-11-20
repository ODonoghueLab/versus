

const routeAuth = require('../modules/isAuth.js');
const models = require('../models/index');

module.exports = (app) => {
  // [GET] Primary User Dashboard
  app.get('/dashboard', routeAuth.isAuth, (req, res) => {
    // Find all experiments that belong to the current user.
    models.Experiment.findAll({
      include: [
        { model: models.User, where: { id: req.user.id } },
        // { model: models.UserExperiment }
      ],
    }).then((experiments) => {
      // Render the Dashboard.
      res.render('dashboard', { username: req.user.name, experiments });
    });
  });
};
