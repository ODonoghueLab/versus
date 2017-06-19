const isAuth = require('../modules/auth.js').isAuth;

module.exports = (app) => {
  // Logout
  app.get('/logout', isAuth, (req, res) => {
    req.session.destroy();
    req.logout();
    res.redirect('/');
  });
};
