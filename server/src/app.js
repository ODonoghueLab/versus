const logger = require('morgan')
const path = require('path')
const fs = require('fs')
const _ = require('lodash')

const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

// const favicon = require('serve-favicon'); TODO: Add Favicon.

// Authentication Middleware and Strategies.
const expressValidator = require('express-validator')
const session = require('express-session')
const passport = require('passport')

const models = require('./models')
// Synchronise Database | TRUE Will Wipe Database
models.sequelize.sync({ force: false })

const bcrypt = require('bcryptjs');
const LocalStrategy = require('passport-local').Strategy;

// Begin Application
const app = express()

// Middleware Configuration

// Cross-origin-resource-sharing
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
  if ('OPTIONS' == req.method) {
      res.send(200);
  } else {
      next();
  }
});

app.use(express.static(path.join(__dirname, 'public')))
// app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico'))); TODO: Add Favicon.
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(session({ secret: 'csiro-versus', saveUninitialized: true, resave: true }))
app.use(expressValidator())

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

// Passport Configuration : Local Strategy.
passport.use(new LocalStrategy((email, password, done) => {
  models.User
    .findOne({ where: { email } })
    .then((user) => { //eslint-disable-line
      if (user === null) { return done(null, false); }
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          throw err;
        }
        if (isMatch) {
          return done(null, user.dataValues, { name: user.name });
        } else {
          return done(null, false);
        } //eslint-disable-line
      });
    })
    .catch(() => {
      done(null, false);
    });
  }
));

app.use(passport.initialize())
app.use(passport.session())

app.use('/', require('./api'))

// Catch 404 and forward to Error Handler
app.use((req, res, next) => {
  res.status(404).render('404', { url: req.originalUrl })
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// Development Error Handler (stack-traces printed)
if (app.get('env') === 'development') {
  app.use((err, req, res) => {
    res.status(err.status || 500)
      .render('error', { message: err.message, error: err })
  })
}

// Production Error Handler (no stack-traces printed)
app.use((err, req, res) => {
  res.status(err.status || 500)
    .render('error', { message: err.message, error: {} })
})

module.exports = app
