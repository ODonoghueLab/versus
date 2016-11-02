const models = require('../models/index');

module.exports = (app) => {
  // Register Form Post
  app.post('/register', (req, res) => {
    // Sanitization
    const form = ['name', 'email', 'password', 'passwordv'];
    for (let i = 0; i < form.length; i += 1) {
      req.sanitize(`reg_${form[i]}`).escape();
      req.sanitize(`reg_${form[i]}`).trim();
    }

    // Validation
    req.checkBody('reg_name', 'Please Enter Your Name').notEmpty();
    req.checkBody('reg_email', 'Please Enter Your Email').notEmpty();
    req.checkBody('reg_password', 'Please Enter Both Password Fields').notEmpty();
    req.checkBody('reg_passwordv', 'Please Enter Both Password Fields').notEmpty();
    req.checkBody('reg_password', 'Please Enter A Longer Password').len(8);
    req.checkBody('reg_password', 'Passwords Do Not Match').equals(req.body.reg_passwordv);

    const errors = req.validationErrors();

    if (errors) {
      // Render the page again with errors
      res.render('dash', {
        warnings: errors.map(obj =>
           obj.msg
        ),
        retryRegName: req.body.reg_name,
        retryRegEmail: req.body.reg_email,
      });
    } else {
      models.User.create({
        name: req.body.reg_name,
        email: req.body.reg_email,
        password: req.body.reg_password,
      })
        .then((user) => {
          res.render('dash', {
            name: user.name,
            success: ['You Have Been Registered!'],
          });
        })
        .catch((error) => {
          if (error.original.code === 23505) {
            res.render('dash', {
              errors: ['Email already in use'],
              retryRegName: req.body.reg_name,
              retryRegEmail: req.body.reg_email,
            });
          } else res.render('dash');
        });
    }// end validation errors
  }); // end post request
};
