module.exports = (app) => {

  const passport = require('passport');
  const LocalStrategy = require('passport-local').Strategy;

  var User = require('../../models/user');

  //FIXME
  // Implement Custom Callback

  //Login Request
  app.post('/login', passport.authenticate('local', {
    successRedirect:'/',
    failureRedirect:'/'
  }), (req, res) => {
  });

  //Passport Configuration
  passport.use(new LocalStrategy(
    function(email, password, done) {
      User.getByEmail(email, (err, user) => {

        //In Case of Error
        if(err) {
          return done(null, false, {
            errors: ["Could Not Check Email"],
            retryLogEmail: email
          });
        }

        //Check if email exists
        if(!user){
          return done(null, false, {
            errors: ["Incorrect Email/Password"],
            retryLogEmail: email
          });
        }

        //Check if password is correct
        User.comparePassword(password, user.password, (err, isMatch) => {

          if(err) {
            //In Case of Error
            return done(null, false, {
              errors: ["Could Not Check Email"],
              retryLogEmail: email
            });
          }

          if(isMatch){
            return done(null, user, {
              name: user.name
            });
          } else {
            return done(null, false, {
              errors: ["Incorrect Email/Password"],
              retryLogEmail: email
            });
          }
        });

      });
    }
  ));

  //Session Serialization
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.getById(id, function(err, user) {
      done(err, user);
    });
  });

};
