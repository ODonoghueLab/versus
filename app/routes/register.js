module.exports = (app) => {

  //Includes
  var User = require('../../models/user');

  //Initial Page Load
  app.get('/register', (req, res) => {
    res.render('register');
  });

  //Register Form Post
  app.post('/register', (req, res) => {

    //Sanitization
    form = ['email', 'password', 'passwordv'];
    for(i = 0; i < form.length; i++){
      req.sanitize(form[i]).escape();
      req.sanitize(form[i]).trim();
    }

    //Validation
    req.checkBody('name', 'Please Enter Your Name').notEmpty();
    req.checkBody('email', 'Please Enter Your Email').notEmpty();
    req.checkBody('password', 'Please Enter Both Password Fields').notEmpty();
    req.checkBody('passwordv', 'Please Enter Both Password Fields').notEmpty();
    req.checkBody('password', 'Please Enter A Longer Password').len(8);
    req.checkBody('password', 'Passwords Do Not Match').equals(req.body.passwordv);

    var errors = req.validationErrors();

    if(errors){

      //Render the page again with errors
      res.render('register',{
        errors: errors.map((obj) => {
          return obj.msg;
        })
      });

    } else {

      //Query if email already in use
      var queryTest = User.findOne({email:req.body.email});

      queryTest.then((doc) => {

        if(doc){

          //Duplicate Email
          res.render('register',{
            errors: ["Email already in use"]
          });

        } else {

          //Create New User Model
          var newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
          });

          //Save to database
          User.createUser(newUser, (err, user) => {

            //In Case of Error
            if(err){

              //Render Error Page
              res.render('error', {
                message: "Internal Error, Could Not Create User",
                error: err
              });

              console.log("Create User error");
              throw err;

            } else {

              //Render the home page with user's name
              res.render('dash', {
                name: user.name,
                title: "Versus"
              });
            }
          });
        }
      });
    }
  });
};
