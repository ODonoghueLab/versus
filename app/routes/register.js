module.exports = (app) => {

  //Includes
  var User = require('../../models/user');

  //Register Form Post
  app.post('/register', (req, res) => {

    //Sanitization
    form = ['name', 'email', 'password', 'passwordv'];
    for(i = 0; i < form.length; i++){
      req.sanitize("reg_" + form[i]).escape();
      req.sanitize("reg_" + form[i]).trim();
    }

    //Validation
    req.checkBody('reg_name', 'Please Enter Your Name').notEmpty();
    req.checkBody('reg_email', 'Please Enter Your Email').notEmpty();
    req.checkBody('reg_password', 'Please Enter Both Password Fields').notEmpty();
    req.checkBody('reg_passwordv', 'Please Enter Both Password Fields').notEmpty();
    req.checkBody('reg_password', 'Please Enter A Longer Password').len(8);
    req.checkBody('reg_password', 'Passwords Do Not Match').equals(req.body.reg_passwordv);

    var errors = req.validationErrors();

    if(errors){

      //Render the page again with errors
      res.render('dash',{
        warnings: errors.map((obj) => {
          return obj.msg;
        })
      });

    } else {

      //Query if email already in use
      var queryTest = User.findOne({email:req.body.reg_email});

      queryTest.then((doc) => {

        if(doc){

          //Duplicate Email
          res.render('dash',{
            errors: ["Email already in use"]
          });

        } else {

          //Create New User Model
          var newUser = new User({
            name: req.body.reg_name,
            email: req.body.reg_email,
            password: req.body.reg_password
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
                success: ["You Have Been Registered!"]
              });

            }

          }); //end create user

        } //end email query test

      }); //end synch query

    }//end validation errors

  }); //end post request

}
