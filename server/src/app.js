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

// Modify here to clear database
const models = require('./models')
// Synchronise Database | TRUE Will Wipe Database
models.sequelize.sync({ force: false })

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

// Load production client
app.use(express.static(path.join(__dirname, '..', 'client', 'public')))

// Generate favicon
const favicon = require('serve-favicon')
app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico'))); 

// Logger
app.use(logger('dev'))

// parse Json in body
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(cookieParser())
app.use(session({ secret: 'csiro-versus', saveUninitialized: true, resave: true }))

// Form validator in handlers
app.use(expressValidator())

// Initialize authentication with passport
const auth = require('./modules/auth')
auth.init(app)

// Load routes
app.use('/', require('./routes'))

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
