const bcrypt = require('bcryptjs');
const models = require('../models');

module.exports = (app) => {

  const passport = require('passport');
  const LocalStrategy = require('passport-local').Strategy;

  //FIXME
  // Implement Custom Callback

  //Login Request TODO: Russ, wtf is this?
  app.post('/login', passport.authenticate('local', {
    successRedirect:'/',
    failureRedirect:'/'
  }), (req, res) => {
  });

  // Passport Configuration : Local Strategy.
  passport.use(new LocalStrategy((email, password, done) => {
    models.User.findOne({ where: { email: email } })
      .then((user) => {
        if (user === null) return done(null, false, {
         errors: ["Incorrect Email or Password"],
         retryLogEmail: email
        });

        bcrypt.compare(password, user.password, (err, isMatch) => {
          if(err) throw err;

          console.log(user.password);
          console.log('This is the thing: ', isMatch);

          if(isMatch) return done(null, user.dataValues, { name: user.name });
          else  return done(null, false, {
            errors: ["Incorrect Email/Password"],
            retryLogEmail: email
          });
        });
      })
      .catch(error => {
        done(null, false, {
          errors: ["Could Not Check Email"],
          retryLogEmail: email,
        });
      });
    }
  ));

  // Session : Serialization
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // Session : Deserialization
  passport.deserializeUser(function(id, done) {
    models.User.findOne({ where: { id: id } })
      .then(user => done(null, user.dataValues))
      .catch(error => done(error, null));
  });
};
