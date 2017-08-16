const path = require('path')

module.exports = {
  filesDir: path.join(__dirname, '..', 'files'),
  ip: 'localhost',
  port: 3000,
  development: {
    host: 'localhost',
    dialect: 'sqlite',
    storage: 'database.sqlite'
  },
  // development: {
  //   'username': 'postgres',
  //   'password': 'postgres',
  //   'database': 'versus',
  //   'host': 'localhost',
  //   'port': 5432,
  //   'dialect': 'postgres'
  // },
  // production: {
  //   'username': '',
  //   'password': '',
  //   'database': '',
  //   'host': '',
  //   'port': 5432,
  //   'dialect': 'postgres'
  // },
}
