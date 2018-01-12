/**
 * @fileOverview Authentication module. Provides routines
 * to authenticate with the server, as well as a central
 * location to access the user credentials.
 */

import _ from 'lodash'
import SHA224 from '../modules/sha224/sha224'

import util from '../modules/util'
import rpc from '../modules/rpc'


function hashPassword (password) {
  return SHA224(password).toString()
}

let user = {
  authenticated: false
}

/**
 * Converts user.rawPassword to hashed user.password
 */
function hashUserPassword (user) {
  let result = _.cloneDeep(user)
  if (!result.password && result.rawPassword) {
    result.password = hashPassword(result.rawPassword)
    delete result.rawPassword
  }
  if (result.rawPasswordConfirm) {
    delete result.rawPasswordConfirm
  }
  return result
}

export default {

  user: user,

  login (newUser) {
    let payload = hashUserPassword(newUser)
    console.log('> auth.login', payload)
    return rpc
      .rpcRun('login', payload)
      .then((res) => {
        if (res.data.success) {
          user.authenticated = true
          _.assign(user, res.data.user)
          user.password = payload.password
          localStorage.setItem('user', util.jstr(user))
          console.log('> auth.login save localStorage', util.jstr(user))
        }
        return res
      })
  },

  register (newUser) {
    let payload = hashUserPassword(newUser)
    console.log('> auth.register', payload)
    return rpc.rpcRun('publicRegisterUser', payload)
  },

  update (editUser) {
    let payload = hashUserPassword(editUser)
    console.log('> auth.update', util.jstr(payload))
    return rpc
      .rpcRun('updateUser', payload)
      .then(res => {
        if (res.data.success) {
          _.assign(user, payload)
          console.log('> auth.update save localStorage', util.jstr(user))
          localStorage.setItem('user', JSON.stringify(user))
        }
        return res
      })
  },

  restoreLastUser () {
    let lastUser = JSON.parse(localStorage.getItem('user'))
    return new Promise(resolve => {
      console.log('> auth.restoreLastUser from localStorage', lastUser)
      if (lastUser) {
        this.login(lastUser)
          .then(resolve)
          .catch(resolve)
      } else {
        resolve()
      }
    })
  },

  logout () {
    localStorage.removeItem('user')
    user.authenticated = false
    return rpc.rpcRun('logout')
  }
}
