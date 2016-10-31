

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const logger = require('morgan');
const path = require('path');
const fs = require('fs');

// Authentication Middleware and Strategies.
const expressValidator = require('express-validator');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// AWS S3 Integration
const s3File = path.join(__dirname, 'config', 's3.js');
const s3 = require(s3File).s3;
const client = require(s3File).client;

// Import and Configure and Sync Sequelize Models.
const models = require('./models');
models.sequelize.sync({ force: false })
  .then(() => {
    console.log('Database Synchronised Successfully!');
  }, (err) => {
    console.log('Unable to Synchronise Database:', err);
  });

// Begin Application
const app = express();

// View Engine Initialisation
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// AWS S3 Initialisation
app.set('s3', s3);
app.set('client', client);

// Middleware Configuration
app.use(express.static(path.join(__dirname, 'public')));
// app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico'))); TODO: Add Favicon.
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({ secret: 'csiro-versus', saveUninitialized: true, resave: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(expressValidator({
  errorFormatter: (param, msg, value) => {
    let namespace = param.split('.'),
      root = namespace.shift(),
      formParam = root;

    while (namespace.length) formParam += `[${namespace.shift()}]`;

    return {
      param: formParam,
      msg,
      value,
    };
  },
}));

// Application Routes
const routePath = path.join(__dirname, '/routes');
fs.readdirSync(routePath).forEach((file) => {
  const route = path.join(routePath, file);
  require(route)(app);
});

// Catch 404 and forward to Error Handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Development Error Handler (stack-traces printed)
if (app.get('env') === 'development') {
  app.use((err, req, res) => res.status(err.status || 500).render('error', { message: err.message, error: err }));
}

// Production Error Handler (no stack-traces printed)
app.use((err, req, res) => res.status(err.status || 500).render('error', { message: err.message, error: {} }));

module.exports = app;
