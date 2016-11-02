const bcrypt = require('bcryptjs');
const models = require('../models/index');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

module.exports = (app) => {
  // FIXME
  // Implement Custom Callback

  // Login Request
  app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/',
  }), () => {
  });

  // Passport Configuration : Local Strategy.
  passport.use(new LocalStrategy((email, password, done) => {
    models.User.findOne({ where: { email } })
      .then((user) => { //eslint-disable-line
        if (user === null) {
          return done(null, false, {
            errors: ['Incorrect Email or Password'],
            retryLogEmail: email,
          }); }

        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) throw err;

          if (isMatch) { return done(null, user.dataValues, { name: user.name }); }
          else { //eslint-disable-line
            return done(null, false, {
              errors: ['Incorrect Email/Password'],
              retryLogEmail: email,
            }); }
        });
      })
      .catch(() => {
        done(null, false, {
          errors: ['Could Not Check Email'],
          retryLogEmail: email,
        });
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
