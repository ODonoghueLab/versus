const path = require('path')

// Reset database `force: true` -> wipes database
// require('./models').sequelize.sync({ force: true })

// Begin Application
const express = require('express')
const app = express()
module.exports = app

// Middleware Configuration

// Cross-origin-resource-sharing
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept')
  if (req.method === 'OPTIONS') {
    res.send(200)
  } else {
    next()
  }
})

// Load production client
const clientDir = path.join(__dirname, '..', 'client', 'public')
app.use(express.static(clientDir))

// Logs all requests
const logger = require('morgan')
app.use(logger('dev'))

// parse Json in body
const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const cookieParser = require('cookie-parser')
app.use(cookieParser())

const session = require('express-session')
app.use(session({ 
  secret: 'csiro-versus',
  saveUninitialized: true,
  resave: true
}))

// Check form validation in handlers
const expressValidator = require('express-validator')
app.use(expressValidator())

// Initialize authentication with passport
const authenticate = require('./modules/authenticate')
authenticate.initExpressApp(app)

// Load routes
const routes = require('./routes')
app.use(routes)

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

