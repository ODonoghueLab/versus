

const routeAuth = require('../modules/isAuth.js');
const models = require('../models');

module.exports = (app) => {
  // [GET] Primary User Dashboard
  app.get('/dashboard', routeAuth.isAuth, (req, res) => {
    // Find all experiments that belong to the current user.
    models.Experiment
      .findAll({
        include: [
          { model: models.User, where: { id: req.user.id } },
        ],
      })
      .then((experiments) => {
        // Render the Dashboard.
        res.render('dashboard', { username: req.user.name, experiments });
      });
  });

  function fetchExperiments (userId) {
    return models.Experiment.findAll({
      include: [
        { model: models.User, where: { id: userId } }]
    })
  }

  /**
   * post body params {
   *   userId: string
   * }
   **/
  app.post('/api/experiments', (req, res) => {
    if (!req.isAuthenticated) {
      console.log('not authenticated')
      res.json({})
    } else {
      fetchExperiments(req.body.userId)
        .then(experiments => {
          res.json({ experiments })
        })
    }
  });
};
