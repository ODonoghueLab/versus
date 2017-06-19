const passport = require('passport');

module.exports = (app) => {
  // [GET] Login Form
  app.get('/login', (req, res) => res.render('login'));

  // [POST] Login Request
  app.post('/login', (req, res, next) => {
    console.log('login request post', req.body)
    passport.authenticate('local', (err, user) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.render('login', {
          retryEmail: req.body.username,
          errors: ['Incorrect Email or Password'],
        });
      }

      req.logIn(user, (error) => {
        if (error) { return next(error); }
        return res.redirect('/');
      });

      return null;
    })(req, res, next);
  });

}