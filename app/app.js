const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const logger = require('morgan');
const path = require('path');
const fs = require('fs');

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
