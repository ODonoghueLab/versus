/**
 * @fileOverview Authentication module. Provides routines
 * to authenticate with the server, as well as a central
 * location to access the user credentials.
 *
 * Note: did not put in Vuex.store as the user login should
 * be queried before Vue starts up, so make it a global
 * outside Vue
 */

import _ from 'lodash'
import SHA224 from '../modules/sha224/sha224'

import util from '../modules/util'
import rpc from '../modules/rpc'


function hashPassword (password) {
  return SHA224(password).toString()
}

// global reference to user in the authentication system
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

  /**
   * Queries server for user login with newUser. If
   * newUser.rawPassword is given, will hash with SHA244
   * to user.password. Then saves the user to localStorage
   *
   * @param {Object} newUser - {email, password, rawPassword}
   */
  async login (newUser) {
    let payload = hashUserPassword(newUser)
    console.log('> auth.login', payload)
    let res = await rpc.rpcRun('login', payload)
    if (res.data.success) {
      user.authenticated = true
      _.assign(user, res.data.user)
      user.password = payload.password
      localStorage.setItem('user', util.jstr(user))
    }
    return res
  },

  register (newUser) {
    let payload = hashUserPassword(newUser)
    console.log('> auth.register', payload)
    return rpc.rpcRun('publicRegisterUser', payload)
  },

  async update (editUser) {
    let payload = hashUserPassword(editUser)
    console.log('> auth.update', util.jstr(payload))
    let res = await rpc.rpcRun('updateUser', payload)
    if (res.data.success) {
      _.assign(user, payload)
      localStorage.setItem('user', JSON.stringify(user))
    }
    return res
  },

  async forceUpdate (editUser) {
    let payload = hashUserPassword(editUser)
    console.log('> auth.update', util.jstr(payload))
    return await rpc.rpcRun('publicForceUpdatePassword', payload)
  },

  async restoreLastUser () {
    let lastUser = JSON.parse(localStorage.getItem('user'))
    console.log('> auth.restoreLastUser from localStorage', lastUser)
    if (lastUser) {
      return this.login(lastUser)
    }
  },

  logout () {
    localStorage.removeItem('user')
    user.authenticated = false
    return rpc.rpcRun('logout')
  }
}
