const routeAuth = require('../modules/isAuth.js');

module.exports = (app) => {
  // Logout
  app.get('/logout', routeAuth.isAuth, (req, res) => {
    req.session.destroy();
    req.logout();
    res.render('dash', { success: ['You have been Logged Out.'] });
  });
};
