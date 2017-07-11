const passport = require('passport')
const passportJWT = require('passport-jwt')
const bcrypt = require('bcryptjs')

const LocalStrategy = require('passport-local').Strategy
const ExtractJwt = passportJWT.ExtractJwt
const JwtStrategy = passportJWT.Strategy

const config = require('../config')
const models = require('../models')


/**
 * Initalizes an Express app to work with local-strategy
 * and the User model implemented in this app.
 *
 * It is important that the client has enabled xhr
 * as the app is designed to work with CORS
 *
 * @param {*} app
 */

function initExpressApp (app) {
  // Session : Serialization
  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  // Session : Deserialization
  passport.deserializeUser((id, done) => {
    models
      .fetchUser({id})
      .then(user => done(null, user))
      .catch(error => done(error, null))
  })

  var jwtStrategy = new JwtStrategy(
    {
      secretOrKey: config.jwtSecret,
      jwtFromRequest: ExtractJwt.fromAuthHeader()
    },
    function(payload, done) {
      models
        .fetchUser({id: payload.id})
        .then((user) => {
          models.checkUserWithPassword(user, password)
            .then((user) => {
              if (user === null) {
                done(null, false)
              } else {
                done(null, user, {name: user.name})
              }
            })
        })
    })

  var localStrategy = new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    function(email, password, done) {
      models
        .fetchUser({email: email})
        .then(user => {
          return models.checkUserWithPassword(user, password)
            .then((user) => {
              if (user === null) {
                done(null, false)
              } else {
                done(null, user, {name: user.name})
              }
            })
        })
    })

  passport.use(localStrategy)

  app.use(passport.initialize())
  app.use(passport.session())

}

module.exports = {
  initExpressApp
}
