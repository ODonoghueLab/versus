const path = require('path')

module.exports = {
  filesDir: path.join(__dirname, '..', 'files'),
  ip: 'localhost',
  secretKey: 'csiro-versus',
  port: 3000,
  development: {
    host: 'localhost',
    dialect: 'sqlite',
    storage: 'database.sqlite'
  }
}
