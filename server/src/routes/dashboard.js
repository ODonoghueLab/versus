const isAuth = require('../modules/auth.js').isAuth
const models = require('../models');

module.exports = (app) => {
  // [GET] Primary User Dashboard
  app.get('/dashboard', isAuth, (req, res) => {
    console.log('>> /dashboard req.user', req.user)
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
};
