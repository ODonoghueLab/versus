module.exports = (app) => {

  const passport = require('passport');
  const LocalStrategy = require('passport-local').Strategy;

  //Page Landing
  app.get('/', (req, res) => {
    res.render('dash', { title: 'Versus' });
  });

  //Passport Configuration
  passport.use(new LocalStrategy(
    function(email, password, done) {
      User.getByEmail(email, (err, user) => {

        //In Case of Error
        if(err) {
          console.log("Get Email error");
          throw err;
        }

        //Check if email exists
        if(!user){
          return done(null, false, {errors: "Incorrect Email/Password"});
        }

        //Check if password is correct
        User.comparePassword(password, user.password, (err, isMatch) => {

          if(err) {
            throw err;
          }

          if(isMatch){
            return done(null, user, {name: user.name});
          } else {
            return done(null, false, {errors: "Incorrect Email/Password"});
          }
        });

      });
    }
  ));

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.getById(id, function(err, user) {
      done(err, user);
    });
  });

  //FIXME
  //Passport always failing

  //Login Request
  app.post('/', passport.authenticate('local', {
    successRedirect:'/success',
    failureRedirect:'/failure',
    flashFailure: true
  }), (req, res) => {
  });

};
