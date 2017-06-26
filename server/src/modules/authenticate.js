const passport = require('passport')
const bcrypt = require('bcryptjs')
const LocalStrategy = require('passport-local').Strategy

const models = require('../models')

function initExpressApp (app) {
  // Session : Serialization
  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  // Session : Deserialization
  passport.deserializeUser((id, done) => {
    models.fetchUser({ id })
      .then(user => done(null, user))
      .catch(error => done(error, null))
  })

  // Passport Configuration : Local Strategy.
  passport.use(new LocalStrategy((email, password, done) => {
    models.fetchUser({ email })
      .then((user) => {
        if (user === null) { return done(null, false) }
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            throw err
          }
          if (isMatch) {
            return done(null, user, { name: user.name })
          } else {
            return done(null, false)
          }
        })
      })
      .catch(() => {
        done(null, false)
      })
  }
  ))

  app.use(passport.initialize())
  app.use(passport.session())
}

module.exports = {
  initExpressApp
}
