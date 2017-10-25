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

export default {

  user: user,

  login (newUser) {
    let payload = _.cloneDeep(newUser)
    payload.password = hashPassword(payload.password)
    console.log('>> auth.login newUser', payload)
    return rpc
      .rpcRun('login', payload)
      .then((res) => {
        if (res.data.success) {
          user.authenticated = true
          _.assign(user, res.data.user)
          user.password = newUser.password
          localStorage.setItem('user', util.jstr(user))
          console.log('>> auth.login', util.jstr(user))
        }
        return res
      })
  },

  register (newUser) {
    let payload = _.cloneDeep(newUser)
    payload.password = hashPassword(payload.password)
    payload.passwordv = hashPassword(payload.passwordv)
    console.log('>> auth.register', payload)
    return rpc.rpcRun('publicRegisterUser', payload)
  },

  update (editUser) {
    let payload = _.cloneDeep(editUser)
    if ('password' in payload) {
      payload.password = hashPassword(payload.password)
    }
    if ('passwordv' in payload) {
      payload.passwordv = hashPassword(payload.passwordv)
    }
    payload.id = user.id
    console.log('>> auth.update', editUser, payload)
    return rpc
      .rpcRun('updateUser', payload)
      .then(res => {
        if (res.data.success) {
          _.assign(user, payload)
          console.log('>> auth.update', user)
          localStorage.setItem('user', JSON.stringify(user))
        }
        return res
      })
  },

  restoreLastUser () {
    let lastUser = JSON.parse(localStorage.getItem('user'))
    return new Promise(resolve => {
      console.log('>> auth.restoreLastUser', lastUser)
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
