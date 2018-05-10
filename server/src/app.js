/**
 * @fileoverview The Versus web-server is an Express App.
 * It hooks up to Sequelize for db and Passport for
 * session management.
 *
 * Here, the middleware for Express is defined, and the
 * router is loaded in. This includes access to files
 * that have been uploaded to the server.
 *
 * As well the server also serves the  production version of
 * the web-client.
 */

const path = require('path')
const express = require('express')

const config = require('./config')

// Defines express app and sqlalchemy db here to avoid circular dependencies
const conn = require('./conn')
let app = conn.app
module.exports = app

// Middleware Configuration

// Cross-origin-resource-sharing for hot-reloading client
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers',
    'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

// Logs all requests
const logger = require('morgan')
app.use(logger('dev'))

// Parse Json in body
const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: false
}))

// Session management for validated users for development

const session = require('express-session')
const DEVELOPMENT_ENV = 'development'
const env = process.env.NODE_ENV || DEVELOPMENT_ENV
const dbConfig = require('./config')[env]

if (env === DEVELOPMENT_ENV) {
  app.use(session({
    secret: config.secretKey,
    saveUninitialized: true,
    resave: true
  }))
} else if (dbConfig.dialect === "mysql") {
  const MySQLStore = require('express-mysql-session')(session);
  const options = {
    host: dbConfig.host,
    port: 3306,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database
  };

  const sessionStore = new MySQLStore(options);

  app.use(session({
    secret: config.secretKey,
    store: sessionStore,
    resave: true,
    saveUninitialized: true
  }));

}

// User authentication and session management
const passport = require('passport')
app.use(passport.initialize())
app.use(passport.session())

// Hook user in models.js to authentication manager
const models = require('./models')
passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  models
    .fetchUser({
      id
    })
    .then(user => done(null, user))
    .catch(error => done(error, null))
})

// Define the method to authenticate user for sessions
const LocalStrategy = require('passport-local').Strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function(email, password, done) {
    models
      .fetchUser({
        email: email
      })
      .then(user => {
        console.log('>> passport.LocalStrategy has email', email,
          password)
        if (user) {
          models
            .checkUserWithPassword(user, password)
            .then((user) => {
              if (user === null) {
                done(null, false)
              } else {
                done(null, user, {
                  name: user.name
                })
              }
            })
        } else {
          done(null, false)
        }
      })
  }))

// Load compiled production client
const clientDir = path.join(__dirname, '..', '..', 'client', 'dist')
app.use(express.static(clientDir))

const filesDir = path.join(__dirname, 'files')
app.use('/file', express.static('files'))

// Load routes for api
app.use(require('./router'))

app.get('/', (req, res) => {
  res.sendFile(path.join(filesDir, 'index.html'))
})

// Redirect dangling calls to here
app.get('*', (req, res) => {
  res.redirect('/')
})

// Catch 404 and forward to Error Handler
app.use((req, res, next) => {
  res.status(404).render('404', {
    url: req.originalUrl
  })
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// Development Error Handler (stack-traces printed)
if (app.get('env') === 'development') {
  app.use((err, req, res) => {
    res.status(err.status || 500)
      .render('error', {
        message: err.message,
        error: err
      })
  })
}

// Production Error Handler (no stack-traces printed)
app.use((err, req, res) => {
  res.status(err.status || 500)
    .render('error', {
      message: err.message,
      error: {}
    })
})