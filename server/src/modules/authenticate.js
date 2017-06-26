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
    console.log('>> deserializeUser id', id)
    models.fetchUser({ id })
      .then(user => done(null, user))
      .catch(error => done(error, null))
  })

  // Passport Configuration : Local Strategy.
  passport.use(new LocalStrategy((email, password, done) => {
    console.log('>> local.strategy init', email, password)
    models.fetchUser({ email })
      .then((user) => {
        console.log('>> local.strategy found', user)
        if (user === null) { return done(null, false) }
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            console.log('>> bcrypt fail', password, user.password)
            throw err
          }
          if (isMatch) {
            return done(null, user, { name: user.name })
          } else {
            return done(null, false)
          }
        })
      })
      .catch((err) => {
        console.log('>> local.strategy fail', err)
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
