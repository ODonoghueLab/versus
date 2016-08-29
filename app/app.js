//Primitive
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const logger = require('morgan');
const path = require('path');
const fs = require('fs');

//Auth
const expressValidator = require('express-validator');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

//DB
const mongo = require('mongodb');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/versus');
const db = mongoose.connection;

//Begin Application
const app = express();

// Setup the app
app.set('port', process.env.PORT || 3000);

// Set the views
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '/views'));

// Set public folder
app.use(express.static(path.join(__dirname, '/public')));

// Log the requests
if (!module.parent) app.use(logger('dev'));

// Setup Body Parser
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

//Express Session
app.use(session({
  secret: 'secret',
  saveUninitialized: true,
  resave: true
}));

//Passport Initialisation
app.use(passport.initialize());
app.use(passport.session());

//Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Dynamically load routes
const routePath = path.join(__dirname, '/routes');
fs.readdirSync(routePath).forEach((file) => {
  var route = path.join(routePath,file);
  require(route)(app);
});

// assume 404 since no middleware responded
app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

// Listen
if (!module.parent) {
  app.listen(app.get('port'));
}

module.exports = app;
