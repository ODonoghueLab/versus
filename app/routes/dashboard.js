"use strict";

module.exports = (app) => {
  
  // Primary User Dashboard
  app.get('/dashboard', (req, res) => res.render('dashboard'));
  
};
