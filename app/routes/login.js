

const bcrypt = require('bcryptjs');
const models = require('../models/index');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

module.exports = (app) => {
  // [GET] Login Form
  app.get('/login', (req, res) => res.render('login'));

  // [POST] Login Request
  app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user) => {
      if (err) { return next(err); }

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

  // Passport Configuration : Local Strategy.
  passport.use(new LocalStrategy((email, password, done) => {
    models.User.findOne({ where: { email } })
      .then((user) => { //eslint-disable-line
        if (user === null) { return done(null, false); }

        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) throw err;
          if (isMatch) { return done(null, user.dataValues, { name: user.name }); }          else { return done(null, false); } //eslint-disable-line
        });
      })
      .catch(() => {
        done(null, false);
      });
  }
  ));

  // Session : Serialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Session : Deserialization
  passport.deserializeUser((id, done) => {
    models.User.findOne({ where: { id } })
      .then(user => done(null, user.dataValues))
      .catch(error => done(error, null));
  });
};
