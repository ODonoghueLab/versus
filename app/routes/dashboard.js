"use strict";

const models = require('../models/index');

module.exports = (app) => {
  
  // Primary User Dashboard
  app.get('/dashboard', (req, res) => {
    
    // Find all experiments that belong to the current user.
    models.Experiment.findAll({
      include: [{ model: models.User, where: { id: req.user.id }}]
    }).then(experiments => {
      res.render('dashboard', { username: req.user.name, experiments: experiments })
    });
    
  });
  
};
