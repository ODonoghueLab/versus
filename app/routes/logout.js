const routeAuth = require('../modules/isAuth.js');

module.exports = (app) => {
  // Logout
  app.get('/logout', routeAuth.isAuth, (req, res) => {
    req.session.destroy();
    req.logout();
    res.redirect('/');
  });
};
